const pool = require("../config/db");

/*
=========================================================
MILESTONE 2 - RECURRING POST PROCESSOR
=========================================================

Responsibilities:

1. Find active recurring posts that are due
2. Create the next publishing occurrence
3. Add the occurrence to publishing_queue
4. Prevent duplicate queue entries
5. Calculate the next occurrence
6. Support daily, weekly and monthly schedules
7. Stop recurring posts after end_time
8. Update next_run
9. Prevent two processors from processing the same rule
10. Handle invalid frequency safely

FLOW:

recurring_posts
       ↓
    next_run
       ↓
publishing_queue
       ↓
 queueProcessor
       ↓
   published
       ↓
  next_run
       ↓
 next occurrence
=========================================================
*/


// =====================================================
// CONFIGURATION
// =====================================================

const SUPPORTED_FREQUENCIES = [
    "daily",
    "weekly",
    "monthly"
];


// =====================================================
// CALCULATE NEXT OCCURRENCE
// =====================================================

const calculateNextRun = (currentRun, frequency) => {

    const nextRun = new Date(currentRun);

    if (Number.isNaN(nextRun.getTime())) {
        return null;
    }


    // =================================================
    // DAILY
    // =================================================

    if (frequency === "daily") {

        nextRun.setDate(
            nextRun.getDate() + 1
        );

        return nextRun;
    }


    // =================================================
    // WEEKLY
    // =================================================

    if (frequency === "weekly") {

        nextRun.setDate(
            nextRun.getDate() + 7
        );

        return nextRun;
    }


    // =================================================
    // MONTHLY
    // =================================================

    if (frequency === "monthly") {

        /*
        -------------------------------------------------
        Preserve the original day.

        Example:

        January 31
              ↓
        February

        February may not have 31 days.

        Therefore:

        January 31 → February 28
        January 31 → February 29 in leap year
        -------------------------------------------------
        */

        const originalDay =
            nextRun.getDate();


        /*
        Move to first day of next month.
        */

        nextRun.setDate(1);

        nextRun.setMonth(
            nextRun.getMonth() + 1
        );


        /*
        Find last valid day of next month.
        */

        const lastDayOfMonth =
            new Date(
                nextRun.getFullYear(),
                nextRun.getMonth() + 1,
                0
            ).getDate();


        /*
        Use original day if possible.

        Otherwise use last day of month.
        */

        nextRun.setDate(
            Math.min(
                originalDay,
                lastDayOfMonth
            )
        );


        return nextRun;
    }


    // =================================================
    // INVALID FREQUENCY
    // =================================================

    return null;
};


// =====================================================
// CHECK WHETHER RECURRING POST HAS ENDED
// =====================================================

const hasEnded = (currentRun, endTime) => {

    if (!endTime) {
        return false;
    }

    const endDate =
        new Date(endTime);


    if (Number.isNaN(endDate.getTime())) {

        return true;
    }


    return currentRun > endDate;
};


// =====================================================
// MAIN RECURRING POST PROCESSOR
// =====================================================

const processRecurringPosts = async () => {

    console.log("");
    console.log("=================================================");
    console.log("CHECKING RECURRING POSTS");
    console.log("=================================================");

    let client;


    try {

        // =================================================
        // STEP 1
        // GET DATABASE CLIENT
        // =================================================

        client = await pool.connect();


        // =================================================
        // STEP 2
        // FIND DUE RECURRING POSTS
        // =================================================

        const result = await client.query(
            `
            SELECT
                recurring_id,
                post_id,
                platform,
                start_time,
                end_time,
                frequency,
                next_run,
                status

            FROM recurring_posts

            WHERE status = 'active'
              AND next_run IS NOT NULL
              AND next_run <= CURRENT_TIMESTAMP

            ORDER BY
                next_run ASC

            LIMIT 20
            `
        );


        // =================================================
        // NO RECURRING POSTS READY
        // =================================================

        if (result.rows.length === 0) {

            console.log(
                "No recurring posts are ready."
            );

            return;
        }


        console.log(
            `${result.rows.length} recurring post(s) ready.`
        );


        // =================================================
        // STEP 3
        // PROCESS EACH RECURRING RULE
        // =================================================

        for (const item of result.rows) {

            try {

                console.log("");
                console.log(
                    "-----------------------------------------------"
                );

                console.log(
                    `Processing Recurring Post #${item.recurring_id}`
                );

                console.log(
                    `Post ID       : ${item.post_id}`
                );

                console.log(
                    `Platform      : ${item.platform}`
                );

                console.log(
                    `Frequency     : ${item.frequency}`
                );

                console.log(
                    `Current Next Run: ${item.next_run}`
                );

                console.log(
                    "-----------------------------------------------"
                );


                // =================================================
                // STEP 4
                // START TRANSACTION
                // =================================================

                await client.query("BEGIN");


                // =================================================
                // STEP 5
                // LOCK RECURRING RULE
                // =================================================

                const lockedResult =
                    await client.query(
                        `
                        SELECT
                            recurring_id,
                            post_id,
                            platform,
                            start_time,
                            end_time,
                            frequency,
                            next_run,
                            status

                        FROM recurring_posts

                        WHERE recurring_id = $1

                        FOR UPDATE
                        `,
                        [item.recurring_id]
                    );


                // =================================================
                // RECURRING RULE NO LONGER EXISTS
                // =================================================

                if (lockedResult.rows.length === 0) {

                    await client.query("ROLLBACK");

                    console.log(
                        `Recurring Post #${item.recurring_id} no longer exists.`
                    );

                    continue;
                }


                const recurring =
                    lockedResult.rows[0];


                // =================================================
                // STEP 6
                // CHECK CURRENT STATUS
                // =================================================

                if (
                    recurring.status !== "active" ||
                    !recurring.next_run
                ) {

                    await client.query("ROLLBACK");

                    console.log(
                        `Recurring Post #${item.recurring_id} is no longer active or has no next_run.`
                    );

                    continue;
                }


                // =================================================
                // STEP 7
                // VALIDATE POST ID
                // =================================================

                if (!recurring.post_id) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Recurring Post #${recurring.recurring_id} failed: post_id is missing.`
                    );

                    continue;
                }


                // =================================================
                // STEP 8
                // VALIDATE PLATFORM
                // =================================================

                if (
                    !recurring.platform ||
                    String(recurring.platform).trim() === ""
                ) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Recurring Post #${recurring.recurring_id} failed: platform is missing.`
                    );

                    continue;
                }


                // =================================================
                // STEP 9
                // NORMALIZE FREQUENCY
                // =================================================

                const frequency =
                    String(
                        recurring.frequency || ""
                    )
                        .trim()
                        .toLowerCase();


                // =================================================
                // STEP 10
                // VALIDATE FREQUENCY
                // =================================================

                if (
                    !SUPPORTED_FREQUENCIES.includes(
                        frequency
                    )
                ) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Invalid frequency "${recurring.frequency}" for Recurring Post #${recurring.recurring_id}.`
                    );

                    continue;
                }


                // =================================================
                // STEP 11
                // GET CURRENT RUN
                // =================================================

                const currentRun =
                    new Date(
                        recurring.next_run
                    );


                // =================================================
                // VALIDATE CURRENT RUN
                // =================================================

                if (
                    Number.isNaN(
                        currentRun.getTime()
                    )
                ) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Invalid next_run for Recurring Post #${recurring.recurring_id}.`
                    );

                    continue;
                }


                // =================================================
                // STEP 12
                // CHECK END TIME
                // =================================================

                if (
                    recurring.end_time &&
                    hasEnded(
                        currentRun,
                        recurring.end_time
                    )
                ) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'completed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Recurring Post #${recurring.recurring_id} completed.`
                    );

                    console.log(
                        `Reason: next occurrence is after end_time.`
                    );

                    continue;
                }


                // =================================================
                // STEP 13
                // CHECK ORIGINAL POST EXISTS
                // =================================================

                const postResult =
                    await client.query(
                        `
                        SELECT
                            post_id,
                            content,
                            media_url,
                            account_id,
                            status

                        FROM posts

                        WHERE post_id = $1

                        LIMIT 1
                        `,
                        [recurring.post_id]
                    );


                if (postResult.rows.length === 0) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Recurring Post #${recurring.recurring_id} failed: original post #${recurring.post_id} does not exist.`
                    );

                    continue;
                }


                const post =
                    postResult.rows[0];


                // =================================================
                // STEP 14
                // VALIDATE POST CONTENT
                // =================================================

                if (
                    !post.content ||
                    String(post.content).trim() === ""
                ) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Recurring Post #${recurring.recurring_id} failed: post content is empty.`
                    );

                    continue;
                }


                // =================================================
                // STEP 15
                // CHECK FOR DUPLICATE QUEUE ENTRY
                // =================================================

                const duplicateCheck =
                    await client.query(
                        `
                        SELECT
                            queue_id,
                            status

                        FROM publishing_queue

                        WHERE post_id = $1
                          AND platform = $2
                          AND scheduled_time = $3

                        LIMIT 1
                        `,
                        [
                            recurring.post_id,
                            recurring.platform,
                            currentRun
                        ]
                    );


                // =================================================
                // STEP 16
                // CREATE QUEUE ENTRY
                // =================================================

                if (
                    duplicateCheck.rows.length > 0
                ) {

                    const existingQueue =
                        duplicateCheck.rows[0];

                    console.log(
                        `Queue entry already exists.`
                    );

                    console.log(
                        `Queue ID: ${existingQueue.queue_id}`
                    );

                    console.log(
                        `Queue Status: ${existingQueue.status}`
                    );

                } else {

                    await client.query(
                        `
                        INSERT INTO publishing_queue
                        (
                            post_id,
                            platform,
                            scheduled_time,
                            priority,
                            status,
                            retry_count
                        )

                        VALUES
                        (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6
                        )
                        `,
                        [
                            recurring.post_id,
                            recurring.platform,
                            currentRun,
                            1,
                            "pending",
                            0
                        ]
                    );


                    console.log(
                        "Publishing queue entry created."
                    );

                    console.log(
                        `Post ID: ${recurring.post_id}`
                    );

                    console.log(
                        `Platform: ${recurring.platform}`
                    );

                    console.log(
                        `Scheduled Time: ${currentRun}`
                    );
                }


                // =================================================
                // STEP 17
                // CALCULATE NEXT RUN
                // =================================================

                const nextRun =
                    calculateNextRun(
                        currentRun,
                        frequency
                    );


                // =================================================
                // SAFETY CHECK
                // =================================================

                if (!nextRun) {

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            status = 'failed'

                        WHERE recurring_id = $1
                        `,
                        [recurring.recurring_id]
                    );


                    await client.query("COMMIT");


                    console.log(
                        `Unable to calculate next run for Recurring Post #${recurring.recurring_id}.`
                    );

                    continue;
                }


                // =================================================
                // STEP 18
                // CHECK NEXT RUN AGAINST END TIME
                // =================================================

                if (
                    recurring.end_time &&
                    nextRun > new Date(
                        recurring.end_time
                    )
                ) {

                    /*
                    -------------------------------------------------
                    Current occurrence has been successfully added.

                    There is no valid occurrence after this one.
                    -------------------------------------------------
                    */

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            next_run = $1,
                            status = 'completed'

                        WHERE recurring_id = $2
                        `,
                        [
                            nextRun,
                            recurring.recurring_id
                        ]
                    );


                    await client.query("COMMIT");


                    console.log("");
                    console.log(
                        `Final occurrence created for Recurring Post #${recurring.recurring_id}.`
                    );

                    console.log(
                        `Current occurrence: ${currentRun}`
                    );

                    console.log(
                        `Next calculated run: ${nextRun}`
                    );

                    console.log(
                        "Recurring rule marked as completed."
                    );

                } else {

                    // =================================================
                    // STEP 19
                    // UPDATE NEXT RUN
                    // =================================================

                    await client.query(
                        `
                        UPDATE recurring_posts

                        SET
                            next_run = $1

                        WHERE recurring_id = $2
                        `,
                        [
                            nextRun,
                            recurring.recurring_id
                        ]
                    );


                    await client.query("COMMIT");


                    console.log("");
                    console.log(
                        `Recurring Post #${recurring.recurring_id} processed successfully.`
                    );

                    console.log(
                        `Current occurrence: ${currentRun}`
                    );

                    console.log(
                        `Next occurrence: ${nextRun}`
                    );
                }


            } catch (error) {

                // =================================================
                // ROLLBACK INDIVIDUAL RECURRING POST
                // =================================================

                try {

                    await client.query(
                        "ROLLBACK"
                    );

                } catch (rollbackError) {

                    console.error(
                        "Rollback failed:",
                        rollbackError.message
                    );
                }


                console.error(
                    `Recurring Post #${item.recurring_id} processing failed:`,
                    error.message
                );
            }
        }


        // =================================================
        // PROCESSING COMPLETE
        // =================================================

        console.log("");
        console.log("=================================================");
        console.log("RECURRING POST PROCESSING COMPLETED");
        console.log("=================================================");


    } catch (error) {

        // =================================================
        // MAIN PROCESSOR ERROR
        // =================================================

        console.error("");
        console.error("=================================================");
        console.error("RECURRING PROCESSOR ERROR");
        console.error("=================================================");
        console.error(error.message);
        console.error("=================================================");

    } finally {

        // =================================================
        // RELEASE DATABASE CLIENT
        // =================================================

        if (client) {

            client.release();
        }
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = processRecurringPosts;