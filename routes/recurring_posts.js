const express = require("express");

const router = express.Router();

const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");


/*
=========================================================
RECURRING POSTS ROUTES
=========================================================

Milestone 2:

1. Create recurring posts
2. View recurring posts
3. View one recurring post
4. Update recurring posts
5. Pause recurring posts
6. Resume recurring posts
7. Change recurring status
8. Delete recurring posts
9. Validate ownership
10. Initialize next_run
11. Support daily, weekly and monthly schedules

Flow:

POST /api/recurring-posts
        ↓
recurring_posts
        ↓
next_run
        ↓
publishing_queue
        ↓
queueProcessor
        ↓
published
=========================================================
*/


/*
=========================================================
SUPPORTED VALUES
=========================================================
*/

const ALLOWED_FREQUENCIES = [
    "daily",
    "weekly",
    "monthly"
];

const ALLOWED_STATUSES = [
    "active",
    "paused",
    "completed"
];


/*
=========================================================
HELPER: NORMALIZE FREQUENCY
=========================================================
*/

const normalizeFrequency = (frequency) => {

    if (typeof frequency !== "string") {
        return null;
    }

    return frequency.trim().toLowerCase();
};


/*
=========================================================
HELPER: VALIDATE DATE
=========================================================
*/

const isValidDate = (value) => {

    const date = new Date(value);

    return !Number.isNaN(date.getTime());
};


/*
=========================================================
CREATE RECURRING POST
=========================================================

POST /api/recurring-posts

Example:

{
    "post_id": 4,
    "platform": "Instagram",
    "start_time": "2026-09-15T10:00:00",
    "end_time": "2026-10-15T10:00:00",
    "frequency": "daily"
}
=========================================================
*/

router.post("/", authenticateToken, async (req, res) => {

    try {

        const {
            post_id,
            platform,
            start_time,
            end_time,
            frequency
        } = req.body;


        /*
        -----------------------------------------------------
        STEP 1: Validate required fields
        -----------------------------------------------------
        */

        if (
            post_id === undefined ||
            post_id === null ||
            !platform ||
            !start_time ||
            !end_time ||
            !frequency
        ) {

            return res.status(400).json({
                message:
                    "post_id, platform, start_time, end_time and frequency are required"
            });

        }


        /*
        -----------------------------------------------------
        STEP 2: Validate post_id
        -----------------------------------------------------
        */

        const numericPostId = Number(post_id);

        if (
            !Number.isInteger(numericPostId) ||
            numericPostId <= 0
        ) {

            return res.status(400).json({
                message: "post_id must be a valid positive integer"
            });

        }


        /*
        -----------------------------------------------------
        STEP 3: Normalize platform
        -----------------------------------------------------
        */

        const normalizedPlatform =
            String(platform).trim();


        if (!normalizedPlatform) {

            return res.status(400).json({
                message: "Platform cannot be empty"
            });

        }


        /*
        -----------------------------------------------------
        STEP 4: Validate frequency
        -----------------------------------------------------
        */

        const normalizedFrequency =
            normalizeFrequency(frequency);


        if (
            !ALLOWED_FREQUENCIES.includes(
                normalizedFrequency
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid frequency. Use daily, weekly or monthly."
            });

        }


        /*
        -----------------------------------------------------
        STEP 5: Validate dates
        -----------------------------------------------------
        */

        const startDate = new Date(start_time);
        const endDate = new Date(end_time);


        if (
            !isValidDate(start_time) ||
            !isValidDate(end_time)
        ) {

            return res.status(400).json({
                message:
                    "Invalid start_time or end_time"
            });

        }


        /*
        -----------------------------------------------------
        STEP 6: End date must be after start date
        -----------------------------------------------------
        */

        if (endDate <= startDate) {

            return res.status(400).json({
                message:
                    "end_time must be after start_time"
            });

        }


        /*
        -----------------------------------------------------
        STEP 7: Check post ownership
        -----------------------------------------------------
        */

        const postResult = await pool.query(
            `
            SELECT
                p.post_id,
                p.content,
                p.media_url,
                p.account_id,

                s.platform,
                s.username,
                s.user_id AS social_user_id,

                c.campaign_id,
                c.campaign_name,
                c.user_id AS campaign_user_id

            FROM posts p

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE p.post_id = $1

              AND c.user_id = $2

              AND s.user_id = $2
            `,
            [
                numericPostId,
                req.user.user_id
            ]
        );


        if (postResult.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Post not found or you do not have access to it"
            });

        }


        const post = postResult.rows[0];


        /*
        -----------------------------------------------------
        STEP 8: Verify platform
        -----------------------------------------------------
        */

        if (
            normalizedPlatform.toLowerCase() !==
            post.platform.toLowerCase()
        ) {

            return res.status(400).json({
                message:
                    "Platform does not match the social account of the post",
                post_platform: post.platform
            });

        }


        /*
        -----------------------------------------------------
        STEP 9: Prevent duplicate active recurring rule
        -----------------------------------------------------
        */

        const existingResult = await pool.query(
            `
            SELECT
                recurring_id,
                status,
                next_run

            FROM recurring_posts

            WHERE post_id = $1

              AND platform = $2

              AND status = 'active'

            LIMIT 1
            `,
            [
                numericPostId,
                post.platform
            ]
        );


        if (existingResult.rows.length > 0) {

            return res.status(409).json({
                message:
                    "An active recurring schedule already exists for this post and platform",

                recurring_id:
                    existingResult.rows[0].recurring_id,

                next_run:
                    existingResult.rows[0].next_run
            });

        }


        /*
        -----------------------------------------------------
        STEP 10: Create recurring post
        -----------------------------------------------------

        IMPORTANT:

        next_run = start_time

        This allows recurringProcessor.js to identify
        the first occurrence.
        -----------------------------------------------------
        */

        const result = await pool.query(
            `
            INSERT INTO recurring_posts
            (
                post_id,
                platform,
                start_time,
                end_time,
                frequency,
                status,
                next_run
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'active',
                $3
            )

            RETURNING *
            `,
            [
                numericPostId,
                post.platform,
                startDate,
                endDate,
                normalizedFrequency
            ]
        );


        /*
        -----------------------------------------------------
        SUCCESS
        -----------------------------------------------------
        */

        res.status(201).json({

            message:
                "Recurring post created successfully",

            recurring_post:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "CREATE RECURRING POST ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Failed to create recurring post",

            error:
                error.message
        });
    }
});


/*
=========================================================
GET MY RECURRING POSTS
=========================================================

GET /api/recurring-posts
=========================================================
*/

router.get("/", authenticateToken, async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                r.recurring_id,
                r.post_id,
                r.platform,
                r.start_time,
                r.end_time,
                r.frequency,
                r.status,
                r.created_at,
                r.next_run,

                p.content,
                p.media_url,
                p.status AS post_status,

                c.campaign_id,
                c.campaign_name,

                s.account_id,
                s.username

            FROM recurring_posts r

            JOIN posts p
                ON r.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE c.user_id = $1

              AND s.user_id = $1

            ORDER BY r.created_at DESC
            `,
            [
                req.user.user_id
            ]
        );


        res.json({

            count:
                result.rows.length,

            recurring_posts:
                result.rows
        });

    } catch (error) {

        console.error(
            "GET RECURRING POSTS ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch recurring posts",

            error:
                error.message
        });
    }
});


/*
=========================================================
GET ONE RECURRING POST
=========================================================

GET /api/recurring-posts/:id
=========================================================
*/

router.get("/:id", authenticateToken, async (req, res) => {

    try {

        const recurringId =
            Number(req.params.id);


        if (
            !Number.isInteger(recurringId) ||
            recurringId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Invalid recurring post ID"
            });

        }


        const result = await pool.query(
            `
            SELECT
                r.recurring_id,
                r.post_id,
                r.platform,
                r.start_time,
                r.end_time,
                r.frequency,
                r.status,
                r.created_at,
                r.next_run,

                p.content,
                p.media_url,
                p.status AS post_status,

                c.campaign_id,
                c.campaign_name,

                s.account_id,
                s.username

            FROM recurring_posts r

            JOIN posts p
                ON r.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE r.recurring_id = $1

              AND c.user_id = $2

              AND s.user_id = $2
            `,
            [
                recurringId,
                req.user.user_id
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Recurring post not found"
            });

        }


        res.json({
            recurring_post:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "GET RECURRING POST ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch recurring post",

            error:
                error.message
        });
    }
});


/*
=========================================================
UPDATE RECURRING POST
=========================================================

PUT /api/recurring-posts/:id

Example:

{
    "platform": "Instagram",
    "start_time": "2026-09-15T10:00:00",
    "end_time": "2026-10-15T10:00:00",
    "frequency": "weekly"
}
=========================================================
*/

router.put("/:id", authenticateToken, async (req, res) => {

    try {

        const recurringId =
            Number(req.params.id);


        if (
            !Number.isInteger(recurringId) ||
            recurringId <= 0
        ) {

            return res.status(400).json({
                message:
                    "Invalid recurring post ID"
            });

        }


        const {
            platform,
            start_time,
            end_time,
            frequency
        } = req.body;


        /*
        -----------------------------------------------------
        Check ownership and get current values
        -----------------------------------------------------
        */

        const existingResult = await pool.query(
            `
            SELECT
                r.recurring_id,
                r.post_id,
                r.platform,
                r.start_time,
                r.end_time,
                r.frequency,
                r.status,
                r.next_run,

                s.platform AS account_platform

            FROM recurring_posts r

            JOIN posts p
                ON r.post_id = p.post_id

            JOIN campaigns c
                ON p.campaign_id = c.campaign_id

            JOIN social_accounts s
                ON p.account_id = s.account_id

            WHERE r.recurring_id = $1

              AND c.user_id = $2

              AND s.user_id = $2
            `,
            [
                recurringId,
                req.user.user_id
            ]
        );


        if (existingResult.rows.length === 0) {

            return res.status(404).json({
                message:
                    "Recurring post not found"
            });

        }


        const existing =
            existingResult.rows[0];


        /*
        -----------------------------------------------------
        Determine new values
        -----------------------------------------------------
        */

        const newPlatform =
            platform !== undefined
                ? String(platform).trim()
                : existing.platform;


        const newFrequency =
            frequency !== undefined
                ? normalizeFrequency(frequency)
                : existing.frequency;


        const newStartTime =
            start_time !== undefined
                ? new Date(start_time)
                : new Date(existing.start_time);


        const newEndTime =
            end_time !== undefined
                ? new Date(end_time)
                : new Date(existing.end_time);


        /*
        -----------------------------------------------------
        Validate platform
        -----------------------------------------------------
        */

        if (!newPlatform) {

            return res.status(400).json({
                message:
                    "Platform cannot be empty"
            });

        }


        /*
        -----------------------------------------------------
        Validate platform matches social account
        -----------------------------------------------------
        */

        if (
            newPlatform.toLowerCase() !==
            existing.account_platform.toLowerCase()
        ) {

            return res.status(400).json({
                message:
                    "Platform does not match the social account"
            });

        }


        /*
        -----------------------------------------------------
        Validate frequency
        -----------------------------------------------------
        */

        if (
            !ALLOWED_FREQUENCIES.includes(
                newFrequency
            )
        ) {

            return res.status(400).json({
                message:
                    "Invalid frequency. Use daily, weekly or monthly."
            });

        }


        /*
        -----------------------------------------------------
        Validate dates
        -----------------------------------------------------
        */

        if (
            Number.isNaN(newStartTime.getTime()) ||
            Number.isNaN(newEndTime.getTime())
        ) {

            return res.status(400).json({
                message:
                    "Invalid start_time or end_time"
            });

        }


        if (newEndTime <= newStartTime) {

            return res.status(400).json({
                message:
                    "end_time must be after start_time"
            });

        }


        /*
        -----------------------------------------------------
        Calculate next_run

        If the schedule timing/frequency is changed,
        reset next_run to the new start time.

        This makes the updated recurring rule predictable.
        -----------------------------------------------------
        */

        const shouldResetNextRun =
            start_time !== undefined ||
            frequency !== undefined;


        const newNextRun =
            shouldResetNextRun
                ? newStartTime
                : existing.next_run;


        /*
        -----------------------------------------------------
        Update recurring post
        -----------------------------------------------------
        */

        const result = await pool.query(
            `
            UPDATE recurring_posts

            SET
                platform = $1,
                start_time = $2,
                end_time = $3,
                frequency = $4,
                next_run = $5

            WHERE recurring_id = $6

            RETURNING *
            `,
            [
                newPlatform,
                newStartTime,
                newEndTime,
                newFrequency,
                newNextRun,
                recurringId
            ]
        );


        res.json({

            message:
                "Recurring post updated successfully",

            recurring_post:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "UPDATE RECURRING POST ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Failed to update recurring post",

            error:
                error.message
        });
    }
});


/*
=========================================================
UPDATE RECURRING POST STATUS
=========================================================

PUT /api/recurring-posts/:id/status

Body:

{
    "status": "paused"
}

Allowed:

active
paused
completed
=========================================================
*/

router.put(
    "/:id/status",
    authenticateToken,
    async (req, res) => {

        try {

            const recurringId =
                Number(req.params.id);


            const {
                status
            } = req.body;


            if (
                !Number.isInteger(recurringId) ||
                recurringId <= 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid recurring post ID"
                });

            }


            const normalizedStatus =
                typeof status === "string"
                    ? status.trim().toLowerCase()
                    : null;


            if (
                !ALLOWED_STATUSES.includes(
                    normalizedStatus
                )
            ) {

                return res.status(400).json({
                    message:
                        "Invalid status. Use active, paused or completed."
                });

            }


            /*
            -------------------------------------------------
            Check ownership
            -------------------------------------------------
            */

            const ownershipResult =
                await pool.query(
                    `
                    SELECT
                        r.recurring_id,
                        r.next_run

                    FROM recurring_posts r

                    JOIN posts p
                        ON r.post_id = p.post_id

                    JOIN campaigns c
                        ON p.campaign_id = c.campaign_id

                    JOIN social_accounts s
                        ON p.account_id = s.account_id

                    WHERE r.recurring_id = $1

                      AND c.user_id = $2

                      AND s.user_id = $2
                    `,
                    [
                        recurringId,
                        req.user.user_id
                    ]
                );


            if (
                ownershipResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Recurring post not found"
                });

            }


            /*
            -------------------------------------------------
            Update status
            -------------------------------------------------
            */

            const result = await pool.query(
                `
                UPDATE recurring_posts

                SET status = $1

                WHERE recurring_id = $2

                RETURNING *
                `,
                [
                    normalizedStatus,
                    recurringId
                ]
            );


            res.json({

                message:
                    "Recurring post status updated successfully",

                recurring_post:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "UPDATE RECURRING STATUS ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to update recurring post status",

                error:
                    error.message
            });
        }
    }
);


/*
=========================================================
PAUSE RECURRING POST
=========================================================

POST /api/recurring-posts/:id/pause
=========================================================
*/

router.post(
    "/:id/pause",
    authenticateToken,
    async (req, res) => {

        try {

            const recurringId =
                Number(req.params.id);


            if (
                !Number.isInteger(recurringId) ||
                recurringId <= 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid recurring post ID"
                });

            }


            const result = await pool.query(
                `
                UPDATE recurring_posts r

                SET status = 'paused'

                FROM posts p
                JOIN campaigns c
                    ON p.campaign_id = c.campaign_id

                JOIN social_accounts s
                    ON p.account_id = s.account_id

                WHERE r.recurring_id = $1

                  AND r.post_id = p.post_id

                  AND c.user_id = $2

                  AND s.user_id = $2

                RETURNING r.*
                `,
                [
                    recurringId,
                    req.user.user_id
                ]
            );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    message:
                        "Recurring post not found"
                });

            }


            res.json({

                message:
                    "Recurring post paused successfully",

                recurring_post:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "PAUSE RECURRING POST ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to pause recurring post",

                error:
                    error.message
            });
        }
    }
);


/*
=========================================================
RESUME RECURRING POST
=========================================================

POST /api/recurring-posts/:id/resume
=========================================================
*/

router.post(
    "/:id/resume",
    authenticateToken,
    async (req, res) => {

        try {

            const recurringId =
                Number(req.params.id);


            if (
                !Number.isInteger(recurringId) ||
                recurringId <= 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid recurring post ID"
                });

            }


            /*
            -------------------------------------------------
            Get recurring post
            -------------------------------------------------
            */

            const existingResult =
                await pool.query(
                    `
                    SELECT
                        r.recurring_id,
                        r.next_run,
                        r.end_time

                    FROM recurring_posts r

                    JOIN posts p
                        ON r.post_id = p.post_id

                    JOIN campaigns c
                        ON p.campaign_id = c.campaign_id

                    JOIN social_accounts s
                        ON p.account_id = s.account_id

                    WHERE r.recurring_id = $1

                      AND c.user_id = $2

                      AND s.user_id = $2
                    `,
                    [
                        recurringId,
                        req.user.user_id
                    ]
                );


            if (
                existingResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Recurring post not found"
                });

            }


            const existing =
                existingResult.rows[0];


            /*
            -------------------------------------------------
            Check end date
            -------------------------------------------------
            */

            if (
                existing.end_time &&
                existing.next_run &&
                new Date(existing.next_run) >
                new Date(existing.end_time)
            ) {

                return res.status(400).json({
                    message:
                        "This recurring schedule has already passed its end time and cannot be resumed."
                });

            }


            /*
            -------------------------------------------------
            Resume
            -------------------------------------------------
            */

            const result = await pool.query(
                `
                UPDATE recurring_posts

                SET status = 'active'

                WHERE recurring_id = $1

                RETURNING *
                `,
                [
                    recurringId
                ]
            );


            res.json({

                message:
                    "Recurring post resumed successfully",

                recurring_post:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "RESUME RECURRING POST ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to resume recurring post",

                error:
                    error.message
            });
        }
    }
);


/*
=========================================================
DELETE RECURRING POST
=========================================================

DELETE /api/recurring-posts/:id
=========================================================
*/

router.delete(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const recurringId =
                Number(req.params.id);


            if (
                !Number.isInteger(recurringId) ||
                recurringId <= 0
            ) {

                return res.status(400).json({
                    message:
                        "Invalid recurring post ID"
                });

            }


            /*
            -------------------------------------------------
            Check ownership
            -------------------------------------------------
            */

            const ownershipResult =
                await pool.query(
                    `
                    SELECT
                        r.recurring_id

                    FROM recurring_posts r

                    JOIN posts p
                        ON r.post_id = p.post_id

                    JOIN campaigns c
                        ON p.campaign_id = c.campaign_id

                    JOIN social_accounts s
                        ON p.account_id = s.account_id

                    WHERE r.recurring_id = $1

                      AND c.user_id = $2

                      AND s.user_id = $2
                    `,
                    [
                        recurringId,
                        req.user.user_id
                    ]
                );


            if (
                ownershipResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Recurring post not found"
                });

            }


            /*
            -------------------------------------------------
            Delete recurring rule
            -------------------------------------------------
            */

            const result = await pool.query(
                `
                DELETE FROM recurring_posts

                WHERE recurring_id = $1

                RETURNING *
                `,
                [
                    recurringId
                ]
            );


            res.json({

                message:
                    "Recurring post deleted successfully",

                recurring_post:
                    result.rows[0]
            });

        } catch (error) {

            console.error(
                "DELETE RECURRING POST ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to delete recurring post",

                error:
                    error.message
            });
        }
    }
);


/*
=========================================================
EXPORT ROUTER
=========================================================
*/

module.exports = router;