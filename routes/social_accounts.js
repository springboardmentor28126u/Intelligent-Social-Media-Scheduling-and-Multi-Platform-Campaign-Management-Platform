
const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const ALLOWED_PLATFORMS = [
    "Instagram",
    "Facebook",
    "Twitter-X",
    "LinkedIn",
    "YouTube",
    "Pinterest",
    "TikTok",
    "Threads"
];

function validId(id) {
    return /^\d+$/.test(id) && Number(id) > 0;
}

// ADD SOCIAL ACCOUNT
router.post("/", authenticateToken, async (req, res) => {
    try {
        const { platform, username, access_token } = req.body;

        if (
            typeof platform !== "string" ||
            typeof username !== "string" ||
            !platform.trim() ||
            !username.trim()
        ) {
            return res.status(400).json({
                message: "Platform and username are required"
            });
        }

        const cleanPlatform = platform.trim();
        const cleanUsername = username.trim();

        if (!ALLOWED_PLATFORMS.includes(cleanPlatform)) {
            return res.status(400).json({
                message: "Unsupported social platform"
            });
        }

        if (
            access_token != null &&
            typeof access_token !== "string"
        ) {
            return res.status(400).json({
                message: "Access token must be a string"
            });
        }

        const token =
            typeof access_token === "string" &&
            access_token.trim()
                ? access_token.trim()
                : null;

        const result = await pool.query(
            `INSERT INTO social_accounts
                (user_id, platform, username, access_token)
             VALUES ($1, $2, $3, $4)
             RETURNING account_id, user_id, platform, username, created_at`,
            [
                req.user.user_id,
                cleanPlatform,
                cleanUsername,
                token
            ]
        );

        return res.status(201).json({
            message: token
                ? "Social account added successfully"
                : "Social account added, but not connected",
            account: {
                ...result.rows[0],
                connected: Boolean(token)
            }
        });
    } catch (error) {
        console.error("ADD SOCIAL ACCOUNT ERROR:", error.message);

        return res.status(500).json({
            message: "Failed to add social account"
        });
    }
});

// GET MY SOCIAL ACCOUNTS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,
                (
                    access_token IS NOT NULL
                    AND access_token <> ''
                ) AS connected
             FROM social_accounts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        return res.json({ accounts: result.rows });
    } catch (error) {
        console.error("GET SOCIAL ACCOUNTS ERROR:", error.message);

        return res.status(500).json({
            message: "Failed to fetch social accounts"
        });
    }
});

// GET ONE SOCIAL ACCOUNT
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!validId(id)) {
            return res.status(400).json({
                message: "Invalid social account ID"
            });
        }

        const result = await pool.query(
            `SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,
                (
                    access_token IS NOT NULL
                    AND access_token <> ''
                ) AS connected
             FROM social_accounts
             WHERE account_id = $1 AND user_id = $2`,
            [Number(id), req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        return res.json({ account: result.rows[0] });
    } catch (error) {
        console.error("GET SOCIAL ACCOUNT ERROR:", error.message);

        return res.status(500).json({
            message: "Failed to fetch social account"
        });
    }
});

// UPDATE SOCIAL ACCOUNT
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { platform, username, access_token } = req.body;

        if (!validId(id)) {
            return res.status(400).json({
                message: "Invalid social account ID"
            });
        }

        if (
            platform !== undefined &&
            (
                typeof platform !== "string" ||
                !ALLOWED_PLATFORMS.includes(platform.trim())
            )
        ) {
            return res.status(400).json({
                message: "Unsupported social platform"
            });
        }

        if (
            username !== undefined &&
            (
                typeof username !== "string" ||
                !username.trim()
            )
        ) {
            return res.status(400).json({
                message: "Username cannot be empty"
            });
        }

        if (
            access_token !== undefined &&
            access_token !== null &&
            typeof access_token !== "string"
        ) {
            return res.status(400).json({
                message: "Access token must be a string"
            });
        }

        const result = await pool.query(
            `UPDATE social_accounts
             SET
                platform = COALESCE($1, platform),
                username = COALESCE($2, username),
                access_token = COALESCE($3, access_token)
             WHERE account_id = $4 AND user_id = $5
             RETURNING account_id, user_id, platform, username, created_at`,
            [
                platform === undefined ? null : platform.trim(),
                username === undefined ? null : username.trim(),
                access_token === undefined ? null : access_token,
                Number(id),
                req.user.user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        return res.json({
            message: "Social account updated successfully",
            account: result.rows[0]
        });
    } catch (error) {
        console.error("UPDATE SOCIAL ACCOUNT ERROR:", error.message);

        return res.status(500).json({
            message: "Failed to update social account"
        });
    }
});

// DELETE SOCIAL ACCOUNT
// Keeps posts and publishing history intact.
// Returns a clear error if the account is still referenced by other records.
router.delete("/:id", authenticateToken, async (req, res) => {
    if (!validId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid social account ID"
        });
    }

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const accountResult = await client.query(
            `SELECT account_id, user_id, platform, username
             FROM social_accounts
             WHERE account_id = $1 AND user_id = $2
             FOR UPDATE`,
            [Number(req.params.id), req.user.user_id]
        );

        if (accountResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Social account not found"
            });
        }

        const deleteResult = await client.query(
            `DELETE FROM social_accounts
             WHERE account_id = $1 AND user_id = $2
             RETURNING account_id, user_id, platform, username`,
            [Number(req.params.id), req.user.user_id]
        );

        await client.query("COMMIT");

        return res.json({
            message: "Social account deleted successfully",
            account: deleteResult.rows[0]
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "DELETE ROLLBACK ERROR:",
                    rollbackError.message
                );
            }
        }

        console.error("DELETE SOCIAL ACCOUNT ERROR:", {
            message: error.message,
            code: error.code,
            constraint: error.constraint,
            table: error.table,
            detail: error.detail
        });

        if (error.code === "23503") {
            return res.status(409).json({
                message:
                    "This social account is referenced by other records. The account was not deleted.",
                constraint: error.constraint || null,
                related_table: error.table || null
            });
        }

        return res.status(500).json({
            message: "Failed to delete social account"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
