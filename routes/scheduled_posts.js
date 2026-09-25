const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ============================================================
// CREATE / SCHEDULE A POST
// POST /api/scheduled-posts
// ============================================================

router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            post_id,
            scheduled_at,
            account_id
        } = req.body;


        // --------------------------------------------------------
        // Validate post_id
        // --------------------------------------------------------

        if (!post_id) {
            return res.status(400).json({
                message: "post_id is required"
            });
        }

        const postId = Number(post_id);

        if (!Number.isInteger(postId) || postId <= 0) {
            return res.status(400).json({
                message: "Invalid post_id"
            });
        }


        // --------------------------------------------------------
        // Validate scheduled_at
        // --------------------------------------------------------

        if (!scheduled_at) {
            return res.status(400).json({
                message: "scheduled_at is required"
            });
        }

        const scheduleDate = new Date(scheduled_at);

        if (Number.isNaN(scheduleDate.getTime())) {
            return res.status(400).json({
                message: "Invalid scheduled_at date"
            });
        }

        if (scheduleDate <= new Date()) {
            return res.status(400).json({
                message: "Scheduled time must be in the future"
            });
        }


        // --------------------------------------------------------
        // Validate account_id if supplied
        // --------------------------------------------------------

        let selectedAccountId = null;

        if (
            account_id !== undefined &&
            account_id !== null &&
            account_id !== ""
        ) {
            selectedAccountId = Number(account_id);

            if (
                !Number.isInteger(selectedAccountId) ||
                selectedAccountId <= 0
            ) {
                return res.status(400).json({
                    message: "Invalid account_id"
                });
            }
        }


        await client.query("BEGIN");


        // ========================================================
        // STEP 1
        // Find the post using campaign ownership
        //
        // IMPORTANT:
        // Do NOT JOIN social_accounts here because account_id
        // may currently be NULL.
        // ========================================================

        const postResult = await client.query(
            `
            SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.status AS post_status,
                p.scheduled_time,

                c.user_id,
                c.campaign_name

            FROM posts p

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            WHERE p.post_id = $1
              AND c.user_id = $2
            `,
            [
                postId,
                req.user.user_id
            ]
        );


        if (postResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message:
                    "Post not found or does not belong to user"
            });
        }


        const post = postResult.rows[0];


        // ========================================================
        // STEP 2
        // Determine which social account to use
        // ========================================================

        if (selectedAccountId === null) {
            selectedAccountId = post.account_id;
        }


        // --------------------------------------------------------
        // Social account is required for scheduling
        // --------------------------------------------------------

        if (!selectedAccountId) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message:
                    "Please select a social account before scheduling this post"
            });
        }


        // ========================================================
        // STEP 3
        // Verify social account belongs to logged-in user
        // ========================================================

        const accountResult = await client.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username,
                access_token

            FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2
            `,
            [
                selectedAccountId,
                req.user.user_id
            ]
        );


        if (accountResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message:
                    "Selected social account does not belong to the logged-in user"
            });
        }


        const account = accountResult.rows[0];


        // ========================================================
        // STEP 4
        // Save selected social account into posts
        //
        // This fixes posts such as post_id 14 where account_id
        // was previously NULL.
        // ========================================================

        await client.query(
            `
            UPDATE posts

            SET
                account_id = $1

            WHERE post_id = $2
            `,
            [
                selectedAccountId,
                postId
            ]
        );


        // ========================================================
        // STEP 5
        // Published post cannot be scheduled again
        // ========================================================

        if (post.post_status === "published") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message:
                    "Published post cannot be scheduled again"
            });
        }


        // ========================================================
        // STEP 6
        // Check existing active schedule
        // ========================================================

        const existingSchedule = await client.query(
            `
            SELECT
                schedule_id,
                status,
                scheduled_at

            FROM scheduled_posts

            WHERE post_id = $1

              AND status IN
                  ('pending', 'processing')

            LIMIT 1
            `,
            [postId]
        );


        if (existingSchedule.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message:
                    "This post already has an active schedule",

                schedule_id:
                    existingSchedule.rows[0].schedule_id
            });
        }


        // ========================================================
        // STEP 7
        // Create scheduled post
        // ========================================================

        const scheduleResult = await client.query(
            `
            INSERT INTO scheduled_posts
            (
                post_id,
                scheduled_at,
                status,
                published_at,
                error_message
            )

            VALUES
            (
                $1,
                $2,
                'pending',
                NULL,
                NULL
            )

            RETURNING *
            `,
            [
                postId,
                scheduled_at
            ]
        );


        // ========================================================
        // STEP 8
        // Update original post
        // ========================================================

        await client.query(
            `
            UPDATE posts

            SET
                account_id = $1,
                status = 'scheduled',
                scheduled_time = $2

            WHERE post_id = $3
            `,
            [
                selectedAccountId,
                scheduled_at,
                postId
            ]
        );


        // ========================================================
        // STEP 9
        // Check publishing queue
        // ========================================================

        const queueResult = await client.query(
            `
            SELECT
                queue_id,
                status

            FROM publishing_queue

            WHERE post_id = $1

              AND status IN
                  ('pending', 'processing')

            LIMIT 1
            `,
            [postId]
        );


        let queueItem = null;


        // ========================================================
        // STEP 10
        // Create or update queue item
        // ========================================================

        if (queueResult.rows.length === 0) {

            const queueInsert = await client.query(
                `
                INSERT INTO publishing_queue
                (
                    post_id,
                    platform,
                    scheduled_time,
                    status,
                    priority,
                    retry_count
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    'pending',
                    5,
                    0
                )

                RETURNING *
                `,
                [
                    postId,
                    account.platform,
                    scheduled_at
                ]
            );

            queueItem = queueInsert.rows[0];

        } else {

            const queueUpdate = await client.query(
                `
                UPDATE publishing_queue

                SET
                    platform = $1,
                    scheduled_time = $2,
                    status = 'pending'

                WHERE queue_id = $3

                RETURNING *
                `,
                [
                    account.platform,
                    scheduled_at,
                    queueResult.rows[0].queue_id
                ]
            );

            queueItem = queueUpdate.rows[0];
        }


        // ========================================================
        // STEP 11
        // Commit transaction
        // ========================================================

        await client.query("COMMIT");


        // ========================================================
        // SUCCESS RESPONSE
        // ========================================================

        return res.status(201).json({
            message:
                "Post scheduled successfully",

            schedule:
                scheduleResult.rows[0],

            queue:
                queueItem,

            post: {
                post_id: postId,
                campaign_id: post.campaign_id,
                campaign_name: post.campaign_name,
                account_id: selectedAccountId,
                platform: account.platform,
                username: account.username,
                content: post.content,
                scheduled_at: scheduled_at
            }
        });


    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError.message
            );
        }


        console.error(
            "SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to schedule post",

            error:
                error.message
        });


    } finally {
        client.release();
    }
});


// ============================================================
// PUBLISH A SCHEDULED POST
// POST /api/scheduled-posts/:id/publish
// ============================================================

router.post("/:id/publish", async (req, res) => {
    const client = await pool.connect();

    try {
        const scheduleId = Number(req.params.id);


        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({
                message: "Invalid schedule ID"
            });
        }


        // ========================================================
        // Get scheduled post
        //
        // Ownership is checked through campaigns.
        // ========================================================

        const result = await client.query(
            `
            SELECT
                sp.schedule_id,
                sp.post_id,
                sp.scheduled_at,
                sp.status AS schedule_status,

                p.content,
                p.media_url,
                p.account_id,

                c.campaign_id,
                c.campaign_name,
                c.user_id,

                s.platform,
                s.username,
                s.access_token

            FROM scheduled_posts sp

            JOIN posts p
                ON sp.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE sp.schedule_id = $1
              AND c.user_id = $2
            `,
            [
                scheduleId,
                req.user.user_id
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Scheduled post not found or does not belong to user",

                published: false
            });
        }


        const scheduledPost = result.rows[0];


        // ========================================================
        // Social account must exist
        // ========================================================

        if (!scheduledPost.account_id || !scheduledPost.platform) {
            return res.status(400).json({
                message:
                    "No social account is connected to this scheduled post",

                published: false
            });
        }


        // ========================================================
        // Check already published
        // ========================================================

        if (scheduledPost.schedule_status === "published") {
            return res.status(400).json({
                message:
                    "Post is already published",

                published: true
            });
        }


        // ========================================================
        // Check access token
        // ========================================================

        if (
            !scheduledPost.access_token ||
            scheduledPost.access_token.trim() === ""
        ) {
            return res.status(400).json({
                message:
                    "No access token configured for this social account",

                published: false
            });
        }


        await client.query("BEGIN");


        // ========================================================
        // Mark scheduled post as processing
        // ========================================================

        await client.query(
            `
            UPDATE scheduled_posts

            SET
                status = 'processing'

            WHERE schedule_id = $1
            `,
            [scheduleId]
        );


        // ========================================================
        // Mark queue as processing
        // ========================================================

        await client.query(
            `
            UPDATE publishing_queue

            SET
                status = 'processing'

            WHERE post_id = $1
              AND status = 'pending'
            `,
            [scheduledPost.post_id]
        );


        // ========================================================
        // Simulated publishing workflow
        //
        // This marks the post as published in your local system.
        // Replace this section later with real Instagram/Facebook/
        // Twitter/LinkedIn API calls.
        // ========================================================

        const updateSchedule = await client.query(
            `
            UPDATE scheduled_posts

            SET
                status = 'published',
                published_at = CURRENT_TIMESTAMP,
                error_message = NULL

            WHERE schedule_id = $1

            RETURNING *
            `,
            [scheduleId]
        );


        // ========================================================
        // Update original post
        // ========================================================

        await client.query(
            `
            UPDATE posts

            SET
                status = 'published',
                scheduled_time = NULL

            WHERE post_id = $1
            `,
            [scheduledPost.post_id]
        );


        // ========================================================
        // Update publishing queue
        // ========================================================

        await client.query(
            `
            UPDATE publishing_queue

            SET
                status = 'published'

            WHERE post_id = $1
            `,
            [scheduledPost.post_id]
        );


        // ========================================================
        // Create publishing log
        // ========================================================

        const queueLogResult = await client.query(
            `
            SELECT
                queue_id

            FROM publishing_queue

            WHERE post_id = $1

            ORDER BY queue_id DESC

            LIMIT 1
            `,
            [scheduledPost.post_id]
        );


        if (queueLogResult.rows.length > 0) {

            await client.query(
                `
                INSERT INTO publishing_logs
                (
                    queue_id,
                    post_id,
                    platform,
                    status,
                    published_at,
                    error_message,
                    retry_count
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    'published',
                    CURRENT_TIMESTAMP,
                    NULL,
                    0
                )
                `,
                [
                    queueLogResult.rows[0].queue_id,
                    scheduledPost.post_id,
                    scheduledPost.platform
                ]
            );
        }


        await client.query("COMMIT");


        // ========================================================
        // Success
        // ========================================================

        return res.status(200).json({
            message:
                "Post publishing workflow completed",

            published: true,

            post_id:
                scheduledPost.post_id,

            platform:
                scheduledPost.platform,

            username:
                scheduledPost.username,

            schedule:
                updateSchedule.rows[0]
        });


    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError.message
            );
        }


        console.error(
            "PUBLISH ERROR:",
            error
        );


        // ========================================================
        // Save publishing failure
        // ========================================================

        try {

            await pool.query(
                `
                UPDATE scheduled_posts

                SET
                    status = 'failed',
                    error_message = $1

                WHERE schedule_id = $2
                `,
                [
                    error.message,
                    req.params.id
                ]
            );


            await pool.query(
                `
                UPDATE publishing_queue

                SET
                    status = 'failed'

                WHERE post_id = (
                    SELECT post_id

                    FROM scheduled_posts

                    WHERE schedule_id = $1
                )
                `,
                [req.params.id]
            );


            await pool.query(
                `
                UPDATE posts

                SET
                    status = 'failed'

                WHERE post_id = (
                    SELECT post_id

                    FROM scheduled_posts

                    WHERE schedule_id = $1
                )
                `,
                [req.params.id]
            );


        } catch (dbError) {

            console.error(
                "FAILED TO SAVE PUBLISH ERROR:",
                dbError
            );
        }


        return res.status(500).json({
            message:
                "Failed to publish post",

            published: false,

            error:
                error.message
        });


    } finally {
        client.release();
    }
});


// ============================================================
// GET ALL SCHEDULED POSTS
// GET /api/scheduled-posts
// ============================================================

router.get("/", async (req, res) => {
    try {

        const result = await pool.query(
            `
            SELECT
                sp.schedule_id,
                sp.post_id,

                p.content,
                p.media_url,
                p.status AS post_status,
                p.scheduled_time,

                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message,

                c.campaign_id,
                c.campaign_name,

                s.account_id,
                s.platform,
                s.username

            FROM scheduled_posts sp

            JOIN posts p
                ON sp.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE c.user_id = $1

            ORDER BY sp.scheduled_at ASC
            `,
            [req.user.user_id]
        );


        return res.status(200).json({
            scheduled_posts: result.rows
        });


    } catch (error) {

        console.error(
            "GET SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to fetch scheduled posts",

            error:
                error.message
        });
    }
});


// ============================================================
// GET ONE SCHEDULED POST
// GET /api/scheduled-posts/:id
// ============================================================

router.get("/:id", async (req, res) => {
    try {

        const scheduleId = Number(req.params.id);


        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({
                message: "Invalid schedule ID"
            });
        }


        const result = await pool.query(
            `
            SELECT
                sp.schedule_id,
                sp.post_id,

                p.content,
                p.media_url,
                p.status AS post_status,
                p.scheduled_time,

                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message,

                c.campaign_id,
                c.campaign_name,

                s.account_id,
                s.platform,
                s.username

            FROM scheduled_posts sp

            JOIN posts p
                ON sp.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE sp.schedule_id = $1
              AND c.user_id = $2
            `,
            [
                scheduleId,
                req.user.user_id
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Scheduled post not found"
            });
        }


        return res.status(200).json({
            scheduled_post:
                result.rows[0]
        });


    } catch (error) {

        console.error(
            "GET ONE SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to fetch scheduled post",

            error:
                error.message
        });
    }
});


// ============================================================
// UPDATE SCHEDULED POST
// PUT /api/scheduled-posts/:id
// ============================================================

router.put("/:id", async (req, res) => {
    const client = await pool.connect();

    try {

        const scheduleId = Number(req.params.id);

        const {
            scheduled_at,
            status
        } = req.body;


        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({
                message: "Invalid schedule ID"
            });
        }


        // --------------------------------------------------------
        // Allowed statuses
        // --------------------------------------------------------

        const allowedStatuses = [
            "pending",
            "processing",
            "published",
            "failed",
            "cancelled"
        ];


        if (
            status !== undefined &&
            status !== null &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                message:
                    "Invalid status. Allowed values: pending, processing, published, failed, cancelled"
            });
        }


        // --------------------------------------------------------
        // Validate date
        // --------------------------------------------------------

        if (scheduled_at) {

            const date = new Date(scheduled_at);

            if (Number.isNaN(date.getTime())) {
                return res.status(400).json({
                    message:
                        "Invalid scheduled_at date"
                });
            }


            if (
                date <= new Date() &&
                status !== "published"
            ) {
                return res.status(400).json({
                    message:
                        "Scheduled time must be in the future"
                });
            }
        }


        // ========================================================
        // Check ownership
        // ========================================================

        const existingSchedule =
            await client.query(
                `
                SELECT
                    sp.schedule_id,
                    sp.post_id,
                    sp.status,
                    sp.scheduled_at

                FROM scheduled_posts sp

                JOIN posts p
                    ON sp.post_id = p.post_id

                JOIN campaigns c
                    ON p.campaign_id = c.campaign_id

                WHERE sp.schedule_id = $1
                  AND c.user_id = $2
                `,
                [
                    scheduleId,
                    req.user.user_id
                ]
            );


        if (existingSchedule.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Scheduled post not found"
            });
        }


        const schedule =
            existingSchedule.rows[0];

        const postId =
            schedule.post_id;


        // --------------------------------------------------------
        // Published schedules cannot be modified
        // --------------------------------------------------------

        if (
            schedule.status === "published" &&
            status !== "published"
        ) {
            return res.status(400).json({
                message:
                    "Published scheduled posts cannot be modified"
            });
        }


        await client.query("BEGIN");


        // ========================================================
        // Update scheduled post
        // ========================================================

        const result = await client.query(
            `
            UPDATE scheduled_posts

            SET
                scheduled_at =
                    COALESCE($1, scheduled_at),

                status =
                    COALESCE($2, status)

            WHERE schedule_id = $3

            RETURNING *
            `,
            [
                scheduled_at || null,
                status || null,
                scheduleId
            ]
        );


        // ========================================================
        // Synchronize posts table
        // ========================================================

        if (status === "published") {

            await client.query(
                `
                UPDATE posts

                SET
                    status = 'published',
                    scheduled_time = NULL

                WHERE post_id = $1
                `,
                [postId]
            );

        } else if (status === "failed") {

            await client.query(
                `
                UPDATE posts

                SET
                    status = 'failed'

                WHERE post_id = $1
                `,
                [postId]
            );

        } else if (status === "cancelled") {

            await client.query(
                `
                UPDATE posts

                SET
                    status = 'draft',
                    scheduled_time = NULL

                WHERE post_id = $1
                `,
                [postId]
            );

        } else {

            await client.query(
                `
                UPDATE posts

                SET
                    status = 'scheduled',
                    scheduled_time =
                        COALESCE($1, scheduled_time)

                WHERE post_id = $2
                `,
                [
                    scheduled_at || null,
                    postId
                ]
            );
        }


        // ========================================================
        // Synchronize queue scheduled time
        // ========================================================

        if (scheduled_at) {

            await client.query(
                `
                UPDATE publishing_queue

                SET
                    scheduled_time = $1

                WHERE post_id = $2
                  AND status IN
                      ('pending', 'processing')
                `,
                [
                    scheduled_at,
                    postId
                ]
            );
        }


        // ========================================================
        // Synchronize queue status
        // ========================================================

        if (status) {

            await client.query(
                `
                UPDATE publishing_queue

                SET
                    status = $1

                WHERE post_id = $2
                `,
                [
                    status,
                    postId
                ]
            );
        }


        await client.query("COMMIT");


        return res.status(200).json({
            message:
                "Scheduled post updated successfully",

            schedule:
                result.rows[0]
        });


    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError.message
            );
        }


        console.error(
            "UPDATE SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to update scheduled post",

            error:
                error.message
        });


    } finally {
        client.release();
    }
});


// ============================================================
// RETRY FAILED SCHEDULED POST
// POST /api/scheduled-posts/:id/retry
// ============================================================

router.post("/:id/retry", async (req, res) => {
    const client = await pool.connect();

    try {

        const scheduleId = Number(req.params.id);


        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({
                message:
                    "Invalid schedule ID"
            });
        }


        // ========================================================
        // Find schedule and verify ownership
        // ========================================================

        const result = await client.query(
            `
            SELECT
                sp.schedule_id,
                sp.post_id,
                sp.status,
                sp.scheduled_at,

                p.account_id,

                s.platform,
                s.username

            FROM scheduled_posts sp

            JOIN posts p
                ON sp.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE sp.schedule_id = $1
              AND c.user_id = $2
            `,
            [
                scheduleId,
                req.user.user_id
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Scheduled post not found"
            });
        }


        const schedule =
            result.rows[0];


        if (schedule.status !== "failed") {
            return res.status(400).json({
                message:
                    "Only failed scheduled posts can be retried"
            });
        }


        // ========================================================
        // Social account must exist
        // ========================================================

        if (!schedule.account_id) {
            return res.status(400).json({
                message:
                    "No social account is connected to this post"
            });
        }


        // ========================================================
        // Validate scheduled time
        // ========================================================

        const scheduleDate =
            new Date(schedule.scheduled_at);


        if (
            Number.isNaN(
                scheduleDate.getTime()
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid scheduled time"
            });
        }


        if (scheduleDate <= new Date()) {
            return res.status(400).json({
                message:
                    "The scheduled time must be in the future before retrying"
            });
        }


        await client.query("BEGIN");


        // ========================================================
        // Reset scheduled post
        // ========================================================

        const updatedSchedule =
            await client.query(
                `
                UPDATE scheduled_posts

                SET
                    status = 'pending',
                    error_message = NULL,
                    published_at = NULL

                WHERE schedule_id = $1

                RETURNING *
                `,
                [scheduleId]
            );


        // ========================================================
        // Reset original post
        // ========================================================

        await client.query(
            `
            UPDATE posts

            SET
                status = 'scheduled',
                scheduled_time = $1

            WHERE post_id = $2
            `,
            [
                schedule.scheduled_at,
                schedule.post_id
            ]
        );


        // ========================================================
        // Check queue
        // ========================================================

        const queueExists =
            await client.query(
                `
                SELECT
                    queue_id

                FROM publishing_queue

                WHERE post_id = $1

                LIMIT 1
                `,
                [schedule.post_id]
            );


        if (queueExists.rows.length > 0) {

            await client.query(
                `
                UPDATE publishing_queue

                SET
                    status = 'pending',
                    scheduled_time = $1,
                    retry_count = retry_count + 1

                WHERE post_id = $2
                `,
                [
                    schedule.scheduled_at,
                    schedule.post_id
                ]
            );

        } else {

            // ====================================================
            // Get platform
            // ====================================================

            const platformResult =
                await client.query(
                    `
                    SELECT
                        s.platform

                    FROM posts p

                    JOIN social_accounts s
                        ON p.account_id = s.account_id

                    WHERE p.post_id = $1
                    `,
                    [schedule.post_id]
                );


            if (platformResult.rows.length > 0) {

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
                        5,
                        'pending',
                        1
                    )
                    `,
                    [
                        schedule.post_id,
                        platformResult.rows[0].platform,
                        schedule.scheduled_at
                    ]
                );
            }
        }


        await client.query("COMMIT");


        return res.status(200).json({
            message:
                "Scheduled post added back to publishing queue",

            schedule:
                updatedSchedule.rows[0]
        });


    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError.message
            );
        }


        console.error(
            "RETRY SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to retry scheduled post",

            error:
                error.message
        });


    } finally {
        client.release();
    }
});


// ============================================================
// DELETE SCHEDULED POST
// DELETE /api/scheduled-posts/:id
// ============================================================

router.delete("/:id", async (req, res) => {
    const client = await pool.connect();

    try {

        const scheduleId = Number(req.params.id);


        if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
            return res.status(400).json({
                message:
                    "Invalid schedule ID"
            });
        }


        // ========================================================
        // Check ownership
        // ========================================================

        const existingSchedule =
            await client.query(
                `
                SELECT
                    sp.schedule_id,
                    sp.post_id,
                    sp.status

                FROM scheduled_posts sp

                JOIN posts p
                    ON sp.post_id = p.post_id

                JOIN campaigns c
                    ON p.campaign_id = c.campaign_id

                WHERE sp.schedule_id = $1
                  AND c.user_id = $2
                `,
                [
                    scheduleId,
                    req.user.user_id
                ]
            );


        if (existingSchedule.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Scheduled post not found"
            });
        }


        const schedule =
            existingSchedule.rows[0];


        // ========================================================
        // Do not delete processing post
        // ========================================================

        if (schedule.status === "processing") {
            return res.status(400).json({
                message:
                    "A post currently being published cannot be deleted"
            });
        }


        // ========================================================
        // Do not delete published post
        // ========================================================

        if (schedule.status === "published") {
            return res.status(400).json({
                message:
                    "A published scheduled post cannot be deleted"
            });
        }


        const postId =
            schedule.post_id;


        await client.query("BEGIN");


        // ========================================================
        // Delete publishing logs first
        // ========================================================

        await client.query(
            `
            DELETE FROM publishing_logs

            WHERE post_id = $1
            `,
            [postId]
        );


        // ========================================================
        // Delete queue entries
        // ========================================================

        await client.query(
            `
            DELETE FROM publishing_queue

            WHERE post_id = $1
            `,
            [postId]
        );


        // ========================================================
        // Delete scheduled post
        // ========================================================

        const result =
            await client.query(
                `
                DELETE FROM scheduled_posts

                WHERE schedule_id = $1

                RETURNING *
                `,
                [scheduleId]
            );


        // ========================================================
        // Change original post back to draft
        // ========================================================

        await client.query(
            `
            UPDATE posts

            SET
                status = 'draft',
                scheduled_time = NULL

            WHERE post_id = $1
            `,
            [postId]
        );


        await client.query("COMMIT");


        return res.status(200).json({
            message:
                "Scheduled post deleted successfully",

            schedule:
                result.rows[0]
        });


    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError.message
            );
        }


        console.error(
            "DELETE SCHEDULE ERROR:",
            error
        );


        return res.status(500).json({
            message:
                "Failed to delete scheduled post",

            error:
                error.message
        });


    } finally {
        client.release();
    }
});


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;