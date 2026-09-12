const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// ============================================================
// SUPPORTED SOCIAL MEDIA PLATFORMS
// ============================================================

const ALLOWED_PLATFORMS = [
    "Instagram",
    "Facebook",
    "Twitter-X",
    "LinkedIn"
];

// ============================================================
// ADD SOCIAL ACCOUNT
// POST /api/social-accounts
// ============================================================

router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            platform,
            username,
            access_token
        } = req.body;

        // Validate required fields
        if (!platform || !username) {
            return res.status(400).json({
                message: "Platform and username are required"
            });
        }

        // Validate platform
        if (!ALLOWED_PLATFORMS.includes(platform)) {
            return res.status(400).json({
                message:
                    "Invalid platform. Allowed platforms: Instagram, Facebook, Twitter-X, LinkedIn"
            });
        }

        // Check duplicate account
        const existingAccount = await pool.query(
            `SELECT account_id
             FROM social_accounts
             WHERE user_id = $1
             AND platform = $2
             AND username = $3`,
            [
                req.user.user_id,
                platform,
                username
            ]
        );

        if (existingAccount.rows.length > 0) {
            return res.status(409).json({
                message: "This social account is already connected"
            });
        }

        // Insert account
        const result = await pool.query(
            `INSERT INTO social_accounts
            (
                user_id,
                platform,
                username,
                access_token
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                account_id,
                user_id,
                platform,
                username,
                created_at`,
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
        console.error(
            "ADD SOCIAL ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to add social account",
            error: error.message
        });
    }
});

// ============================================================
// GET MY SOCIAL ACCOUNTS
// GET /api/social-accounts
// ============================================================

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,
                CASE
                    WHEN access_token IS NULL
                         OR access_token = ''
                    THEN false
                    ELSE true
                END AS connected
             FROM social_accounts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        res.json({
            accounts: result.rows
        });

    } catch (error) {
        console.error(
            "GET SOCIAL ACCOUNTS ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch social accounts",
            error: error.message
        });
    }
});

// ============================================================
// GET ONE SOCIAL ACCOUNT
// GET /api/social-accounts/:id
// ============================================================

router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,
                CASE
                    WHEN access_token IS NULL
                         OR access_token = ''
                    THEN false
                    ELSE true
                END AS connected
             FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2`,
            [
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
            account: result.rows[0]
        });

    } catch (error) {
        console.error(
            "GET SOCIAL ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch social account",
            error: error.message
        });
    }
});

// ============================================================
// UPDATE SOCIAL ACCOUNT
// PUT /api/social-accounts/:id
// ============================================================

router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            platform,
            username,
            access_token
        } = req.body;

        // Validate platform if supplied
        if (
            platform &&
            !ALLOWED_PLATFORMS.includes(platform)
        ) {
            return res.status(400).json({
                message:
                    "Invalid platform. Allowed platforms: Instagram, Facebook, Twitter-X, LinkedIn"
            });
        }

        // Check account ownership
        const existingAccount = await pool.query(
            `SELECT account_id
             FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2`,
            [
                id,
                req.user.user_id
            ]
        );

        if (existingAccount.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        // Update account
        const result = await pool.query(
            `UPDATE social_accounts
             SET
                platform = COALESCE($1, platform),
                username = COALESCE($2, username),
                access_token = COALESCE($3, access_token)
             WHERE account_id = $4
             AND user_id = $5
             RETURNING
                account_id,
                user_id,
                platform,
                username,
                created_at`,
            [
                platform || null,
                username || null,
                access_token !== undefined
                    ? access_token
                    : null,
                id,
                req.user.user_id
            ]
        );

        res.json({
            message: "Social account updated successfully",
            account: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE SOCIAL ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to update social account",
            error: error.message
        });
    }
});

// ============================================================
// DELETE SOCIAL ACCOUNT
// DELETE /api/social-accounts/:id
// ============================================================
//
// Dependency order:
//
// publishing_logs
//       ↓
// publishing_queue
//       ↓
// scheduled_posts
//       ↓
// posts
//       ↓
// social_accounts
//
// ============================================================

router.delete("/:id", authenticateToken, async (req, res) => {

    const client = await pool.connect();

    try {
        const { id } = req.params;

        // --------------------------------------------------------
        // START TRANSACTION FIRST
        // --------------------------------------------------------

        await client.query("BEGIN");

        // --------------------------------------------------------
        // CHECK ACCOUNT OWNERSHIP
        // --------------------------------------------------------

        const accountResult = await client.query(
            `SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at
             FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2`,
            [
                id,
                req.user.user_id
            ]
        );

        if (accountResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Social account not found"
            });
        }

        // --------------------------------------------------------
        // GET POSTS BELONGING TO THIS SOCIAL ACCOUNT
        // --------------------------------------------------------

        const postsResult = await client.query(
            `SELECT post_id
             FROM posts
             WHERE account_id = $1`,
            [id]
        );

        const postIds = postsResult.rows.map(
            row => row.post_id
        );

        let deletedLogs = 0;
        let deletedQueue = 0;
        let deletedScheduledPosts = 0;
        let deletedPosts = 0;

        // --------------------------------------------------------
        // DELETE DEPENDENT RECORDS
        // --------------------------------------------------------

        if (postIds.length > 0) {

            // ----------------------------------------------------
            // 1. DELETE PUBLISHING LOGS FIRST
            // ----------------------------------------------------
            //
            // publishing_logs.queue_id references
            // publishing_queue.queue_id
            //
            // publishing_logs.post_id also references posts.post_id
            //
            // Therefore logs must be deleted first.
            // ----------------------------------------------------

            const logsResult = await client.query(
                `DELETE FROM publishing_logs
                 WHERE post_id = ANY($1::int[])
                 RETURNING log_id`,
                [postIds]
            );

            deletedLogs = logsResult.rowCount;

            // ----------------------------------------------------
            // 2. DELETE PUBLISHING QUEUE
            // ----------------------------------------------------

            const queueResult = await client.query(
                `DELETE FROM publishing_queue
                 WHERE post_id = ANY($1::int[])
                 RETURNING queue_id`,
                [postIds]
            );

            deletedQueue = queueResult.rowCount;

            // ----------------------------------------------------
            // 3. DELETE SCHEDULED POSTS
            // ----------------------------------------------------

            const scheduledResult = await client.query(
                `DELETE FROM scheduled_posts
                 WHERE post_id = ANY($1::int[])
                 RETURNING schedule_id`,
                [postIds]
            );

            deletedScheduledPosts =
                scheduledResult.rowCount;

            // ----------------------------------------------------
            // 4. DELETE POSTS
            // ----------------------------------------------------

            const postsDeleteResult = await client.query(
                `DELETE FROM posts
                 WHERE account_id = $1
                 RETURNING post_id`,
                [id]
            );

            deletedPosts = postsDeleteResult.rowCount;
        }

        // --------------------------------------------------------
        // 5. DELETE SOCIAL ACCOUNT
        // --------------------------------------------------------

        const result = await client.query(
            `DELETE FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2
             RETURNING
                account_id,
                user_id,
                platform,
                username,
                created_at`,
            [
                id,
                req.user.user_id
            ]
        );

        // --------------------------------------------------------
        // COMMIT TRANSACTION
        // --------------------------------------------------------

        await client.query("COMMIT");

        // --------------------------------------------------------
        // SUCCESS RESPONSE
        // --------------------------------------------------------

        res.json({
            message: "Social account deleted successfully",

            account: result.rows[0],

            deleted: {
                posts: deletedPosts,
                scheduled_posts: deletedScheduledPosts,
                publishing_queue: deletedQueue,
                publishing_logs: deletedLogs
            }
        });

    } catch (error) {

        // --------------------------------------------------------
        // ROLLBACK IF ANY ERROR OCCURS
        // --------------------------------------------------------

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError
            );
        }

        console.error(
            "DELETE SOCIAL ACCOUNT ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to delete social account",
            error: error.message
        });

    } finally {

        // --------------------------------------------------------
        // RELEASE DATABASE CONNECTION
        // --------------------------------------------------------

        client.release();
    }
});

// ============================================================
// TEST SOCIAL ACCOUNT CONNECTION
// POST /api/social-accounts/:id/test
// ============================================================

router.post("/:id/test", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                account_id,
                platform,
                username,
                access_token
             FROM social_accounts
             WHERE account_id = $1
             AND user_id = $2`,
            [
                id,
                req.user.user_id
            ]
        );

        // Account not found
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found",
                connected: false
            });
        }

        const account = result.rows[0];

        // Check access token
        if (
            !account.access_token ||
            account.access_token.trim() === ""
        ) {
            return res.status(400).json({
                message:
                    "No access token configured for this social account",
                connected: false,
                platform: account.platform,
                username: account.username
            });
        }

        // Configuration check only.
        // This does NOT make a real API request.

        res.json({
            message:
                `${account.platform} account connection is configured`,
            connected: true,
            platform: account.platform,
            username: account.username
        });

    } catch (error) {

        console.error(
            "SOCIAL CONNECTION TEST ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Failed to test social account connection",
            connected: false,
            error: error.message
        });
    }
});

// ============================================================
// DISCONNECT SOCIAL ACCOUNT TOKEN
// POST /api/social-accounts/:id/disconnect
// ============================================================

router.post(
    "/:id/disconnect",
    authenticateToken,
    async (req, res) => {

        try {
            const { id } = req.params;

            const result = await pool.query(
                `UPDATE social_accounts
                 SET access_token = NULL
                 WHERE account_id = $1
                 AND user_id = $2
                 RETURNING
                    account_id,
                    user_id,
                    platform,
                    username,
                    created_at`,
                [
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
                message:
                    "Social account disconnected successfully",
                connected: false,
                account: result.rows[0]
            });

        } catch (error) {

            console.error(
                "DISCONNECT SOCIAL ACCOUNT ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to disconnect social account",
                error: error.message
            });
        }
    }
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;

