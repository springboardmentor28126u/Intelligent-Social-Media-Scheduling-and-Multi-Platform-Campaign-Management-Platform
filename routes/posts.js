const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// =====================================================
// GET ALL POSTS
// GET /api/posts
// =====================================================
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.scheduled_time,
                p.status,
                p.created_at,

                c.campaign_name,

                sa.platform,
                sa.username

            FROM posts p

            LEFT JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            ORDER BY p.created_at DESC
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("GET /api/posts error:", error);

        res.status(500).json({
            message: "Failed to fetch posts",
            error: error.message
        });
    }
});


// =====================================================
// GET SINGLE POST
// GET /api/posts/:id
// =====================================================
router.get("/:id", async (req, res) => {
    try {
        const postId = Number(req.params.id);

        if (!Number.isInteger(postId) || postId <= 0) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        const result = await pool.query(
            `
            SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.scheduled_time,
                p.status,
                p.created_at,

                c.campaign_name,

                sa.platform,
                sa.username

            FROM posts p

            LEFT JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE p.post_id = $1
            `,
            [postId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET /api/posts/:id error:", error);

        res.status(500).json({
            message: "Failed to fetch post",
            error: error.message
        });
    }
});


// =====================================================
// CREATE POST
// POST /api/posts
// =====================================================
router.post("/", async (req, res) => {
    try {
        const {
            campaign_id,
            account_id,
            content,
            media_url,
            scheduled_time,
            status
        } = req.body;


        // -------------------------------------------------
        // Validate content
        // -------------------------------------------------
        if (!content || !content.trim()) {
            return res.status(400).json({
                message: "Post content is required"
            });
        }


        // -------------------------------------------------
        // Validate campaign
        // -------------------------------------------------
        if (
            campaign_id === undefined ||
            campaign_id === null ||
            campaign_id === ""
        ) {
            return res.status(400).json({
                message: "Please select a campaign"
            });
        }

        const campaignId = Number(campaign_id);

        if (!Number.isInteger(campaignId) || campaignId <= 0) {
            return res.status(400).json({
                message: "Invalid campaign_id"
            });
        }


        // -------------------------------------------------
        // Validate social account
        // -------------------------------------------------
        if (
            account_id === undefined ||
            account_id === null ||
            account_id === ""
        ) {
            return res.status(400).json({
                message: "Please select a social account"
            });
        }

        const accountId = Number(account_id);

        if (!Number.isInteger(accountId) || accountId <= 0) {
            return res.status(400).json({
                message: "Invalid account_id"
            });
        }


        // -------------------------------------------------
        // Check campaign exists
        // -------------------------------------------------
        const campaignResult = await pool.query(
            `
            SELECT
                campaign_id,
                user_id,
                campaign_name,
                status
            FROM campaigns
            WHERE campaign_id = $1
            `,
            [campaignId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        const campaign = campaignResult.rows[0];


        // -------------------------------------------------
        // Check social account exists
        // -------------------------------------------------
        const accountResult = await pool.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username
            FROM social_accounts
            WHERE account_id = $1
            `,
            [accountId]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        const account = accountResult.rows[0];


        // -------------------------------------------------
        // Check that campaign and account belong
        // to the same user
        // -------------------------------------------------
        if (campaign.user_id !== account.user_id) {
            return res.status(403).json({
                message:
                    "The selected campaign and social account belong to different users"
            });
        }


        // -------------------------------------------------
        // Get logged-in user
        //
        // Your JWT middleware should provide:
        // req.user.user_id
        // -------------------------------------------------
        let loggedInUserId = null;

        if (req.user && req.user.user_id) {
            loggedInUserId = Number(req.user.user_id);
        }


        // -------------------------------------------------
        // If authentication information is available,
        // make sure campaign belongs to logged-in user
        // -------------------------------------------------
        if (
            loggedInUserId !== null &&
            campaign.user_id !== loggedInUserId
        ) {
            return res.status(403).json({
                message:
                    "You cannot create a post for another user's campaign"
            });
        }


        // -------------------------------------------------
        // If authentication information is available,
        // make sure account belongs to logged-in user
        // -------------------------------------------------
        if (
            loggedInUserId !== null &&
            account.user_id !== loggedInUserId
        ) {
            return res.status(403).json({
                message:
                    "You cannot use another user's social account"
            });
        }


        // -------------------------------------------------
        // Validate status
        // -------------------------------------------------
        const allowedStatuses = [
            "draft",
            "scheduled",
            "published",
            "failed",
            "cancelled"
        ];

        const postStatus = status || "scheduled";

        if (!allowedStatuses.includes(postStatus)) {
            return res.status(400).json({
                message: "Invalid post status",
                allowed_statuses: allowedStatuses
            });
        }


        // -------------------------------------------------
        // Create post
        // -------------------------------------------------
        const result = await pool.query(
            `
            INSERT INTO posts
            (
                campaign_id,
                account_id,
                content,
                media_url,
                scheduled_time,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6)

            RETURNING
                post_id,
                campaign_id,
                account_id,
                content,
                media_url,
                scheduled_time,
                status,
                created_at
            `,
            [
                campaignId,
                accountId,
                content.trim(),
                media_url || null,
                scheduled_time || null,
                postStatus
            ]
        );


        // -------------------------------------------------
        // Send complete post information
        // -------------------------------------------------
        const createdPost = result.rows[0];

        res.status(201).json({
            message: "Post created successfully",

            post: {
                ...createdPost,
                campaign_name: campaign.campaign_name,
                platform: account.platform,
                username: account.username
            }
        });

    } catch (error) {
        console.error("POST /api/posts error:", error);

        res.status(500).json({
            message: "Failed to create post",
            error: error.message
        });
    }
});


// =====================================================
// UPDATE POST
// PUT /api/posts/:id
// =====================================================
router.put("/:id", async (req, res) => {
    try {
        const postId = Number(req.params.id);

        if (!Number.isInteger(postId) || postId <= 0) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }

        const {
            campaign_id,
            account_id,
            content,
            media_url,
            scheduled_time,
            status
        } = req.body;


        // -------------------------------------------------
        // Find existing post
        // -------------------------------------------------
        const existing = await pool.query(
            `
            SELECT *
            FROM posts
            WHERE post_id = $1
            `,
            [postId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const current = existing.rows[0];


        // -------------------------------------------------
        // Use old values when fields are not supplied
        // -------------------------------------------------
        const updatedCampaignId =
            campaign_id !== undefined
                ? Number(campaign_id)
                : current.campaign_id;

        const updatedAccountId =
            account_id !== undefined
                ? Number(account_id)
                : current.account_id;

        const updatedContent =
            content !== undefined
                ? content
                : current.content;

        const updatedMediaUrl =
            media_url !== undefined
                ? media_url
                : current.media_url;

        const updatedScheduledTime =
            scheduled_time !== undefined
                ? scheduled_time
                : current.scheduled_time;

        const updatedStatus =
            status !== undefined
                ? status
                : current.status;


        // -------------------------------------------------
        // Validate campaign
        // -------------------------------------------------
        if (
            !Number.isInteger(updatedCampaignId) ||
            updatedCampaignId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid campaign_id"
            });
        }


        // -------------------------------------------------
        // Validate account
        // -------------------------------------------------
        if (
            !Number.isInteger(updatedAccountId) ||
            updatedAccountId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid account_id"
            });
        }


        // -------------------------------------------------
        // Validate content
        // -------------------------------------------------
        if (!updatedContent || !updatedContent.trim()) {
            return res.status(400).json({
                message: "Post content is required"
            });
        }


        // -------------------------------------------------
        // Validate status
        // -------------------------------------------------
        const allowedStatuses = [
            "draft",
            "scheduled",
            "published",
            "failed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(updatedStatus)) {
            return res.status(400).json({
                message: "Invalid post status",
                allowed_statuses: allowedStatuses
            });
        }


        // -------------------------------------------------
        // Check campaign
        // -------------------------------------------------
        const campaignResult = await pool.query(
            `
            SELECT
                campaign_id,
                user_id,
                campaign_name
            FROM campaigns
            WHERE campaign_id = $1
            `,
            [updatedCampaignId]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        const campaign = campaignResult.rows[0];


        // -------------------------------------------------
        // Check social account
        // -------------------------------------------------
        const accountResult = await pool.query(
            `
            SELECT
                account_id,
                user_id,
                platform,
                username
            FROM social_accounts
            WHERE account_id = $1
            `,
            [updatedAccountId]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        const account = accountResult.rows[0];


        // -------------------------------------------------
        // Make sure campaign and account belong
        // to the same user
        // -------------------------------------------------
        if (campaign.user_id !== account.user_id) {
            return res.status(403).json({
                message:
                    "Campaign and social account belong to different users"
            });
        }


        // -------------------------------------------------
        // Check logged-in user if JWT exists
        // -------------------------------------------------
        if (req.user && req.user.user_id) {
            const loggedInUserId = Number(req.user.user_id);

            if (campaign.user_id !== loggedInUserId) {
                return res.status(403).json({
                    message:
                        "You cannot update another user's post"
                });
            }

            if (account.user_id !== loggedInUserId) {
                return res.status(403).json({
                    message:
                        "You cannot use another user's social account"
                });
            }
        }


        // -------------------------------------------------
        // Update post
        // -------------------------------------------------
        const result = await pool.query(
            `
            UPDATE posts
            SET
                campaign_id = $1,
                account_id = $2,
                content = $3,
                media_url = $4,
                scheduled_time = $5,
                status = $6

            WHERE post_id = $7

            RETURNING
                post_id,
                campaign_id,
                account_id,
                content,
                media_url,
                scheduled_time,
                status,
                created_at
            `,
            [
                updatedCampaignId,
                updatedAccountId,
                updatedContent.trim(),
                updatedMediaUrl || null,
                updatedScheduledTime || null,
                updatedStatus,
                postId
            ]
        );


        res.json({
            message: "Post updated successfully",

            post: {
                ...result.rows[0],
                campaign_name: campaign.campaign_name,
                platform: account.platform,
                username: account.username
            }
        });

    } catch (error) {
        console.error("PUT /api/posts/:id error:", error);

        res.status(500).json({
            message: "Failed to update post",
            error: error.message
        });
    }
});


// =====================================================
// DELETE POST
// DELETE /api/posts/:id
// =====================================================
router.delete("/:id", async (req, res) => {
    try {
        const postId = Number(req.params.id);

        if (!Number.isInteger(postId) || postId <= 0) {
            return res.status(400).json({
                message: "Invalid post ID"
            });
        }


        // -------------------------------------------------
        // Check post exists and get owner
        // -------------------------------------------------
        const postResult = await pool.query(
            `
            SELECT
                p.post_id,
                c.user_id
            FROM posts p

            LEFT JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            WHERE p.post_id = $1
            `,
            [postId]
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }


        // -------------------------------------------------
        // Check logged-in user
        // -------------------------------------------------
        if (req.user && req.user.user_id) {
            const loggedInUserId = Number(req.user.user_id);
            const postOwnerId = Number(postResult.rows[0].user_id);

            if (postOwnerId !== loggedInUserId) {
                return res.status(403).json({
                    message:
                        "You cannot delete another user's post"
                });
            }
        }


        // -------------------------------------------------
        // Delete post
        // -------------------------------------------------
        const result = await pool.query(
            `
            DELETE FROM posts
            WHERE post_id = $1
            RETURNING post_id
            `,
            [postId]
        );


        res.json({
            message: "Post deleted successfully",
            post_id: result.rows[0].post_id
        });

    } catch (error) {
        console.error("DELETE /api/posts/:id error:", error);


        // -------------------------------------------------
        // Foreign key dependency
        // -------------------------------------------------
        if (error.code === "23503") {
            return res.status(409).json({
                message:
                    "Cannot delete this post because it is used by scheduled posts, publishing queue, recurring posts, or publishing logs.",
                error: error.detail
            });
        }


        res.status(500).json({
            message: "Failed to delete post",
            error: error.message
        });
    }
});


module.exports = router;