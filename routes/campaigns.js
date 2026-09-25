const express = require("express");
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// =====================================================
// ALLOWED CAMPAIGN STATUSES
// =====================================================

const allowedStatuses = [
    "draft",
    "active",
    "completed"
];


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


        // -------------------------------------------------
        // Validate campaign name
        // -------------------------------------------------

        if (!campaign_name || !campaign_name.trim()) {
            return res.status(400).json({
                message: "Campaign name is required"
            });
        }


        // -------------------------------------------------
        // Validate status
        // -------------------------------------------------

        const campaignStatus = status || "draft";

        if (!allowedStatuses.includes(campaignStatus)) {
            return res.status(400).json({
                message: "Invalid campaign status"
            });
        }


        // -------------------------------------------------
        // Validate start date and end date
        // -------------------------------------------------

        if (!start_date) {
            return res.status(400).json({
                message: "Start date is required"
            });
        }

        if (!end_date) {
            return res.status(400).json({
                message: "End date is required"
            });
        }


        // -------------------------------------------------
        // Check date order
        // -------------------------------------------------

        if (new Date(end_date) < new Date(start_date)) {
            return res.status(400).json({
                message: "End date cannot be before start date"
            });
        }


        // -------------------------------------------------
        // Insert campaign
        // -------------------------------------------------

        const result = await pool.query(
            `
            INSERT INTO campaigns
            (
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                campaign_id,
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date,
                created_at
            `,
            [
                req.user.user_id,
                campaign_name.trim(),
                description || null,
                campaignStatus,
                start_date,
                end_date
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
            `
            SELECT
                campaign_id,
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date,
                created_at
            FROM campaigns
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
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
            `
            SELECT
                campaign_id,
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date,
                created_at
            FROM campaigns
            WHERE campaign_id = $1
            AND user_id = $2
            `,
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


        // -------------------------------------------------
        // Validate status
        // -------------------------------------------------

        if (
            status &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid campaign status"
            });
        }


        // -------------------------------------------------
        // Get existing campaign
        // -------------------------------------------------

        const existingCampaign = await pool.query(
            `
            SELECT
                campaign_name,
                description,
                status,
                start_date,
                end_date
            FROM campaigns
            WHERE campaign_id = $1
            AND user_id = $2
            `,
            [
                id,
                req.user.user_id
            ]
        );


        if (existingCampaign.rows.length === 0) {

            return res.status(404).json({
                message: "Campaign not found"
            });

        }


        const oldCampaign = existingCampaign.rows[0];


        // -------------------------------------------------
        // Use old values if new values are not provided
        // -------------------------------------------------

        const newCampaignName =
            campaign_name !== undefined
                ? campaign_name.trim()
                : oldCampaign.campaign_name;

        const newDescription =
            description !== undefined
                ? description
                : oldCampaign.description;

        const newStatus =
            status !== undefined
                ? status
                : oldCampaign.status;

        const newStartDate =
            start_date !== undefined
                ? start_date
                : oldCampaign.start_date;

        const newEndDate =
            end_date !== undefined
                ? end_date
                : oldCampaign.end_date;


        // -------------------------------------------------
        // Validate campaign name
        // -------------------------------------------------

        if (!newCampaignName) {

            return res.status(400).json({
                message: "Campaign name is required"
            });

        }


        // -------------------------------------------------
        // Validate dates
        // -------------------------------------------------

        if (
            newStartDate &&
            newEndDate &&
            new Date(newEndDate) < new Date(newStartDate)
        ) {

            return res.status(400).json({
                message: "End date cannot be before start date"
            });

        }


        // -------------------------------------------------
        // Update campaign
        // -------------------------------------------------

        const result = await pool.query(
            `
            UPDATE campaigns
            SET
                campaign_name = $1,
                description = $2,
                status = $3,
                start_date = $4,
                end_date = $5
            WHERE campaign_id = $6
            AND user_id = $7
            RETURNING
                campaign_id,
                user_id,
                campaign_name,
                description,
                status,
                start_date,
                end_date,
                created_at
            `,
            [
                newCampaignName,
                newDescription,
                newStatus,
                newStartDate,
                newEndDate,
                id,
                req.user.user_id
            ]
        );


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
// =====================================================

router.delete("/:id", authenticateToken, async (req, res) => {

    const client = await pool.connect();

    try {

        const {
            id
        } = req.params;


        // -------------------------------------------------
        // Start transaction
        // -------------------------------------------------

        await client.query("BEGIN");


        // -------------------------------------------------
        // 1. Check campaign belongs to logged-in user
        // -------------------------------------------------

        const campaignResult = await client.query(
            `
            SELECT *
            FROM campaigns
            WHERE campaign_id = $1
            AND user_id = $2
            `,
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
            `
            SELECT post_id
            FROM posts
            WHERE campaign_id = $1
            `,
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

        if (postIds.length > 0) {

            const logsResult = await client.query(
                `
                DELETE FROM publishing_logs
                WHERE post_id = ANY($1::int[])
                RETURNING log_id
                `,
                [
                    postIds
                ]
            );

            deletedLogs = logsResult.rowCount;
        }


        // -------------------------------------------------
        // 4. Delete publishing queue entries
        // -------------------------------------------------

        if (postIds.length > 0) {

            const queueResult = await client.query(
                `
                DELETE FROM publishing_queue
                WHERE post_id = ANY($1::int[])
                RETURNING queue_id
                `,
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
                `
                DELETE FROM scheduled_posts
                WHERE post_id = ANY($1::int[])
                RETURNING schedule_id
                `,
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
                `
                DELETE FROM posts
                WHERE campaign_id = $1
                RETURNING post_id
                `,
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
            `
            DELETE FROM campaigns
            WHERE campaign_id = $1
            AND user_id = $2
            RETURNING *
            `,
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

        // -------------------------------------------------
        // Rollback if anything fails
        // -------------------------------------------------

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