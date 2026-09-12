const cron = require("node-cron");
const pool = require("./config/db");

/*
=========================================================
SCHEDULED POST SCHEDULER
=========================================================

Milestone 2 responsibilities:

1. Check scheduled posts regularly
2. Find posts whose scheduled time has arrived
3. Add them to the publishing queue
4. Prevent duplicate queue entries
5. Update the post status
6. Let queueProcessor.js handle publishing

IMPORTANT:
This scheduler does NOT directly publish the post.

Publishing flow:

Scheduled Post
      ↓
Scheduler
      ↓
Publishing Queue
      ↓
Queue Processor
      ↓
Publishing
      ↓
Publishing Log
=========================================================
*/

console.log("Scheduler started...");

/*
=========================================================
RUN EVERY MINUTE
=========================================================
*/

cron.schedule("* * * * *", async () => {
    try {
        console.log("Checking scheduled posts...");

        /*
        -----------------------------------------------------
        STEP 1: Find scheduled posts that are due
        -----------------------------------------------------
        */

        const result = await pool.query(
            `
            SELECT
                sp.schedule_id,
                sp.post_id,
                sp.scheduled_at,
                p.account_id,
                sa.platform
            FROM scheduled_posts sp
            JOIN posts p
                ON sp.post_id = p.post_id
            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id
            WHERE sp.status = 'pending'
              AND sp.scheduled_at <= CURRENT_TIMESTAMP
            ORDER BY sp.scheduled_at ASC
            LIMIT 20
            `
        );

        /*
        -----------------------------------------------------
        No scheduled posts ready
        -----------------------------------------------------
        */

        if (result.rows.length === 0) {
            console.log("No scheduled posts are ready.");
            return;
        }

        console.log(
            `${result.rows.length} scheduled post(s) are ready.`
        );

        /*
        -----------------------------------------------------
        STEP 2: Process each scheduled post
        -----------------------------------------------------
        */

        for (const post of result.rows) {
            try {
                console.log(
                    `Processing scheduled post #${post.post_id}`
                );

                /*
                -------------------------------------------------
                Validate social account
                -------------------------------------------------
                */

                if (!post.account_id) {
                    console.log(
                        `Post #${post.post_id} has no social account.`
                    );

                    await pool.query(
                        `
                        UPDATE scheduled_posts
                        SET status = 'failed'
                        WHERE schedule_id = $1
                        `,
                        [post.schedule_id]
                    );

                    await pool.query(
                        `
                        UPDATE posts
                        SET status = 'failed'
                        WHERE post_id = $1
                        `,
                        [post.post_id]
                    );

                    continue;
                }

                /*
                -------------------------------------------------
                Validate platform
                -------------------------------------------------
                */

                if (!post.platform) {
                    console.log(
                        `Post #${post.post_id} has no social platform.`
                    );

                    await pool.query(
                        `
                        UPDATE scheduled_posts
                        SET status = 'failed'
                        WHERE schedule_id = $1
                        `,
                        [post.schedule_id]
                    );

                    await pool.query(
                        `
                        UPDATE posts
                        SET status = 'failed'
                        WHERE post_id = $1
                        `,
                        [post.post_id]
                    );

                    continue;
                }

                /*
                -------------------------------------------------
                STEP 3: Check duplicate queue entry
                -------------------------------------------------
                */

                const duplicateCheck = await pool.query(
                    `
                    SELECT queue_id
                    FROM publishing_queue
                    WHERE post_id = $1
                      AND scheduled_time = $2
                      AND status IN
                          ('pending', 'processing', 'published')
                    LIMIT 1
                    `,
                    [
                        post.post_id,
                        post.scheduled_at
                    ]
                );

                /*
                -------------------------------------------------
                Queue entry already exists
                -------------------------------------------------
                */

                if (duplicateCheck.rows.length > 0) {
                    console.log(
                        `Queue entry already exists for post #${post.post_id}.`
                    );

                    /*
                    Make sure the main post is marked scheduled.
                    */

                    await pool.query(
                        `
                        UPDATE posts
                        SET
                            status = 'scheduled',
                            scheduled_time = $1
                        WHERE post_id = $2
                        `,
                        [
                            post.scheduled_at,
                            post.post_id
                        ]
                    );

                    continue;
                }

                /*
                -------------------------------------------------
                STEP 4: Add post to publishing queue
                -------------------------------------------------
                */

                await pool.query(
                    `
                    INSERT INTO publishing_queue
                    (
                        post_id,
                        platform,
                        scheduled_time,
                        priority,
                        status
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    `,
                    [
                        post.post_id,
                        post.platform,
                        post.scheduled_at,
                        1,
                        "pending"
                    ]
                );

                console.log(
                    `Post #${post.post_id} added to publishing queue.`
                );

                /*
                -------------------------------------------------
                STEP 5: Update scheduled_posts
                -------------------------------------------------
                */

                await pool.query(
                    `
                    UPDATE scheduled_posts
                    SET status = 'processing'
                    WHERE schedule_id = $1
                    `,
                    [post.schedule_id]
                );

                /*
                -------------------------------------------------
                STEP 6: Update main post
                -------------------------------------------------
                */

                await pool.query(
                    `
                    UPDATE posts
                    SET
                        status = 'scheduled',
                        scheduled_time = $1
                    WHERE post_id = $2
                    `,
                    [
                        post.scheduled_at,
                        post.post_id
                    ]
                );

                console.log(
                    `Scheduled post #${post.post_id} is now in the publishing workflow.`
                );
            } catch (error) {
                /*
                -------------------------------------------------
                ERROR FOR INDIVIDUAL POST
                -------------------------------------------------
                */

                console.error(
                    `Failed to process scheduled post #${post.post_id}:`,
                    error.message
                );

                /*
                Mark scheduled post as failed.
                */

                try {
                    await pool.query(
                        `
                        UPDATE scheduled_posts
                        SET status = 'failed'
                        WHERE schedule_id = $1
                        `,
                        [post.schedule_id]
                    );

                    await pool.query(
                        `
                        UPDATE posts
                        SET status = 'failed'
                        WHERE post_id = $1
                        `,
                        [post.post_id]
                    );
                } catch (updateError) {
                    console.error(
                        "Could not update failed post status:",
                        updateError.message
                    );
                }
            }
        }
    } catch (error) {
        /*
        -----------------------------------------------------
        MAIN SCHEDULER ERROR
        -----------------------------------------------------
        */

        console.error(
            "SCHEDULER ERROR:",
            error.message
        );
    }
});