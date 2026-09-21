const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// ADD SOCIAL ACCOUNT
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            platform,
            username,
            access_token
        } = req.body;

        if (!platform || !username) {
            return res.status(400).json({
                message: "Platform and username are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO social_accounts
            (user_id, platform, username, access_token)
            VALUES ($1, $2, $3, $4)
            RETURNING account_id, user_id, platform, username, created_at`,
            [
                req.user.user_id,
                platform,
                username,
                access_token || null
            ]
        );

        res.status(201).json({
            message: "Social account added successfully",
            account: result.rows[0]
        });

    } catch (error) {
        console.error("SOCIAL ACCOUNT ERROR:", error);

        res.status(500).json({
            message: "Failed to add social account",
            error: error.message
        });
    }
});


// GET MY SOCIAL ACCOUNTS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT account_id, user_id, platform, username, created_at
             FROM social_accounts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        res.json({
            accounts: result.rows
        });

    } catch (error) {
        console.error("GET SOCIAL ACCOUNTS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch social accounts",
            error: error.message
        });
    }
});
// GET ONE SOCIAL ACCOUNT
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT account_id, user_id, platform, username, created_at
             FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        res.json({
            account: result.rows[0]
        });

    } catch (error) {
        console.error("GET SOCIAL ACCOUNT ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch social account",
            error: error.message
        });
    }
});
// UPDATE SOCIAL ACCOUNT
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { platform, username, access_token } = req.body;

        const result = await pool.query(
            `UPDATE social_accounts
             SET platform = COALESCE($1, platform),
                 username = COALESCE($2, username),
                 access_token = COALESCE($3, access_token)
             WHERE account_id = $4
             AND user_id = $5
             RETURNING account_id, user_id, platform, username, created_at`,
            [
                platform,
                username,
                access_token,
                id,
                req.user.user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        res.json({
            message: "Social account updated successfully",
            account: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE SOCIAL ACCOUNT ERROR:", error);

        res.status(500).json({
            message: "Failed to update social account",
            error: error.message
        });
    }
});
// DELETE SOCIAL ACCOUNT
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2
             RETURNING account_id, user_id, platform, username, created_at`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        res.json({
            message: "Social account deleted successfully",
            account: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE SOCIAL ACCOUNT ERROR:", error);

        res.status(500).json({
            message: "Failed to delete social account",
            error: error.message
        });
    }
});


module.exports = router;