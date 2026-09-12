const express = require("express");
const router = express.Router();

const pool = require("../config/db");

// Get all queue items
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM publishing_queue ORDER BY scheduled_time ASC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Add a post to publishing queue
router.post("/", async (req, res) => {
    try {
        const {
            post_id,
            platform,
            scheduled_time,
            priority
        } = req.body;

        const result = await pool.query(
            `INSERT INTO publishing_queue
            (post_id, platform, scheduled_time, priority)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                post_id,
                platform,
                scheduled_time,
                priority || 1
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Update queue status
router.put("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
            `UPDATE publishing_queue
             SET status = $1
             WHERE queue_id = $2
             RETURNING *`,
            [status, id]
        );

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Delete queue item
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            "DELETE FROM publishing_queue WHERE queue_id = $1",
            [id]
        );

        res.json({
            message: "Queue item deleted successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;