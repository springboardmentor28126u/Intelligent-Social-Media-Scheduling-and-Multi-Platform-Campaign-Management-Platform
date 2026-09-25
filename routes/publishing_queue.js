const express = require("express");
const router = express.Router();

const pool = require("../config/db");

// =====================================================
// ALLOWED QUEUE STATUSES
// =====================================================

const ALLOWED_STATUSES = [
    "pending",
    "processing",
    "published",
    "failed",
    "cancelled"
];

// =====================================================
// GET ALL PUBLISHING QUEUE ITEMS
// =====================================================
// GET /api/queue
// GET /api/publishing-queue
// =====================================================

router.get("/", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                pq.queue_id,
                pq.post_id,
                pq.platform,
                pq.scheduled_time,
                pq.status,
                pq.priority,
                pq.retry_count,
                pq.created_at,
                p.content
            FROM publishing_queue pq
            LEFT JOIN posts p
                ON pq.post_id = p.post_id
            ORDER BY
                pq.scheduled_time ASC,
                pq.priority DESC,
                pq.queue_id ASC
        `);

        res.status(200).json(result.rows);

    } catch (error) {

        console.error(
            "Error fetching publishing queue:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch publishing queue",

            error:
                error.message

        });
    }
});

// =====================================================
// GET QUEUE ITEM BY ID
// =====================================================
// GET /api/queue/:id
// GET /api/publishing-queue/:id
// =====================================================

router.get("/:id", async (req, res) => {

    try {

        const queueId = Number(req.params.id);

        // Validate ID
        if (!Number.isInteger(queueId) || queueId <= 0) {

            return res.status(400).json({

                message:
                    "Invalid queue ID"

            });
        }

        const result = await pool.query(
            `
            SELECT
                pq.queue_id,
                pq.post_id,
                pq.platform,
                pq.scheduled_time,
                pq.status,
                pq.priority,
                pq.retry_count,
                pq.created_at,
                p.content
            FROM publishing_queue pq
            LEFT JOIN posts p
                ON pq.post_id = p.post_id
            WHERE pq.queue_id = $1
            `,
            [queueId]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Queue item not found"

            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {

        console.error(
            "Error fetching queue item:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch queue item",

            error:
                error.message

        });
    }
});

// =====================================================
// ADD POST TO PUBLISHING QUEUE
// =====================================================
// POST /api/queue
// POST /api/publishing-queue
//
// Body:
// {
//     "post_id": 1,
//     "platform": "Instagram",
//     "scheduled_time": "2026-09-24T10:00:00",
//     "priority": 1
// }
// =====================================================

router.post("/", async (req, res) => {

    try {

        const {
            post_id,
            platform,
            scheduled_time,
            priority = 1
        } = req.body;

        // -------------------------------------------------
        // BASIC VALIDATION
        // -------------------------------------------------

        if (
            post_id === undefined ||
            post_id === null ||
            !platform ||
            !scheduled_time
        ) {

            return res.status(400).json({

                message:
                    "post_id, platform and scheduled_time are required"

            });
        }

        // -------------------------------------------------
        // VALIDATE POST ID
        // -------------------------------------------------

        const postIdNumber = Number(post_id);

        if (
            !Number.isInteger(postIdNumber) ||
            postIdNumber <= 0
        ) {

            return res.status(400).json({

                message:
                    "post_id must be a valid positive number"

            });
        }

        // -------------------------------------------------
        // VALIDATE PLATFORM
        // -------------------------------------------------

        const cleanPlatform = String(platform).trim();

        if (cleanPlatform.length === 0) {

            return res.status(400).json({

                message:
                    "Platform cannot be empty"

            });
        }

        // -------------------------------------------------
        // VALIDATE SCHEDULED TIME
        // -------------------------------------------------

        const scheduledDate = new Date(scheduled_time);

        if (Number.isNaN(scheduledDate.getTime())) {

            return res.status(400).json({

                message:
                    "scheduled_time must be a valid date and time"

            });
        }

        // -------------------------------------------------
        // VALIDATE PRIORITY
        // -------------------------------------------------

        const priorityNumber = Number(priority);

        if (
            !Number.isInteger(priorityNumber) ||
            priorityNumber < 1
        ) {

            return res.status(400).json({

                message:
                    "priority must be a positive integer"

            });
        }

        // -------------------------------------------------
        // CHECK WHETHER POST EXISTS
        // -------------------------------------------------

        const postCheck = await pool.query(
            `
            SELECT
                post_id
            FROM posts
            WHERE post_id = $1
            `,
            [postIdNumber]
        );

        if (postCheck.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Post not found"

            });
        }

        // -------------------------------------------------
        // CHECK DUPLICATE QUEUE ITEM
        // -------------------------------------------------

        const existing = await pool.query(
            `
            SELECT
                queue_id,
                post_id,
                platform,
                scheduled_time,
                status
            FROM publishing_queue
            WHERE post_id = $1
              AND platform = $2
              AND status IN ('pending', 'processing')
            LIMIT 1
            `,
            [
                postIdNumber,
                cleanPlatform
            ]
        );

        if (existing.rows.length > 0) {

            return res.status(409).json({

                message:
                    "This post is already in the publishing queue",

                queue_id:
                    existing.rows[0].queue_id,

                queue:
                    existing.rows[0]

            });
        }

        // -------------------------------------------------
        // INSERT INTO QUEUE
        // -------------------------------------------------

        const result = await pool.query(
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
            RETURNING
                queue_id,
                post_id,
                platform,
                scheduled_time,
                status,
                priority,
                retry_count,
                created_at
            `,
            [
                postIdNumber,
                cleanPlatform,
                scheduledDate,
                priorityNumber
            ]
        );

        // -------------------------------------------------
        // SUCCESS RESPONSE
        // -------------------------------------------------

        res.status(201).json({

            message:
                "Post added to publishing queue",

            queue:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Error adding post to publishing queue:",
            error
        );

        res.status(500).json({

            message:
                "Failed to add post to publishing queue",

            error:
                error.message

        });
    }
});

// =====================================================
// UPDATE QUEUE STATUS / PRIORITY
// =====================================================
// PUT /api/queue/:id
// PUT /api/publishing-queue/:id
//
// Body examples:
//
// {
//     "status": "processing"
// }
//
// OR
//
// {
//     "status": "pending",
//     "priority": 2
// }
// =====================================================

router.put("/:id", async (req, res) => {

    try {

        const queueId = Number(req.params.id);

        // -------------------------------------------------
        // VALIDATE QUEUE ID
        // -------------------------------------------------

        if (
            !Number.isInteger(queueId) ||
            queueId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid queue ID"

            });
        }

        const {
            status,
            priority
        } = req.body;

        // -------------------------------------------------
        // VALIDATE STATUS
        // -------------------------------------------------

        let cleanStatus = null;

        if (
            status !== undefined &&
            status !== null &&
            status !== ""
        ) {

            cleanStatus = String(status)
                .trim()
                .toLowerCase();

            if (!ALLOWED_STATUSES.includes(cleanStatus)) {

                return res.status(400).json({

                    message:
                        "Invalid queue status",

                    allowed_statuses:
                        ALLOWED_STATUSES

                });
            }
        }

        // -------------------------------------------------
        // VALIDATE PRIORITY
        // -------------------------------------------------

        let priorityNumber = null;

        if (
            priority !== undefined &&
            priority !== null &&
            priority !== ""
        ) {

            priorityNumber = Number(priority);

            if (
                !Number.isInteger(priorityNumber) ||
                priorityNumber < 1
            ) {

                return res.status(400).json({

                    message:
                        "Priority must be a positive integer"

                });
            }
        }

        // -------------------------------------------------
        // CHECK THAT AT LEAST ONE FIELD IS PROVIDED
        // -------------------------------------------------

        if (
            cleanStatus === null &&
            priorityNumber === null
        ) {

            return res.status(400).json({

                message:
                    "Provide status or priority to update"

            });
        }

        // -------------------------------------------------
        // UPDATE QUEUE ITEM
        // -------------------------------------------------

        const result = await pool.query(
            `
            UPDATE publishing_queue
            SET
                status =
                    COALESCE($1, status),

                priority =
                    COALESCE($2, priority)

            WHERE queue_id = $3

            RETURNING
                queue_id,
                post_id,
                platform,
                scheduled_time,
                status,
                priority,
                retry_count,
                created_at
            `,
            [
                cleanStatus,
                priorityNumber,
                queueId
            ]
        );

        // -------------------------------------------------
        // QUEUE ITEM NOT FOUND
        // -------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Queue item not found"

            });
        }

        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        res.status(200).json({

            message:
                "Publishing queue updated",

            queue:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Error updating publishing queue:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update publishing queue",

            error:
                error.message

        });
    }
});

// =====================================================
// DELETE QUEUE ITEM
// =====================================================
// DELETE /api/queue/:id
// DELETE /api/publishing-queue/:id
// =====================================================

router.delete("/:id", async (req, res) => {

    try {

        const queueId = Number(req.params.id);

        // -------------------------------------------------
        // VALIDATE QUEUE ID
        // -------------------------------------------------

        if (
            !Number.isInteger(queueId) ||
            queueId <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid queue ID"

            });
        }

        // -------------------------------------------------
        // DELETE QUEUE ITEM
        // -------------------------------------------------

        const result = await pool.query(
            `
            DELETE FROM publishing_queue
            WHERE queue_id = $1
            RETURNING
                queue_id,
                post_id,
                platform,
                scheduled_time,
                status,
                priority,
                retry_count,
                created_at
            `,
            [queueId]
        );

        // -------------------------------------------------
        // NOT FOUND
        // -------------------------------------------------

        if (result.rows.length === 0) {

            return res.status(404).json({

                message:
                    "Queue item not found"

            });
        }

        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        res.status(200).json({

            message:
                "Queue item deleted successfully",

            queue:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "Error deleting publishing queue:",
            error
        );

        // -------------------------------------------------
        // FOREIGN KEY ERROR
        // -------------------------------------------------

        if (error.code === "23503") {

            return res.status(409).json({

                message:
                    "Queue item cannot be deleted because it is referenced by another record",

                error:
                    error.message

            });
        }

        // -------------------------------------------------
        // GENERAL ERROR
        // -------------------------------------------------

        res.status(500).json({

            message:
                "Failed to delete publishing queue item",

            error:
                error.message

        });
    }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;