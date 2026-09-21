const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// SCHEDULE A POST
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { post_id, scheduled_at } = req.body;

        if (!post_id || !scheduled_at) {
            return res.status(400).json({
                message: "post_id and scheduled_at are required"
            });
        }

        // Check that the post belongs to the logged-in user
        const post = await pool.query(
            `SELECT p.post_id
             FROM posts p
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
             WHERE p.post_id = $1
             AND c.user_id = $2`,
            [post_id, req.user.user_id]
        );

        if (post.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const result = await pool.query(
            `INSERT INTO scheduled_posts
            (post_id, scheduled_at, status)
            VALUES ($1, $2, 'pending')
            RETURNING *`,
            [post_id, scheduled_at]
        );

        // Update post status
        await pool.query(
            `UPDATE posts
             SET status = 'scheduled',
                 scheduled_time = $1
             WHERE post_id = $2`,
            [scheduled_at, post_id]
        );

        res.status(201).json({
            message: "Post scheduled successfully",
            schedule: result.rows[0]
        });

    } catch (error) {
        console.error("SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to schedule post",
            error: error.message
        });
    }
});


// GET SCHEDULED POSTS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                p.content,
                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message
             FROM scheduled_posts sp
             JOIN posts p
             ON sp.post_id = p.post_id
             JOIN campaigns c
             ON p.campaign_id = c.campaign_id
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
// GET ONE SCHEDULED POST
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                sp.schedule_id,
                sp.post_id,
                p.content,
                sp.scheduled_at,
                sp.published_at,
                sp.status,
                sp.error_message
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
// UPDATE SCHEDULED POST
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduled_at, status } = req.body;

        // Check that the schedule belongs to the logged-in user
        const existingSchedule = await pool.query(
            `SELECT sp.schedule_id, sp.post_id
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

        const postId = existingSchedule.rows[0].post_id;

        const result = await pool.query(
            `UPDATE scheduled_posts
             SET scheduled_at = COALESCE($1, scheduled_at),
                 status = COALESCE($2, status)
             WHERE schedule_id = $3
             RETURNING *`,
            [scheduled_at, status, id]
        );

        // Keep the post's scheduled_time synchronized
        if (scheduled_at) {
            await pool.query(
                `UPDATE posts
                 SET scheduled_time = $1
                 WHERE post_id = $2`,
                [scheduled_at, postId]
            );
        }

        res.json({
            message: "Scheduled post updated successfully",
            schedule: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to update scheduled post",
            error: error.message
        });
    }
});
// DELETE SCHEDULED POST
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check that the schedule belongs to the logged-in user
        const existingSchedule = await pool.query(
            `SELECT sp.schedule_id, sp.post_id
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

        const postId = existingSchedule.rows[0].post_id;

        const result = await pool.query(
            `DELETE FROM scheduled_posts
             WHERE schedule_id = $1
             RETURNING *`,
            [id]
        );

        // Change the post back to draft after removing its schedule
        await pool.query(
            `UPDATE posts
             SET status = 'draft',
                 scheduled_time = NULL
             WHERE post_id = $1`,
            [postId]
        );

        res.json({
            message: "Scheduled post deleted successfully",
            schedule: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE SCHEDULE ERROR:", error);

        res.status(500).json({
            message: "Failed to delete scheduled post",
            error: error.message
        });
    }
});

module.exports = router;