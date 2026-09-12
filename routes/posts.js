const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

/*
=========================================================
POST ROUTES
=========================================================

Supported operations:

1. GET    /api/posts
2. GET    /api/posts/:id
3. POST   /api/posts
4. PUT    /api/posts/:id
5. DELETE /api/posts/:id

6. POST   /api/posts/:id/draft
7. POST   /api/posts/:id/schedule
8. POST   /api/posts/:id/publish

Database tables used:

posts
social_accounts
scheduled_posts
publishing_queue
publishing_logs
recurring_posts

Publishing flow:

POST
 ↓
scheduled_posts
 ↓
publishing_queue
 ↓
queueProcessor.js
 ↓
publishing_logs
 ↓
published
=========================================================
*/


/* =====================================================
   GET ALL POSTS
   ===================================================== */

router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.status,
                p.created_at,

                sa.platform,
                sa.username

            FROM posts p

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            ORDER BY p.post_id DESC
            `
        );

        res.json(result.rows);

    } catch (error) {
        console.error("GET POSTS ERROR:", error.message);

        res.status(500).json({
            error: "Failed to fetch posts",
            details: error.message
        });
    }
});


/* =====================================================
   GET SINGLE POST
   ===================================================== */

router.get("/:id", authenticateToken, async (req, res) => {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT
                p.post_id,
                p.campaign_id,
                p.account_id,
                p.content,
                p.media_url,
                p.status,
                p.created_at,

                sa.platform,
                sa.username

            FROM posts p

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE p.post_id = $1
            `,
            [postId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Post not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("GET POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to fetch post",
            details: error.message
        });
    }
});


/* =====================================================
   CREATE POST
   ===================================================== */

router.post("/", authenticateToken, async (req, res) => {

    const {
        campaign_id,
        account_id,
        content,
        media_url
    } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({
            error: "Post content is required"
        });
    }

    if (!account_id) {
        return res.status(400).json({
            error: "Social account is required"
        });
    }

    const accountId = Number(account_id);

    if (!Number.isInteger(accountId) || accountId <= 0) {
        return res.status(400).json({
            error: "Invalid account ID"
        });
    }

    try {

        /* Verify social account */

        const accountResult = await pool.query(
            `
            SELECT
                account_id,
                platform,
                username
            FROM social_accounts
            WHERE account_id = $1
            `,
            [accountId]
        );

        if (accountResult.rows.length === 0) {
            return res.status(400).json({
                error: "Social account not found"
            });
        }


        /* Create post */

        const result = await pool.query(
            `
            INSERT INTO posts
            (
                campaign_id,
                account_id,
                content,
                media_url,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                'draft'
            )
            RETURNING *
            `,
            [
                campaign_id || null,
                accountId,
                content.trim(),
                media_url || null
            ]
        );

        res.status(201).json({
            message: "Post created successfully",
            post: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to create post",
            details: error.message
        });
    }
});


/* =====================================================
   UPDATE POST
   ===================================================== */

router.put("/:id", authenticateToken, async (req, res) => {

    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    const {
        campaign_id,
        account_id,
        content,
        media_url,
        status
    } = req.body;

    try {

        /* Check post */

        const postCheck = await pool.query(
            `
            SELECT *
            FROM posts
            WHERE post_id = $1
            `,
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Post not found"
            });
        }


        /* Validate content */

        if (content !== undefined && (!content || !content.trim())) {
            return res.status(400).json({
                error: "Post content cannot be empty"
            });
        }


        /* Validate account */

        if (account_id !== undefined && account_id !== null) {

            const accountId = Number(account_id);

            if (!Number.isInteger(accountId) || accountId <= 0) {
                return res.status(400).json({
                    error: "Invalid account ID"
                });
            }

            const accountCheck = await pool.query(
                `
                SELECT account_id
                FROM social_accounts
                WHERE account_id = $1
                `,
                [accountId]
            );

            if (accountCheck.rows.length === 0) {
                return res.status(400).json({
                    error: "Social account not found"
                });
            }
        }


        /* Update */

        const result = await pool.query(
            `
            UPDATE posts
            SET
                campaign_id = COALESCE($1, campaign_id),
                account_id = COALESCE($2, account_id),
                content = COALESCE($3, content),
                media_url = COALESCE($4, media_url),
                status = COALESCE($5, status)
            WHERE post_id = $6
            RETURNING *
            `,
            [
                campaign_id !== undefined ? campaign_id : null,
                account_id !== undefined ? account_id : null,
                content !== undefined ? content.trim() : null,
                media_url !== undefined ? media_url : null,
                status !== undefined ? status : null,
                postId
            ]
        );

        res.json({
            message: "Post updated successfully",
            post: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to update post",
            details: error.message
        });
    }
});


/* =====================================================
   DELETE POST
   =====================================================

   IMPORTANT:

   publishing_logs references publishing_queue.

   Therefore deletion order must be:

   publishing_logs
        ↓
   recurring_posts
        ↓
   scheduled_posts
        ↓
   publishing_queue
        ↓
   posts
   ===================================================== */

router.delete("/:id", authenticateToken, async (req, res) => {

    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        /* Check post */

        const postCheck = await client.query(
            `
            SELECT post_id
            FROM posts
            WHERE post_id = $1
            `,
            [postId]
        );

        if (postCheck.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Post not found"
            });
        }


        /* Delete publishing logs first */

        await client.query(
            `
            DELETE FROM publishing_logs
            WHERE post_id = $1
            `,
            [postId]
        );


        /* Delete recurring posts */

        await client.query(
            `
            DELETE FROM recurring_posts
            WHERE post_id = $1
            `,
            [postId]
        );


        /* Delete scheduled posts */

        await client.query(
            `
            DELETE FROM scheduled_posts
            WHERE post_id = $1
            `,
            [postId]
        );


        /* Delete publishing queue */

        await client.query(
            `
            DELETE FROM publishing_queue
            WHERE post_id = $1
            `,
            [postId]
        );


        /* Finally delete post */

        await client.query(
            `
            DELETE FROM posts
            WHERE post_id = $1
            `,
            [postId]
        );


        await client.query("COMMIT");

        res.json({
            message: "Post deleted successfully"
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("DELETE POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to delete post",
            details: error.message
        });

    } finally {
        client.release();
    }
});


/* =====================================================
   SAVE AS DRAFT
   ===================================================== */

router.post("/:id/draft", authenticateToken, async (req, res) => {

    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    try {

        const postCheck = await pool.query(
            `
            SELECT post_id
            FROM posts
            WHERE post_id = $1
            `,
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Post not found"
            });
        }


        /* Cancel pending queue entries */

        await pool.query(
            `
            DELETE FROM publishing_logs
            WHERE queue_id IN
            (
                SELECT queue_id
                FROM publishing_queue
                WHERE post_id = $1
                  AND status IN ('pending', 'failed')
            )
            `,
            [postId]
        );

        await pool.query(
            `
            DELETE FROM publishing_queue
            WHERE post_id = $1
              AND status IN ('pending', 'failed')
            `,
            [postId]
        );


        /* Update scheduled post */

        await pool.query(
            `
            UPDATE scheduled_posts
            SET status = 'cancelled'
            WHERE post_id = $1
              AND status = 'pending'
            `,
            [postId]
        );


        /* Update post */

        const result = await pool.query(
            `
            UPDATE posts
            SET status = 'draft'
            WHERE post_id = $1
            RETURNING *
            `,
            [postId]
        );

        res.json({
            message: "Post saved as draft",
            post: result.rows[0]
        });

    } catch (error) {

        console.error("DRAFT POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to save post as draft",
            details: error.message
        });
    }
});


/* =====================================================
   SCHEDULE POST
   ===================================================== */

router.post("/:id/schedule", authenticateToken, async (req, res) => {

    const postId = Number(req.params.id);

    const {
        scheduled_at,
        priority
    } = req.body;

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    if (!scheduled_at) {
        return res.status(400).json({
            error: "scheduled_at is required"
        });
    }


    const scheduledDate = new Date(scheduled_at);

    if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
            error: "Invalid scheduled_at date"
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        /* Get post and social account */

        const postResult = await client.query(
            `
            SELECT
                p.post_id,
                p.account_id,
                p.content,
                p.status,
                sa.platform,
                sa.username

            FROM posts p

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE p.post_id = $1
            `,
            [postId]
        );

        if (postResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Post not found"
            });
        }

        const post = postResult.rows[0];


        if (!post.account_id) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "No social media account is assigned to this post"
            });
        }


        if (!post.platform) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Social media platform not found for this post"
            });
        }


        /* Prevent scheduling in the past */

        if (scheduledDate.getTime() <= Date.now()) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Scheduled time must be in the future"
            });
        }


        const queuePriority =
            priority !== undefined
                ? Number(priority)
                : 1;

        if (
            !Number.isInteger(queuePriority) ||
            queuePriority < 1
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Priority must be a positive integer"
            });
        }


        /* =================================================
           CHECK DUPLICATE SCHEDULE
           ================================================= */

        const duplicate = await client.query(
            `
            SELECT
                sp.schedule_id
            FROM scheduled_posts sp
            WHERE sp.post_id = $1
              AND sp.scheduled_at = $2
              AND sp.status = 'pending'
            `,
            [postId, scheduled_at]
        );

        if (duplicate.rows.length > 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                error: "This post is already scheduled for this time"
            });
        }


        /* =================================================
           CREATE SCHEDULED POST
           ================================================= */

        const scheduledResult = await client.query(
            `
            INSERT INTO scheduled_posts
            (
                post_id,
                scheduled_at,
                status
            )
            VALUES
            (
                $1,
                $2,
                'pending'
            )
            RETURNING *
            `,
            [
                postId,
                scheduled_at
            ]
        );


        /* =================================================
           CREATE PUBLISHING QUEUE ITEM
           ================================================= */

        const queueResult = await client.query(
            `
            INSERT INTO publishing_queue
            (
                post_id,
                platform,
                scheduled_time,
                status,
                priority,
                retry_count
            )
            VALUES
            (
                $1,
                $2,
                $3,
                'pending',
                $4,
                0
            )
            RETURNING *
            `,
            [
                postId,
                post.platform,
                scheduled_at,
                queuePriority
            ]
        );


        /* =================================================
           UPDATE POST STATUS
           ================================================= */

        const updatedPost = await client.query(
            `
            UPDATE posts
            SET status = 'scheduled'
            WHERE post_id = $1
            RETURNING *
            `,
            [postId]
        );


        await client.query("COMMIT");


        res.status(201).json({
            message: "Post scheduled successfully",

            post: updatedPost.rows[0],

            scheduled_post: scheduledResult.rows[0],

            queue: queueResult.rows[0]
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("SCHEDULE POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to schedule post",
            details: error.message
        });

    } finally {
        client.release();
    }
});


/* =====================================================
   PUBLISH NOW
   =====================================================

   IMPORTANT:

   We DO NOT directly mark the post as published.

   Instead:

   Publish button
        ↓
   queue item with CURRENT_TIMESTAMP
        ↓
   queueProcessor.js
        ↓
   simulated publishing
        ↓
   publishing_logs
        ↓
   post = published
   ===================================================== */

router.post("/:id/publish", authenticateToken, async (req, res) => {

    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID"
        });
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        /* Get post */

        const postResult = await client.query(
            `
            SELECT
                p.post_id,
                p.account_id,
                p.content,
                p.status,
                sa.platform,
                sa.username,
                sa.access_token

            FROM posts p

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE p.post_id = $1
            `,
            [postId]
        );


        if (postResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Post not found"
            });
        }

        const post = postResult.rows[0];


        if (!post.account_id) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "No social media account is assigned to this post"
            });
        }


        if (!post.platform) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Social media platform is missing"
            });
        }


        if (!post.access_token) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                error: `No access token configured for ${post.platform}`
            });
        }


        /* Check whether already queued */

        const existingQueue = await client.query(
            `
            SELECT queue_id
            FROM publishing_queue
            WHERE post_id = $1
              AND status IN ('pending', 'processing')
            LIMIT 1
            `,
            [postId]
        );

        if (existingQueue.rows.length > 0) {

            await client.query("ROLLBACK");

            return res.status(409).json({
                error: "Post is already waiting for publishing",
                queue_id: existingQueue.rows[0].queue_id
            });
        }


        /* =================================================
           CREATE IMMEDIATE QUEUE ITEM
           ================================================= */

        const queueResult = await client.query(
            `
            INSERT INTO publishing_queue
            (
                post_id,
                platform,
                scheduled_time,
                status,
                priority,
                retry_count
            )
            VALUES
            (
                $1,
                $2,
                CURRENT_TIMESTAMP,
                'pending',
                10,
                0
            )
            RETURNING *
            `,
            [
                postId,
                post.platform
            ]
        );


        /* Update post status */

        const updatedPost = await client.query(
            `
            UPDATE posts
            SET status = 'scheduled'
            WHERE post_id = $1
            RETURNING *
            `,
            [postId]
        );


        await client.query("COMMIT");


        res.status(201).json({
            message: "Post added to publishing queue",

            post: updatedPost.rows[0],

            queue: queueResult.rows[0],

            note: "The publishing queue processor will publish this post automatically."
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("PUBLISH POST ERROR:", error.message);

        res.status(500).json({
            error: "Failed to add post to publishing queue",
            details: error.message
        });

    } finally {
        client.release();
    }
});


module.exports = router;