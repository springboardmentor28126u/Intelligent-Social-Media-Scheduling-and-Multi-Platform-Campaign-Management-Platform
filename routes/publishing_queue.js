const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =====================================================
// GET ALL PUBLISHING QUEUE ITEMS
// =====================================================
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pq.queue_id,
                pq.post_id,
                pq.platform,
                pq.scheduled_time,
                pq.status,
                pq.priority,
                pq.retry_count,
                pq.created_at,
                p.content
            FROM publishing_queue pq
            LEFT JOIN posts p
                ON pq.post_id = p.post_id
            ORDER BY pq.scheduled_time ASC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching publishing queue:", error);
        res.status(500).json({
            message: "Failed to fetch publishing queue",
            error: error.message
        });
    }
});


// =====================================================
// GET QUEUE ITEM BY ID
// =====================================================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                pq.*,
                p.content
            FROM publishing_queue pq
            LEFT JOIN posts p
                ON pq.post_id = p.post_id
            WHERE pq.queue_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Queue item not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching queue item:", error);
        res.status(500).json({
            message: "Failed to fetch queue item",
            error: error.message
        });
    }
});


// =====================================================
// ADD POST TO PUBLISHING QUEUE
// =====================================================
router.post("/", async (req, res) => {
    try {
        const {
            post_id,
            platform,
            scheduled_time,
            priority = 1
        } = req.body;

        if (!post_id || !platform || !scheduled_time) {
            return res.status(400).json({
                message: "post_id, platform and scheduled_time are required"
            });
        }

        // Check whether post exists
        const postCheck = await pool.query(
            "SELECT post_id FROM posts WHERE post_id = $1",
            [post_id]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // Check whether this post is already queued
        const existing = await pool.query(`
            SELECT queue_id
            FROM publishing_queue
            WHERE post_id = $1
              AND platform = $2
              AND status IN ('pending', 'processing')
        `, [post_id, platform]);

        if (existing.rows.length > 0) {
            return res.status(409).json({
                message: "This post is already in the publishing queue",
                queue_id: existing.rows[0].queue_id
            });
        }

        const result = await pool.query(`
            INSERT INTO publishing_queue
                (post_id, platform, scheduled_time, status, priority, retry_count)
            VALUES
                ($1, $2, $3, 'pending', $4, 0)
            RETURNING *
        `, [
            post_id,
            platform,
            scheduled_time,
            priority
        ]);

        res.status(201).json({
            message: "Post added to publishing queue",
            queue: result.rows[0]
        });

    } catch (error) {
        console.error("Error adding to publishing queue:", error);

        res.status(500).json({
            message: "Failed to add post to publishing queue",
            error: error.message
        });
    }
});


// =====================================================
// UPDATE QUEUE STATUS
// =====================================================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            priority
        } = req.body;

        const result = await pool.query(`
            UPDATE publishing_queue
            SET
                status = COALESCE($1, status),
                priority = COALESCE($2, priority)
            WHERE queue_id = $3
            RETURNING *
        `, [
            status || null,
            priority !== undefined ? priority : null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Queue item not found"
            });
        }

        res.json({
            message: "Publishing queue updated",
            queue: result.rows[0]
        });

    } catch (error) {
        console.error("Error updating publishing queue:", error);

        res.status(500).json({
            message: "Failed to update publishing queue",
            error: error.message
        });
    }
});


// =====================================================
// DELETE QUEUE ITEM
// =====================================================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM publishing_queue WHERE queue_id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Queue item not found"
            });
        }

        res.json({
            message: "Queue item deleted successfully",
            queue: result.rows[0]
        });

    } catch (error) {
        console.error("Error deleting queue item:", error);

        res.status(500).json({
            message: "Failed to delete queue item",
            error: error.message
        });
    }
});

module.exports = router;