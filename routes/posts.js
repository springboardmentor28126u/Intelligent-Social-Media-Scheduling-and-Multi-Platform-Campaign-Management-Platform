const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// CREATE POST
router.post("/", authenticateToken, async (req, res) => {
    try {
        const {
            campaign_id,
            account_id,
            content,
            media_url,
            scheduled_time
        } = req.body;

        if (!campaign_id || !account_id || !content) {
            return res.status(400).json({
                message: "campaign_id, account_id and content are required"
            });
        }

        // Check campaign belongs to logged-in user
        const campaign = await pool.query(
            `SELECT campaign_id
             FROM campaigns
             WHERE campaign_id = $1 AND user_id = $2`,
            [campaign_id, req.user.user_id]
        );

        if (campaign.rows.length === 0) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        // Check social account belongs to logged-in user
        const account = await pool.query(
            `SELECT account_id
             FROM social_accounts
             WHERE account_id = $1 AND user_id = $2`,
            [account_id, req.user.user_id]
        );

        if (account.rows.length === 0) {
            return res.status(404).json({
                message: "Social account not found"
            });
        }

        const result = await pool.query(
            `INSERT INTO posts
            (campaign_id, account_id, content, media_url, scheduled_time)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                campaign_id,
                account_id,
                content,
                media_url || null,
                scheduled_time || null
            ]
        );

        res.status(201).json({
            message: "Post created successfully",
            post: result.rows[0]
        });

    } catch (error) {
        console.error("POST ERROR:", error);

        res.status(500).json({
            message: "Failed to create post",
            error: error.message
        });
    }
});


// GET MY POSTS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.post_id,
                p.content,
                p.media_url,
                p.scheduled_time,
                p.status,
                c.campaign_name,
                s.platform,
                s.username
             FROM posts p
             JOIN campaigns c
                ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
                ON p.account_id = s.account_id
             WHERE c.user_id = $1
             ORDER BY p.created_at DESC`,
            [req.user.user_id]
        );

        res.json({
            posts: result.rows
        });

    } catch (error) {
        console.error("GET POSTS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch posts",
            error: error.message
        });
    }
});
// GET ONE POST
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.scheduled_time,
                p.status,
                p.created_at,
                c.campaign_name,
                s.platform,
                s.username
             FROM posts p
             JOIN campaigns c
                ON p.campaign_id = c.campaign_id
             JOIN social_accounts s
                ON p.account_id = s.account_id
             WHERE p.post_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.json({
            post: result.rows[0]
        });

    } catch (error) {
        console.error("GET POST ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch post",
            error: error.message
        });
    }
});
// UPDATE POST
router.put("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            campaign_id,
            account_id,
            content,
            media_url,
            scheduled_time,
            status
        } = req.body;

        // Check that the post belongs to the logged-in user
        const existingPost = await pool.query(
            `SELECT p.post_id
             FROM posts p
             JOIN campaigns c
                ON p.campaign_id = c.campaign_id
             WHERE p.post_id = $1
             AND c.user_id = $2`,
            [id, req.user.user_id]
        );

        if (existingPost.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        // If campaign_id is provided, verify it belongs to user
        if (campaign_id) {
            const campaign = await pool.query(
                `SELECT campaign_id
                 FROM campaigns
                 WHERE campaign_id = $1
                 AND user_id = $2`,
                [campaign_id, req.user.user_id]
            );

            if (campaign.rows.length === 0) {
                return res.status(404).json({
                    message: "Campaign not found"
                });
            }
        }

        // If account_id is provided, verify it belongs to user
        if (account_id) {
            const account = await pool.query(
                `SELECT account_id
                 FROM social_accounts
                 WHERE account_id = $1
                 AND user_id = $2`,
                [account_id, req.user.user_id]
            );

            if (account.rows.length === 0) {
                return res.status(404).json({
                    message: "Social account not found"
                });
            }
        }

        const result = await pool.query(
            `UPDATE posts
             SET campaign_id = COALESCE($1, campaign_id),
                 account_id = COALESCE($2, account_id),
                 content = COALESCE($3, content),
                 media_url = COALESCE($4, media_url),
                 scheduled_time = COALESCE($5, scheduled_time),
                 status = COALESCE($6, status)
             WHERE post_id = $7
             RETURNING *`,
            [
                campaign_id,
                account_id,
                content,
                media_url,
                scheduled_time,
                status,
                id
            ]
        );

        res.json({
            message: "Post updated successfully",
            post: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE POST ERROR:", error);

        res.status(500).json({
            message: "Failed to update post",
            error: error.message
        });
    }
});
// DELETE POST
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM posts
             WHERE post_id = $1
             AND campaign_id IN (
                 SELECT campaign_id
                 FROM campaigns
                 WHERE user_id = $2
             )
             RETURNING *`,
            [id, req.user.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.json({
            message: "Post deleted successfully",
            post: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE POST ERROR:", error);

        res.status(500).json({
            message: "Failed to delete post",
            error: error.message
        });
    }
});

module.exports = router;