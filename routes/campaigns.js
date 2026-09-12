const express = require("express");

const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// =====================================================
// CREATE CAMPAIGN
// =====================================================

router.post("/", authenticateToken, async (req, res) => {
    try {

        const {
            campaign_name,
            description,
            status,
            start_date,
            end_date
        } = req.body;


        // Validate campaign name
        if (!campaign_name || !campaign_name.trim()) {
            return res.status(400).json({
                message: "Campaign name is required"
            });
        }


        // Validate status
        const allowedStatuses = [
            "draft",
            "active",
            "completed"
        ];

        const campaignStatus = status || "draft";

        if (!allowedStatuses.includes(campaignStatus)) {
            return res.status(400).json({
                message: "Invalid campaign status"
            });
        }


        const result = await pool.query(
            `INSERT INTO campaigns
            (
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.user_id,
                campaign_name.trim(),
                description || null,
                campaignStatus,
                start_date || null,
                end_date || null
            ]
        );


        res.status(201).json({
            message: "Campaign created successfully",
            campaign: result.rows[0]
        });

    } catch (error) {

        console.error(
            "CREATE CAMPAIGN ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to create campaign",
            error: error.message
        });
    }
});


// =====================================================
// GET ALL MY CAMPAIGNS
// =====================================================

router.get("/", authenticateToken, async (req, res) => {
    try {

        const result = await pool.query(
            `SELECT *
             FROM campaigns
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [
                req.user.user_id
            ]
        );


        res.json({
            campaigns: result.rows
        });

    } catch (error) {

        console.error(
            "GET CAMPAIGNS ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch campaigns",
            error: error.message
        });
    }
});


// =====================================================
// GET ONE CAMPAIGN
// =====================================================

router.get("/:id", authenticateToken, async (req, res) => {
    try {

        const {
            id
        } = req.params;


        const result = await pool.query(
            `SELECT *
             FROM campaigns
             WHERE campaign_id = $1
             AND user_id = $2`,
            [
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
            campaign: result.rows[0]
        });

    } catch (error) {

        console.error(
            "GET CAMPAIGN ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch campaign",
            error: error.message
        });
    }
});


// =====================================================
// UPDATE CAMPAIGN
// =====================================================

router.put("/:id", authenticateToken, async (req, res) => {
    try {

        const {
            id
        } = req.params;


        const {
            campaign_name,
            description,
            status,
            start_date,
            end_date
        } = req.body;


        // Validate status if provided
        const allowedStatuses = [
            "draft",
            "active",
            "completed"
        ];

        if (
            status &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid campaign status"
            });
        }


        const result = await pool.query(
            `UPDATE campaigns
             SET
                campaign_name = COALESCE($1, campaign_name),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date)
             WHERE campaign_id = $6
             AND user_id = $7
             RETURNING *`,
            [
                campaign_name
                    ? campaign_name.trim()
                    : null,
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

        console.error(
            "UPDATE CAMPAIGN ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to update campaign",
            error: error.message
        });
    }
});


// =====================================================
// DELETE CAMPAIGN
// =====================================================
//
// Deletion order:
//
// publishing_logs
//        ↓
// publishing_queue
//        ↓
// scheduled_posts
//        ↓
// posts
//        ↓
// campaigns
//
// This order respects the PostgreSQL foreign keys.
//
// =====================================================

router.delete("/:id", authenticateToken, async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            id
        } = req.params;


        // Start transaction
        await client.query("BEGIN");


        // -------------------------------------------------
        // 1. Check campaign belongs to logged-in user
        // -------------------------------------------------

        const campaignResult = await client.query(
            `SELECT *
             FROM campaigns
             WHERE campaign_id = $1
             AND user_id = $2`,
            [
                id,
                req.user.user_id
            ]
        );


        if (campaignResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Campaign not found"
            });
        }


        // -------------------------------------------------
        // 2. Find all posts belonging to campaign
        // -------------------------------------------------

        const postsResult = await client.query(
            `SELECT post_id
             FROM posts
             WHERE campaign_id = $1`,
            [
                id
            ]
        );


        const postIds = postsResult.rows.map(
            row => row.post_id
        );


        let deletedLogs = 0;
        let deletedQueueItems = 0;
        let deletedScheduledPosts = 0;
        let deletedPosts = 0;


        // -------------------------------------------------
        // 3. Delete publishing logs
        // -------------------------------------------------
        //
        // publishing_logs.queue_id references publishing_queue
        // publishing_logs.post_id references posts
        //
        // Therefore logs must be deleted first.
        // -------------------------------------------------

        if (postIds.length > 0) {

            const logsResult = await client.query(
                `DELETE FROM publishing_logs
                 WHERE post_id = ANY($1::int[])
                 RETURNING log_id`,
                [
                    postIds
                ]
            );

            deletedLogs = logsResult.rowCount;
        }


        // -------------------------------------------------
        // 4. Delete publishing queue entries
        // -------------------------------------------------
        //
        // publishing_queue.post_id references posts.
        // Therefore queue entries must be deleted before posts.
        // -------------------------------------------------

        if (postIds.length > 0) {

            const queueResult = await client.query(
                `DELETE FROM publishing_queue
                 WHERE post_id = ANY($1::int[])
                 RETURNING queue_id`,
                [
                    postIds
                ]
            );

            deletedQueueItems = queueResult.rowCount;
        }


        // -------------------------------------------------
        // 5. Delete scheduled posts
        // -------------------------------------------------

        if (postIds.length > 0) {

            const scheduledResult = await client.query(
                `DELETE FROM scheduled_posts
                 WHERE post_id = ANY($1::int[])
                 RETURNING schedule_id`,
                [
                    postIds
                ]
            );

            deletedScheduledPosts = scheduledResult.rowCount;
        }


        // -------------------------------------------------
        // 6. Delete posts
        // -------------------------------------------------

        if (postIds.length > 0) {

            const postsDeleteResult = await client.query(
                `DELETE FROM posts
                 WHERE campaign_id = $1
                 RETURNING post_id`,
                [
                    id
                ]
            );

            deletedPosts = postsDeleteResult.rowCount;
        }


        // -------------------------------------------------
        // 7. Delete campaign
        // -------------------------------------------------

        const deleteCampaignResult = await client.query(
            `DELETE FROM campaigns
             WHERE campaign_id = $1
             AND user_id = $2
             RETURNING *`,
            [
                id,
                req.user.user_id
            ]
        );


        // -------------------------------------------------
        // 8. Commit transaction
        // -------------------------------------------------

        await client.query("COMMIT");


        // -------------------------------------------------
        // 9. Send response
        // -------------------------------------------------

        res.json({
            message: "Campaign and related records deleted successfully",

            campaign: deleteCampaignResult.rows[0],

            deleted_posts: deletedPosts,

            deleted_scheduled_posts: deletedScheduledPosts,

            deleted_queue_items: deletedQueueItems,

            deleted_publishing_logs: deletedLogs
        });


    } catch (error) {

        // Rollback if anything fails
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "ROLLBACK ERROR:",
                rollbackError
            );
        }


        console.error(
            "DELETE CAMPAIGN ERROR:",
            error
        );


        res.status(500).json({
            message: "Failed to delete campaign",
            error: error.message
        });


    } finally {

        client.release();

    }
});


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;

