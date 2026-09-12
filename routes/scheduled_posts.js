const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ============================================================
// CREATE / SCHEDULE A POST
// POST /api/scheduled-posts
// ============================================================
router.post("/", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { post_id, scheduled_at } = req.body;

        if (!post_id || !scheduled_at) {
            return res.status(400).json({
                message: "post_id and scheduled_at are required"
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

        await client.query("BEGIN");

        // --------------------------------------------------------
        // Check post ownership and get social account information
        // --------------------------------------------------------
        const postResult = await client.query(
            `SELECT
                p.post_id,
                p.content,
                p.account_id,
                s.platform,
                s.username
             FROM posts p
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
             ON p.account_id = s.account_id
             WHERE p.post_id = $1
             AND c.user_id = $2`,
            [post_id, req.user.user_id]
        );

        if (postResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Post not found"
            });
        }

        const post = postResult.rows[0];

        // --------------------------------------------------------
        // Do not schedule an already published post
        // --------------------------------------------------------
        const currentPost = await client.query(
            `SELECT status
             FROM posts
             WHERE post_id = $1`,
            [post_id]
        );

        if (
            currentPost.rows.length > 0 &&
            currentPost.rows[0].status === "published"
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Published post cannot be scheduled again"
            });
        }

        // --------------------------------------------------------
        // Check for existing pending/processing schedule
        // --------------------------------------------------------
        const existingSchedule = await client.query(
            `SELECT schedule_id
             FROM scheduled_posts
             WHERE post_id = $1
             AND status IN ('pending', 'processing')
             LIMIT 1`,
            [post_id]
        );

        if (existingSchedule.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                message: "This post already has an active schedule",
                schedule_id: existingSchedule.rows[0].schedule_id
            });
        }

        // --------------------------------------------------------
        // Create scheduled post
        // --------------------------------------------------------
        const scheduleResult = await client.query(
            `INSERT INTO scheduled_posts
             (post_id, scheduled_at, status)
             VALUES ($1, $2, 'pending')
             RETURNING *`,
            [post_id, scheduled_at]
        );

        // --------------------------------------------------------
        // Update original post
        // --------------------------------------------------------
        await client.query(
            `UPDATE posts
             SET status = 'scheduled',
                 scheduled_time = $1
             WHERE post_id = $2`,
            [scheduled_at, post_id]
        );

        // --------------------------------------------------------
        // Check whether queue entry already exists
        // --------------------------------------------------------
        const queueResult = await client.query(
            `SELECT queue_id
             FROM publishing_queue
             WHERE post_id = $1
             AND status IN ('pending', 'processing')
             LIMIT 1`,
            [post_id]
        );

        // --------------------------------------------------------
        // Add post to publishing queue
        // --------------------------------------------------------
        let queueItem = null;

        if (queueResult.rows.length === 0) {
            const queueInsert = await client.query(
                `INSERT INTO publishing_queue
                 (post_id, platform, scheduled_time, priority, status)
                 VALUES ($1, $2, $3, $4, 'pending')
                 RETURNING *`,
                [
                    post_id,
                    post.platform,
                    scheduled_at,
                    5
                ]
            );

            queueItem = queueInsert.rows[0];
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Post scheduled successfully",
            schedule: scheduleResult.rows[0],
            queue: queueItem
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to schedule post",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// ============================================================
// PUBLISH A SCHEDULED POST
// POST /api/scheduled-posts/:id/publish
// ============================================================
router.post("/:id/publish", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        // --------------------------------------------------------
        // Get scheduled post and verify ownership
        // --------------------------------------------------------
        const result = await client.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                sp.scheduled_at,
                sp.status,
                p.content,
                p.media_url,
                p.account_id,
                s.platform,
                s.username,
                s.access_token
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
             ON p.account_id = s.account_id
             WHERE sp.schedule_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Scheduled post not found",
                published: false
            });
        }

        const scheduledPost = result.rows[0];

        // --------------------------------------------------------
        // Check already published
        // --------------------------------------------------------
        if (scheduledPost.status === "published") {
            return res.status(400).json({
                message: "Post is already published",
                published: true
            });
        }

        // --------------------------------------------------------
        // Check access token
        // --------------------------------------------------------
        if (
            !scheduledPost.access_token ||
            scheduledPost.access_token.trim() === ""
        ) {
            return res.status(400).json({
                message: "No access token configured for this social account",
                published: false
            });
        }

        /*
         * --------------------------------------------------------
         * IMPORTANT
         * --------------------------------------------------------
         * This currently completes the DATABASE publishing
         * workflow.
         *
         * Actual Instagram/Facebook/X/LinkedIn API publishing
         * should be connected through a platform-specific
         * publisher service.
         *
         * Therefore this endpoint should not be presented as
         * real social-media publishing yet.
         */

        await client.query("BEGIN");

        // --------------------------------------------------------
        // Mark scheduled post as processing
        // --------------------------------------------------------
        await client.query(
            `UPDATE scheduled_posts
             SET status = 'processing'
             WHERE schedule_id = $1`,
            [id]
        );

        // --------------------------------------------------------
        // Update queue item
        // --------------------------------------------------------
        await client.query(
            `UPDATE publishing_queue
             SET status = 'processing'
             WHERE post_id = $1
             AND status = 'pending'`,
            [scheduledPost.post_id]
        );

        // --------------------------------------------------------
        // DATABASE PUBLISH SUCCESS
        // --------------------------------------------------------
        const updateSchedule = await client.query(
            `UPDATE scheduled_posts
             SET status = 'published',
                 published_at = CURRENT_TIMESTAMP,
                 error_message = NULL
             WHERE schedule_id = $1
             RETURNING *`,
            [id]
        );

        // --------------------------------------------------------
        // Update original post
        // --------------------------------------------------------
        await client.query(
            `UPDATE posts
             SET status = 'published'
             WHERE post_id = $1`,
            [scheduledPost.post_id]
        );

        // --------------------------------------------------------
        // Update queue
        // --------------------------------------------------------
        await client.query(
            `UPDATE publishing_queue
             SET status = 'published'
             WHERE post_id = $1`,
            [scheduledPost.post_id]
        );

        await client.query("COMMIT");

        res.json({
            message: "Post publishing workflow completed",
            published: true,
            platform: scheduledPost.platform,
            username: scheduledPost.username,
            schedule: updateSchedule.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("PUBLISH ERROR:", error);

        // --------------------------------------------------------
        // Save publishing failure
        // --------------------------------------------------------
        try {
            await pool.query(
                `UPDATE scheduled_posts
                 SET status = 'failed',
                     error_message = $1
                 WHERE schedule_id = $2`,
                [error.message, req.params.id]
            );

            await pool.query(
                `UPDATE publishing_queue
                 SET status = 'failed'
                 WHERE post_id = (
                     SELECT post_id
                     FROM scheduled_posts
                     WHERE schedule_id = $1
                 )`,
                [req.params.id]
            );

            await pool.query(
                `UPDATE posts
                 SET status = 'failed'
                 WHERE post_id = (
                     SELECT post_id
                     FROM scheduled_posts
                     WHERE schedule_id = $1
                 )`,
                [req.params.id]
            );

        } catch (dbError) {
            console.error(
                "FAILED TO SAVE PUBLISH ERROR:",
                dbError
            );
        }

        res.status(500).json({
            message: "Failed to publish post",
            published: false,
            error: error.message
        });

    } finally {
        client.release();
    }
});


// ============================================================
// GET ALL SCHEDULED POSTS
// GET /api/scheduled-posts
// ============================================================
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                p.content,
                p.media_url,
                p.status AS post_status,
                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message,
                s.account_id,
                s.platform,
                s.username
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
             ON p.account_id = s.account_id
             WHERE c.user_id = $1
             ORDER BY sp.scheduled_at ASC`,
            [req.user.user_id]
        );

        res.json({
            scheduled_posts: result.rows
        });

    } catch (error) {
        console.error("GET SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch scheduled posts",
            error: error.message
        });
    }
});


// ============================================================
// GET ONE SCHEDULED POST
// GET /api/scheduled-posts/:id
// ============================================================
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                p.content,
                p.media_url,
                p.status AS post_status,
                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message,
                s.account_id,
                s.platform,
                s.username
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
             ON p.account_id = s.account_id
             WHERE sp.schedule_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Scheduled post not found"
            });
        }

        res.json({
            scheduled_post: result.rows[0]
        });

    } catch (error) {
        console.error("GET SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch scheduled post",
            error: error.message
        });
    }
});


// ============================================================
// UPDATE SCHEDULED POST
// PUT /api/scheduled-posts/:id
// ============================================================
router.put("/:id", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { scheduled_at, status } = req.body;

        // --------------------------------------------------------
        // Validate status
        // --------------------------------------------------------
        const allowedStatuses = [
            "pending",
            "processing",
            "published",
            "failed"
        ];

        if (
            status !== undefined &&
            status !== null &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                message:
                    "Invalid status. Allowed values: pending, processing, published, failed"
            });
        }

        // --------------------------------------------------------
        // Validate date if supplied
        // --------------------------------------------------------
        if (scheduled_at) {
            const date = new Date(scheduled_at);

            if (Number.isNaN(date.getTime())) {
                return res.status(400).json({
                    message: "Invalid scheduled_at date"
                });
            }

            if (
                date <= new Date() &&
                status !== "published"
            ) {
                return res.status(400).json({
                    message: "Scheduled time must be in the future"
                });
            }
        }

        // --------------------------------------------------------
        // Check ownership
        // --------------------------------------------------------
        const existingSchedule = await client.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                sp.status
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             WHERE sp.schedule_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (existingSchedule.rows.length === 0) {
            return res.status(404).json({
                message: "Scheduled post not found"
            });
        }

        const schedule = existingSchedule.rows[0];
        const postId = schedule.post_id;

        // --------------------------------------------------------
        // Do not modify already published schedule
        // --------------------------------------------------------
        if (
            schedule.status === "published" &&
            status !== "published"
        ) {
            return res.status(400).json({
                message: "Published scheduled posts cannot be modified"
            });
        }

        await client.query("BEGIN");

        // --------------------------------------------------------
        // Update scheduled post
        // --------------------------------------------------------
        const result = await client.query(
            `UPDATE scheduled_posts
             SET scheduled_at = COALESCE($1, scheduled_at),
                 status = COALESCE($2, status)
             WHERE schedule_id = $3
             RETURNING *`,
            [scheduled_at || null, status || null, id]
        );

        // --------------------------------------------------------
        // Synchronize posts table
        // --------------------------------------------------------
        if (status === "published") {

            await client.query(
                `UPDATE posts
                 SET status = 'published'
                 WHERE post_id = $1`,
                [postId]
            );

        } else if (status === "failed") {

            await client.query(
                `UPDATE posts
                 SET status = 'failed'
                 WHERE post_id = $1`,
                [postId]
            );

        } else {

            await client.query(
                `UPDATE posts
                 SET status = 'scheduled',
                     scheduled_time = COALESCE($1, scheduled_time)
                 WHERE post_id = $2`,
                [scheduled_at || null, postId]
            );
        }

        // --------------------------------------------------------
        // Synchronize publishing queue
        // --------------------------------------------------------
        if (scheduled_at) {
            await client.query(
                `UPDATE publishing_queue
                 SET scheduled_time = $1
                 WHERE post_id = $2
                 AND status IN ('pending', 'processing')`,
                [scheduled_at, postId]
            );
        }

        if (status) {
            await client.query(
                `UPDATE publishing_queue
                 SET status = $1
                 WHERE post_id = $2`,
                [status, postId]
            );
        }

        await client.query("COMMIT");

        res.json({
            message: "Scheduled post updated successfully",
            schedule: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("UPDATE SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to update scheduled post",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// ============================================================
// RETRY FAILED SCHEDULED POST
// POST /api/scheduled-posts/:id/retry
// ============================================================
router.post("/:id/retry", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        const result = await client.query(
            `SELECT
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
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Scheduled post not found"
            });
        }

        const schedule = result.rows[0];

        if (schedule.status !== "failed") {
            return res.status(400).json({
                message: "Only failed scheduled posts can be retried"
            });
        }

        await client.query("BEGIN");

        // --------------------------------------------------------
        // Reset scheduled post
        // --------------------------------------------------------
        const updatedSchedule = await client.query(
            `UPDATE scheduled_posts
             SET status = 'pending',
                 error_message = NULL,
                 published_at = NULL
             WHERE schedule_id = $1
             RETURNING *`,
            [id]
        );

        // --------------------------------------------------------
        // Reset original post
        // --------------------------------------------------------
        await client.query(
            `UPDATE posts
             SET status = 'scheduled',
                 scheduled_time = $1
             WHERE post_id = $2`,
            [schedule.scheduled_at, schedule.post_id]
        );

        // --------------------------------------------------------
        // Reset queue
        // --------------------------------------------------------
        const queueExists = await client.query(
            `SELECT queue_id
             FROM publishing_queue
             WHERE post_id = $1
             LIMIT 1`,
            [schedule.post_id]
        );

        if (queueExists.rows.length > 0) {

            await client.query(
                `UPDATE publishing_queue
                 SET status = 'pending',
                     scheduled_time = $1
                 WHERE post_id = $2`,
                [
                    schedule.scheduled_at,
                    schedule.post_id
                ]
            );

        } else {

            // Get platform
            const platformResult = await client.query(
                `SELECT s.platform
                 FROM posts p
                 JOIN social_accounts s
                 ON p.account_id = s.account_id
                 WHERE p.post_id = $1`,
                [schedule.post_id]
            );

            if (platformResult.rows.length > 0) {

                await client.query(
                    `INSERT INTO publishing_queue
                     (post_id, platform, scheduled_time, priority, status)
                     VALUES ($1, $2, $3, $4, 'pending')`,
                    [
                        schedule.post_id,
                        platformResult.rows[0].platform,
                        schedule.scheduled_at,
                        5
                    ]
                );
            }
        }

        await client.query("COMMIT");

        res.json({
            message: "Scheduled post added back to publishing queue",
            schedule: updatedSchedule.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("RETRY SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to retry scheduled post",
            error: error.message
        });

    } finally {
        client.release();
    }
});


// ============================================================
// DELETE SCHEDULED POST
// DELETE /api/scheduled-posts/:id
// ============================================================
router.delete("/:id", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        // --------------------------------------------------------
        // Check ownership
        // --------------------------------------------------------
        const existingSchedule = await client.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                sp.status
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             WHERE sp.schedule_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (existingSchedule.rows.length === 0) {
            return res.status(404).json({
                message: "Scheduled post not found"
            });
        }

        const schedule = existingSchedule.rows[0];

        // --------------------------------------------------------
        // Do not delete processing/published schedule
        // --------------------------------------------------------
        if (schedule.status === "processing") {
            return res.status(400).json({
                message:
                    "A post currently being published cannot be deleted"
            });
        }

        if (schedule.status === "published") {
            return res.status(400).json({
                message:
                    "A published scheduled post cannot be deleted"
            });
        }

        const postId = schedule.post_id;

        await client.query("BEGIN");

        // --------------------------------------------------------
        // Delete queue entry
        // --------------------------------------------------------
        await client.query(
            `DELETE FROM publishing_queue
             WHERE post_id = $1
             AND status IN ('pending', 'failed')`,
            [postId]
        );

        // --------------------------------------------------------
        // Delete scheduled post
        // --------------------------------------------------------
        const result = await client.query(
            `DELETE FROM scheduled_posts
             WHERE schedule_id = $1
             RETURNING *`,
            [id]
        );

        // --------------------------------------------------------
        // Change post back to draft
        // --------------------------------------------------------
        await client.query(
            `UPDATE posts
             SET status = 'draft',
                 scheduled_time = NULL
             WHERE post_id = $1`,
            [postId]
        );

        await client.query("COMMIT");

        res.json({
            message: "Scheduled post deleted successfully",
            schedule: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("DELETE SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to delete scheduled post",
            error: error.message
        });

    } finally {
        client.release();
    }
});


module.exports = router;