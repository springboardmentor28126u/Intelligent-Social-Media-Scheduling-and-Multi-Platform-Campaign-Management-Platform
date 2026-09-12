const pool = require("../config/db");

/*
=========================================================
MILESTONE 2 - PUBLISHING QUEUE PROCESSOR
=========================================================

Responsibilities:

1. Find pending posts whose scheduled time has arrived
2. Find failed posts ready for retry
3. Process posts according to priority
4. Prevent duplicate processing
5. Validate social media account
6. Validate access token
7. Simulate social media publishing
8. Update publishing queue
9. Update main post
10. Update scheduled post
11. Create publishing logs
12. Handle publishing failures
13. Increase retry count
14. Retry failed posts up to MAX_RETRIES times

NOTE:
Social media publishing is currently SIMULATED.

Real APIs can later be connected:

- Instagram Graph API
- Facebook Graph API
- LinkedIn API
- X API
=========================================================
*/


// =====================================================
// CONFIGURATION
// =====================================================

const MAX_RETRIES = 3;

// Initial retry delay = 30 seconds
const RETRY_DELAY_MS = 30 * 1000;


// =====================================================
// SIMULATED SOCIAL MEDIA PUBLISHING
// =====================================================

const simulatePublishing = async (platform, post) => {

    console.log("");
    console.log("-----------------------------------------------");
    console.log(`Starting simulated ${platform} publishing`);
    console.log("-----------------------------------------------");

    console.log(`Content: ${post.content || "No content"}`);

    if (post.media_url) {
        console.log(`Media: ${post.media_url}`);
    }

    // Simulate API processing time
    await new Promise((resolve) => {
        setTimeout(resolve, 2000);
    });

    /*
    -----------------------------------------------------
    FUTURE REAL API INTEGRATION
    -----------------------------------------------------

    Example:

    if (platform === "instagram") {
        // Instagram Graph API
    }

    if (platform === "facebook") {
        // Facebook Graph API
    }

    if (platform === "linkedin") {
        // LinkedIn API
    }

    if (platform === "twitter" || platform === "x") {
        // X API
    }
    -----------------------------------------------------
    */

    console.log(
        `Simulated ${platform} API publishing completed.`
    );

    return {
        success: true
    };
};


// =====================================================
// CHECK WHETHER RETRY IS READY
// =====================================================

const isRetryReady = (lastAttemptTime, retryCount) => {

    // If there is no previous failure timestamp,
    // allow retry immediately.
    if (!lastAttemptTime) {
        return true;
    }

    /*
    -----------------------------------------------------
    Increasing retry delay

    Retry 1 -> 30 seconds
    Retry 2 -> 60 seconds
    Retry 3 -> 90 seconds
    -----------------------------------------------------
    */

    const retryDelay =
        RETRY_DELAY_MS * Math.max(retryCount, 1);

    const nextRetryTime =
        new Date(lastAttemptTime).getTime() + retryDelay;

    return Date.now() >= nextRetryTime;
};


// =====================================================
// CREATE SUCCESS LOG
// =====================================================

const createSuccessLog = async (item) => {

    await pool.query(
        `
        INSERT INTO publishing_logs
        (
            queue_id,
            post_id,
            platform,
            status,
            published_at,
            error_message,
            retry_count
        )
        VALUES
        (
            $1,
            $2,
            $3,
            'published',
            CURRENT_TIMESTAMP,
            NULL,
            $4
        )
        `,
        [
            item.queue_id,
            item.post_id,
            item.platform,
            item.retry_count || 0
        ]
    );

    console.log(
        `Publishing success log created for Queue #${item.queue_id}.`
    );
};


// =====================================================
// CREATE FAILURE LOG
// =====================================================

const createFailureLog = async (
    item,
    errorMessage,
    retryCount
) => {

    try {

        await pool.query(
            `
            INSERT INTO publishing_logs
            (
                queue_id,
                post_id,
                platform,
                status,
                published_at,
                error_message,
                retry_count
            )
            VALUES
            (
                $1,
                $2,
                $3,
                'failed',
                CURRENT_TIMESTAMP,
                $4,
                $5
            )
            `,
            [
                item.queue_id,
                item.post_id,
                item.platform,
                errorMessage,
                retryCount
            ]
        );

        console.log(
            `Publishing failure log created for Queue #${item.queue_id}.`
        );

    } catch (logError) {

        console.error(
            "Could not create failed publishing log:",
            logError.message
        );
    }
};


// =====================================================
// UPDATE SUCCESSFUL PUBLISHING STATUS
// =====================================================

const markAsPublished = async (item) => {

    // -------------------------------------------------
    // UPDATE PUBLISHING QUEUE
    // -------------------------------------------------

    await pool.query(
        `
        UPDATE publishing_queue
        SET
            status = 'published'
        WHERE queue_id = $1
        `,
        [item.queue_id]
    );


    // -------------------------------------------------
    // UPDATE MAIN POST
    // -------------------------------------------------

    await pool.query(
        `
        UPDATE posts
        SET
            status = 'published'
        WHERE post_id = $1
        `,
        [item.post_id]
    );


    // -------------------------------------------------
    // UPDATE SCHEDULED POST
    // -------------------------------------------------

    await pool.query(
        `
        UPDATE scheduled_posts
        SET
            status = 'published',
            published_at = CURRENT_TIMESTAMP,
            error_message = NULL
        WHERE post_id = $1
          AND status IN ('pending', 'processing', 'failed')
        `,
        [item.post_id]
    );
};


// =====================================================
// UPDATE FAILED PUBLISHING STATUS
// =====================================================

const markAsFailed = async (
    item,
    retryCount,
    errorMessage,
    permanentlyFailed
) => {

    // -------------------------------------------------
    // UPDATE PUBLISHING QUEUE
    // -------------------------------------------------

    await pool.query(
        `
        UPDATE publishing_queue
        SET
            status = 'failed',
            retry_count = $1
        WHERE queue_id = $2
        `,
        [
            retryCount,
            item.queue_id
        ]
    );


    // -------------------------------------------------
    // UPDATE MAIN POST
    // -------------------------------------------------

    await pool.query(
        `
        UPDATE posts
        SET
            status = 'failed'
        WHERE post_id = $1
        `,
        [item.post_id]
    );


    // -------------------------------------------------
    // UPDATE SCHEDULED POST
    // -------------------------------------------------

    if (permanentlyFailed) {

        await pool.query(
            `
            UPDATE scheduled_posts
            SET
                status = 'failed',
                error_message = $1
            WHERE post_id = $2
              AND status IN ('pending', 'processing', 'failed')
            `,
            [
                errorMessage,
                item.post_id
            ]
        );

    } else {

        /*
        -------------------------------------------------
        The post failed, but it is still eligible for
        another queue retry.

        We keep scheduled_posts as 'pending' so the
        frontend does not treat it as permanently failed.
        -------------------------------------------------
        */

        await pool.query(
            `
            UPDATE scheduled_posts
            SET
                status = 'pending',
                error_message = $1
            WHERE post_id = $2
              AND status IN ('pending', 'processing', 'failed')
            `,
            [
                errorMessage,
                item.post_id
            ]
        );
    }
};


// =====================================================
// MAIN QUEUE PROCESSOR
// =====================================================

const processPublishingQueue = async () => {

    try {

        console.log("");
        console.log("=================================================");
        console.log("CHECKING PUBLISHING QUEUE");
        console.log("=================================================");


        // =================================================
        // STEP 1
        // FIND PENDING POSTS READY FOR PUBLISHING
        // =================================================

        const pendingResult = await pool.query(
            `
            SELECT
                pq.queue_id,
                pq.post_id,
                pq.platform,
                pq.scheduled_time,
                pq.priority,
                pq.status,
                pq.retry_count,
                pq.created_at,

                p.content,
                p.media_url,
                p.status AS post_status,

                sa.account_id,
                sa.username,
                sa.access_token

            FROM publishing_queue pq

            JOIN posts p
                ON pq.post_id = p.post_id

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE pq.status = 'pending'
              AND pq.scheduled_time <= CURRENT_TIMESTAMP

            ORDER BY
                pq.priority DESC,
                pq.scheduled_time ASC

            LIMIT 10
            `
        );


        // =================================================
        // STEP 2
        // FIND FAILED POSTS READY FOR RETRY
        // =================================================

        const failedResult = await pool.query(
            `
            SELECT
                pq.queue_id,
                pq.post_id,
                pq.platform,
                pq.scheduled_time,
                pq.priority,
                pq.status,
                pq.retry_count,
                pq.created_at,

                p.content,
                p.media_url,
                p.status AS post_status,

                sa.account_id,
                sa.username,
                sa.access_token,

                (
                    SELECT pl.published_at
                    FROM publishing_logs pl
                    WHERE pl.queue_id = pq.queue_id
                      AND pl.status = 'failed'
                    ORDER BY pl.log_id DESC
                    LIMIT 1
                ) AS last_failed_at

            FROM publishing_queue pq

            JOIN posts p
                ON pq.post_id = p.post_id

            LEFT JOIN social_accounts sa
                ON p.account_id = sa.account_id

            WHERE pq.status = 'failed'
              AND pq.retry_count < $1

            ORDER BY
                pq.priority DESC,
                pq.scheduled_time ASC

            LIMIT 10
            `,
            [MAX_RETRIES]
        );


        // =================================================
        // STEP 3
        // FILTER RETRIES THAT ARE READY
        // =================================================

        const readyRetries = failedResult.rows.filter((item) => {

            return isRetryReady(
                item.last_failed_at,
                item.retry_count
            );

        });


        // =================================================
        // STEP 4
        // COMBINE PENDING + RETRY ITEMS
        // =================================================

        const queueItems = [
            ...pendingResult.rows,
            ...readyRetries
        ];


        // =================================================
        // NO ITEMS READY
        // =================================================

        if (queueItems.length === 0) {

            console.log(
                "No posts are ready for publishing."
            );

            console.log("=================================================");

            return;
        }


        console.log(
            `${queueItems.length} post(s) ready for processing.`
        );


        // =================================================
        // STEP 5
        // PROCESS EACH QUEUE ITEM
        // =================================================

        for (const item of queueItems) {

            try {

                console.log("");
                console.log("===============================================");
                console.log(
                    `PROCESSING QUEUE #${item.queue_id}`
                );
                console.log("===============================================");

                console.log(
                    `Post ID       : ${item.post_id}`
                );

                console.log(
                    `Platform      : ${item.platform}`
                );

                console.log(
                    `Scheduled Time: ${item.scheduled_time}`
                );

                console.log(
                    `Priority      : ${item.priority}`
                );

                console.log(
                    `Retry Count   : ${item.retry_count || 0}`
                );


                // =================================================
                // STEP 6
                // PREVENT DUPLICATE PROCESSING
                // =================================================

                const lockResult = await pool.query(
                    `
                    UPDATE publishing_queue

                    SET
                        status = 'processing'

                    WHERE queue_id = $1
                      AND status IN ('pending', 'failed')

                    RETURNING queue_id
                    `,
                    [item.queue_id]
                );


                if (lockResult.rows.length === 0) {

                    console.log(
                        `Queue #${item.queue_id} is already being processed.`
                    );

                    continue;
                }


                console.log(
                    `Queue #${item.queue_id} locked for processing.`
                );


                // =================================================
                // STEP 7
                // VALIDATE SOCIAL MEDIA ACCOUNT
                // =================================================

                if (!item.account_id) {

                    throw new Error(
                        "Social media account not found for this post."
                    );
                }


                console.log(
                    `Social Account: ${item.username || "Unknown"}`
                );


                // =================================================
                // STEP 8
                // VALIDATE ACCESS TOKEN
                // =================================================

                if (!item.access_token) {

                    throw new Error(
                        `No access token configured for ${item.platform}.`
                    );
                }


                console.log(
                    `Access token validation: PASSED`
                );


                // =================================================
                // STEP 9
                // VALIDATE CONTENT
                // =================================================

                if (!item.content || item.content.trim() === "") {

                    throw new Error(
                        "Post content cannot be empty."
                    );
                }


                console.log(
                    "Post content validation: PASSED"
                );


                // =================================================
                // STEP 10
                // SIMULATED PUBLISHING
                // =================================================

                const publishResult =
                    await simulatePublishing(
                        item.platform,
                        {
                            content: item.content,
                            media_url: item.media_url
                        }
                    );


                if (!publishResult.success) {

                    throw new Error(
                        `Publishing to ${item.platform} failed.`
                    );
                }


                // =================================================
                // STEP 11
                // MARK QUEUE AS PUBLISHED
                // =================================================

                await markAsPublished(item);


                console.log(
                    `Queue #${item.queue_id} marked as published.`
                );


                // =================================================
                // STEP 12
                // CREATE SUCCESS LOG
                // =================================================

                await createSuccessLog(item);


                // =================================================
                // SUCCESS MESSAGE
                // =================================================

                console.log("");
                console.log("***********************************************");
                console.log(
                    `SUCCESS: Post #${item.post_id} published`
                );
                console.log(
                    `Platform: ${item.platform}`
                );
                console.log(
                    `Queue #${item.queue_id}: PUBLISHED`
                );
                console.log("***********************************************");


            } catch (error) {

                // =================================================
                // PUBLISHING FAILED
                // =================================================

                console.error("");
                console.error("***********************************************");
                console.error(
                    `PUBLISHING FAILED - Queue #${item.queue_id}`
                );
                console.error(
                    `Reason: ${error.message}`
                );
                console.error("***********************************************");


                // =================================================
                // CALCULATE RETRY COUNT
                // =================================================

                const currentRetryCount =
                    Number(item.retry_count) || 0;

                const newRetryCount =
                    currentRetryCount + 1;


                // =================================================
                // CHECK MAX RETRIES
                // =================================================

                const permanentlyFailed =
                    newRetryCount >= MAX_RETRIES;


                if (permanentlyFailed) {

                    console.log("");
                    console.log(
                        `Maximum retries reached for Queue #${item.queue_id}.`
                    );

                    console.log(
                        `Final Retry Count: ${newRetryCount}/${MAX_RETRIES}`
                    );

                    console.log(
                        "Post will remain permanently failed."
                    );

                } else {

                    console.log("");
                    console.log(
                        `Retry scheduled for Queue #${item.queue_id}.`
                    );

                    console.log(
                        `Retry Count: ${newRetryCount}/${MAX_RETRIES}`
                    );

                    console.log(
                        `Retry Delay: ${RETRY_DELAY_MS / 1000} seconds`
                    );
                }


                // =================================================
                // UPDATE DATABASE FAILURE STATUS
                // =================================================

                try {

                    await markAsFailed(
                        item,
                        newRetryCount,
                        error.message,
                        permanentlyFailed
                    );

                } catch (statusError) {

                    console.error(
                        "Could not update failure status:",
                        statusError.message
                    );
                }


                // =================================================
                // CREATE FAILURE LOG
                // =================================================

                await createFailureLog(
                    item,
                    error.message,
                    newRetryCount
                );


                // =================================================
                // FAILURE SUMMARY
                // =================================================

                if (permanentlyFailed) {

                    console.log("");
                    console.log(
                        `Queue #${item.queue_id} marked as FAILED.`
                    );

                } else {

                    console.log("");
                    console.log(
                        `Queue #${item.queue_id} remains eligible for retry.`
                    );
                }
            }
        }


        // =================================================
        // PROCESSING COMPLETE
        // =================================================

        console.log("");
        console.log("=================================================");
        console.log("PUBLISHING QUEUE PROCESSING COMPLETED");
        console.log("=================================================");


    } catch (error) {

        // =================================================
        // MAIN QUEUE PROCESSOR ERROR
        // =================================================

        console.error("");
        console.error("=================================================");
        console.error("QUEUE PROCESSOR ERROR");
        console.error("=================================================");
        console.error(error.message);
        console.error("=================================================");
    }
};


// =====================================================
// EXPORT
// =====================================================

module.exports = processPublishingQueue;