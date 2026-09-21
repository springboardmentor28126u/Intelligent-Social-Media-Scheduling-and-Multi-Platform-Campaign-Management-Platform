const express = require("express");

const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// ==================== CREATE CAMPAIGN ====================

router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            campaign_name,
            description,
            status,
            start_date,
            end_date
        } = req.body;

        if (!campaign_name) {
            return res.status(400).json({
                message: "Campaign name is required"
            });
        }

        const result = await pool.query(
            `INSERT INTO campaigns
            (user_id, campaign_name, description, status, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.user_id,
                campaign_name,
                description || null,
                status || "draft",
                start_date || null,
                end_date || null
            ]
        );

        res.status(201).json({
            message: "Campaign created successfully",
            campaign: result.rows[0]
        });

    } catch (error) {
        console.error("CAMPAIGN ERROR:", error);

        res.status(500).json({
            message: "Failed to create campaign",
            error: error.message
        });
    }
});


// ==================== GET MY CAMPAIGNS ====================

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM campaigns
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        res.json({
            campaigns: result.rows
        });

    } catch (error) {
        console.error("GET CAMPAIGNS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch campaigns",
            error: error.message
        });
    }
});

module.exports = router;
// ==================== GET ONE CAMPAIGN ====================

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM campaigns
             WHERE campaign_id = $1
             AND user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        res.json({
            campaign: result.rows[0]
        });

    } catch (error) {
        console.error("GET CAMPAIGN ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch campaign",
            error: error.message
        });
    }
});
// ==================== UPDATE CAMPAIGN ====================

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            campaign_name,
            description,
            status,
            start_date,
            end_date
        } = req.body;

        const result = await pool.query(
            `UPDATE campaigns
             SET campaign_name = COALESCE($1, campaign_name),
                 description = COALESCE($2, description),
                 status = COALESCE($3, status),
                 start_date = COALESCE($4, start_date),
                 end_date = COALESCE($5, end_date)
             WHERE campaign_id = $6
             AND user_id = $7
             RETURNING *`,
            [
                campaign_name,
                description,
                status,
                start_date,
                end_date,
                id,
                req.user.user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        res.json({
            message: "Campaign updated successfully",
            campaign: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE CAMPAIGN ERROR:", error);

        res.status(500).json({
            message: "Failed to update campaign",
            error: error.message
        });
    }
});
// ==================== DELETE CAMPAIGN ====================

router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM campaigns
             WHERE campaign_id = $1
             AND user_id = $2
             RETURNING *`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        res.json({
            message: "Campaign deleted successfully",
            campaign: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE CAMPAIGN ERROR:", error);

        res.status(500).json({
            message: "Failed to delete campaign",
            error: error.message
        });
    }
});

module.exports = router;