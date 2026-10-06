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
    "LinkedIn",
    "YouTube",
    "Pinterest",
    "TikTok",
    "Threads"
];

// ============================================================
// HELPER - VALIDATE PLATFORM
// ============================================================

function isValidPlatform(platform) {
    return ALLOWED_PLATFORMS.includes(platform);
}

// ============================================================
// GET SUPPORTED SOCIAL PLATFORMS
// GET /api/social-accounts/platforms/list
//
// IMPORTANT:
// Keep this route BEFORE /:id
// ============================================================

router.get("/platforms/list", (req, res) => {
    return res.json({
        platforms: ALLOWED_PLATFORMS
    });
});

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

        // --------------------------------------------------------
        // CHECK LOGIN USER
        // --------------------------------------------------------

        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        const userId = req.user.user_id;

        // --------------------------------------------------------
        // VALIDATE REQUIRED FIELDS
        // --------------------------------------------------------

        if (!platform || !username) {
            return res.status(400).json({
                message: "Platform and username are required"
            });
        }

        const cleanPlatform = String(platform).trim();
        const cleanUsername = String(username).trim();

        if (!cleanPlatform) {
            return res.status(400).json({
                message: "Platform cannot be empty"
            });
        }

        if (!cleanUsername) {
            return res.status(400).json({
                message: "Username cannot be empty"
            });
        }

        // --------------------------------------------------------
        // VALIDATE PLATFORM
        // --------------------------------------------------------

        if (!isValidPlatform(cleanPlatform)) {
            return res.status(400).json({
                message:
                    "Invalid platform. Allowed platforms: " +
                    ALLOWED_PLATFORMS.join(", ")
            });
        }

        // --------------------------------------------------------
        // CLEAN ACCESS TOKEN
        // --------------------------------------------------------

        let cleanAccessToken = null;

        if (
            access_token !== undefined &&
            access_token !== null
        ) {
            const token = String(access_token).trim();

            if (token !== "") {
                cleanAccessToken = token;
            }
        }

        // --------------------------------------------------------
        // CHECK DUPLICATE ACCOUNT
        // ONLY FOR CURRENT USER
        // --------------------------------------------------------

        const existingAccount = await pool.query(
            `
            SELECT account_id
            FROM social_accounts
            WHERE user_id = $1
              AND platform = $2
              AND username = $3
            `,
            [
                userId,
                cleanPlatform,
                cleanUsername
            ]
        );

        if (existingAccount.rows.length > 0) {
            return res.status(409).json({
                message: "This social account is already connected"
            });
        }

        // --------------------------------------------------------
        // INSERT SOCIAL ACCOUNT
        // --------------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO social_accounts
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
                created_at
            `,
            [
                userId,
                cleanPlatform,
                cleanUsername,
                cleanAccessToken
            ]
        );

        return res.status(201).json({
            message: "Social account added successfully",

            account: {
                ...result.rows[0],
                connected: Boolean(cleanAccessToken)
            }
        });

    } catch (error) {
        console.error(
            "ADD SOCIAL ACCOUNT ERROR:",
            error
        );

        return res.status(500).json({
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
        // --------------------------------------------------------
        // CHECK LOGIN USER
        // --------------------------------------------------------

        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        const userId = req.user.user_id;

        // --------------------------------------------------------
        // GET ONLY CURRENT USER'S ACCOUNTS
        // --------------------------------------------------------

        const result = await pool.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,

                CASE
                    WHEN access_token IS NULL
                      OR TRIM(access_token) = ''
                    THEN false
                    ELSE true
                END AS connected

            FROM social_accounts

            WHERE user_id = $1

            ORDER BY created_at DESC
            `,
            [userId]
        );

        return res.json({
            accounts: result.rows
        });

    } catch (error) {
        console.error(
            "GET SOCIAL ACCOUNTS ERROR:",
            error
        );

        return res.status(500).json({
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

        // --------------------------------------------------------
        // CHECK LOGIN USER
        // --------------------------------------------------------

        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        // --------------------------------------------------------
        // GET ACCOUNT BELONGING TO CURRENT USER
        // --------------------------------------------------------

        const result = await pool.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at,

                CASE
                    WHEN access_token IS NULL
                      OR TRIM(access_token) = ''
                    THEN false
                    ELSE true
                END AS connected

            FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2
            `,
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

        return res.json({
            account: result.rows[0]
        });

    } catch (error) {
        console.error(
            "GET SOCIAL ACCOUNT ERROR:",
            error
        );

        return res.status(500).json({
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

        // --------------------------------------------------------
        // CHECK LOGIN USER
        // --------------------------------------------------------

        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        const userId = req.user.user_id;

        // --------------------------------------------------------
        // CLEAN PLATFORM
        // --------------------------------------------------------

        const cleanPlatform =
            platform !== undefined &&
            platform !== null
                ? String(platform).trim()
                : null;

        // --------------------------------------------------------
        // CLEAN USERNAME
        // --------------------------------------------------------

        const cleanUsername =
            username !== undefined &&
            username !== null
                ? String(username).trim()
                : null;

        // --------------------------------------------------------
        // VALIDATE PLATFORM
        // --------------------------------------------------------

        if (
            cleanPlatform !== null &&
            !isValidPlatform(cleanPlatform)
        ) {
            return res.status(400).json({
                message:
                    "Invalid platform. Allowed platforms: " +
                    ALLOWED_PLATFORMS.join(", ")
            });
        }

        // --------------------------------------------------------
        // VALIDATE USERNAME
        // --------------------------------------------------------

        if (
            cleanUsername !== null &&
            cleanUsername === ""
        ) {
            return res.status(400).json({
                message: "Username cannot be empty"
            });
        }

        // --------------------------------------------------------
        // CHECK ACCOUNT OWNERSHIP
        // --------------------------------------------------------

        const existingAccount = await pool.query(
            `
            SELECT account_id
            FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2
            `,
            [
                id,
                userId
            ]
        );

        if (existingAccount.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        // --------------------------------------------------------
        // CHECK DUPLICATE ACCOUNT
        // --------------------------------------------------------

        if (
            cleanPlatform !== null ||
            cleanUsername !== null
        ) {
            const duplicateCheck = await pool.query(
                `
                SELECT account_id
                FROM social_accounts

                WHERE user_id = $1

                  AND platform =
                      COALESCE($2, platform)

                  AND username =
                      COALESCE($3, username)

                  AND account_id <> $4
                `,
                [
                    userId,
                    cleanPlatform,
                    cleanUsername,
                    id
                ]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    message:
                        "Another social account with these details already exists"
                });
            }
        }

        // --------------------------------------------------------
        // TOKEN UPDATE
        //
        // undefined = keep old token
        // null      = remove token
        // ""        = remove token
        // value     = set new token
        // --------------------------------------------------------

        let tokenUpdateProvided = false;
        let cleanAccessToken = null;

        if (access_token !== undefined) {
            tokenUpdateProvided = true;

            if (
                access_token !== null &&
                String(access_token).trim() !== ""
            ) {
                cleanAccessToken =
                    String(access_token).trim();
            }
        }

        // --------------------------------------------------------
        // UPDATE ACCOUNT
        // --------------------------------------------------------

        const result = await pool.query(
            `
            UPDATE social_accounts

            SET
                platform =
                    COALESCE($1, platform),

                username =
                    COALESCE($2, username),

                access_token =
                    CASE
                        WHEN $3 = true
                        THEN $4
                        ELSE access_token
                    END

            WHERE account_id = $5
              AND user_id = $6

            RETURNING
                account_id,
                user_id,
                platform,
                username,
                created_at,

                CASE
                    WHEN access_token IS NULL
                      OR TRIM(access_token) = ''
                    THEN false
                    ELSE true
                END AS connected
            `,
            [
                cleanPlatform,
                cleanUsername,
                tokenUpdateProvided,
                cleanAccessToken,
                id,
                userId
            ]
        );

        return res.json({
            message: "Social account updated successfully",
            account: result.rows[0]
        });

    } catch (error) {
        console.error(
            "UPDATE SOCIAL ACCOUNT ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to update social account",
            error: error.message
        });
    }
});

// ============================================================
// DELETE SOCIAL ACCOUNT
// DELETE /api/social-accounts/:id
// ============================================================

router.delete("/:id", authenticateToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        // --------------------------------------------------------
        // CHECK LOGIN USER
        // --------------------------------------------------------

        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        const userId = req.user.user_id;

        // --------------------------------------------------------
        // START TRANSACTION
        // --------------------------------------------------------

        await client.query("BEGIN");

        // --------------------------------------------------------
        // CHECK ACCOUNT OWNERSHIP
        // --------------------------------------------------------

        const accountResult = await client.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username,
                created_at

            FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2
            `,
            [
                id,
                userId
            ]
        );

        if (accountResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Social account not found"
            });
        }

        // --------------------------------------------------------
        // GET POSTS BELONGING TO ACCOUNT
        // --------------------------------------------------------

        const postsResult = await client.query(
            `
            SELECT post_id
            FROM posts
            WHERE account_id = $1
            `,
            [id]
        );

        const postIds = postsResult.rows.map(
            row => row.post_id
        );

        let deletedLogs = 0;
        let deletedQueue = 0;
        let deletedScheduledPosts = 0;
        let deletedRecurringPosts = 0;
        let deletedPosts = 0;

        // --------------------------------------------------------
        // DELETE DEPENDENT RECORDS
        // --------------------------------------------------------

        if (postIds.length > 0) {

            // ----------------------------------------------------
            // 1. DELETE PUBLISHING LOGS
            // ----------------------------------------------------

            const logsResult = await client.query(
                `
                DELETE FROM publishing_logs

                WHERE post_id = ANY($1::int[])

                RETURNING log_id
                `,
                [postIds]
            );

            deletedLogs = logsResult.rowCount;

            // ----------------------------------------------------
            // 2. DELETE PUBLISHING QUEUE
            // ----------------------------------------------------

            const queueResult = await client.query(
                `
                DELETE FROM publishing_queue

                WHERE post_id = ANY($1::int[])

                RETURNING queue_id
                `,
                [postIds]
            );

            deletedQueue = queueResult.rowCount;

            // ----------------------------------------------------
            // 3. DELETE SCHEDULED POSTS
            // ----------------------------------------------------

            const scheduledResult = await client.query(
                `
                DELETE FROM scheduled_posts

                WHERE post_id = ANY($1::int[])

                RETURNING schedule_id
                `,
                [postIds]
            );

            deletedScheduledPosts =
                scheduledResult.rowCount;

            // ----------------------------------------------------
            // 4. DELETE RECURRING POSTS
            // ----------------------------------------------------

            try {
                const recurringResult = await client.query(
                    `
                    DELETE FROM recurring_posts

                    WHERE post_id = ANY($1::int[])

                    RETURNING *
                    `,
                    [postIds]
                );

                deletedRecurringPosts =
                    recurringResult.rowCount;

            } catch (recurringError) {

                // If recurring_posts does not have post_id,
                // continue only when the table is not present.
                if (
                    recurringError.code === "42P01"
                ) {
                    console.log(
                        "recurring_posts table not found. Skipping."
                    );
                } else {
                    throw recurringError;
                }
            }

            // ----------------------------------------------------
            // 5. DELETE POSTS
            // ----------------------------------------------------

            const postsDeleteResult = await client.query(
                `
                DELETE FROM posts

                WHERE account_id = $1

                RETURNING post_id
                `,
                [id]
            );

            deletedPosts =
                postsDeleteResult.rowCount;
        }

        // --------------------------------------------------------
        // DELETE SOCIAL ACCOUNT
        // --------------------------------------------------------

        const deleteResult = await client.query(
            `
            DELETE FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2

            RETURNING
                account_id,
                user_id,
                platform,
                username,
                created_at
            `,
            [
                id,
                userId
            ]
        );

        // --------------------------------------------------------
        // COMMIT
        // --------------------------------------------------------

        await client.query("COMMIT");

        // --------------------------------------------------------
        // RESPONSE
        // --------------------------------------------------------

        return res.json({
            message: "Social account deleted successfully",

            account: deleteResult.rows[0],

            deleted: {
                posts: deletedPosts,
                scheduled_posts:
                    deletedScheduledPosts,
                recurring_posts:
                    deletedRecurringPosts,
                publishing_queue:
                    deletedQueue,
                publishing_logs:
                    deletedLogs
            }
        });

    } catch (error) {

        // --------------------------------------------------------
        // ROLLBACK
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

        return res.status(500).json({
            message: "Failed to delete social account",
            error: error.message
        });

    } finally {
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

        // --------------------------------------------------------
        // GET ACCOUNT FOR CURRENT USER
        // --------------------------------------------------------

        const result = await pool.query(
            `
            SELECT
                account_id,
                platform,
                username,
                access_token

            FROM social_accounts

            WHERE account_id = $1
              AND user_id = $2
            `,
            [
                id,
                req.user.user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found",
                connected: false
            });
        }

        const account = result.rows[0];

        // --------------------------------------------------------
        // CHECK ACCESS TOKEN
        // --------------------------------------------------------

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

        // --------------------------------------------------------
        // CONFIGURATION CHECK
        //
        // NOTE:
        // This does NOT make a real API request.
        // --------------------------------------------------------

        return res.json({
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

        return res.status(500).json({
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
                `
                UPDATE social_accounts

                SET access_token = NULL

                WHERE account_id = $1
                  AND user_id = $2

                RETURNING
                    account_id,
                    user_id,
                    platform,
                    username,
                    created_at
                `,
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

            return res.json({
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

            return res.status(500).json({
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

