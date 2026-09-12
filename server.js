const express = require("express");
const cors = require("cors");

const pool = require("./config/db");

// =====================================================
// ROUTES
// =====================================================

const usersRouter = require("./routes/users");
const campaignsRouter = require("./routes/campaigns");
const socialAccountsRouter = require("./routes/social_accounts");
const postsRouter = require("./routes/posts");
const scheduledPostsRouter = require("./routes/scheduled_posts");
const queueRouter = require("./routes/queue");
const recurringPostsRouter = require("./routes/recurring_posts");

// =====================================================
// MIDDLEWARE
// =====================================================

const authenticateToken = require("./middleware/auth");

// =====================================================
// SERVICES
// =====================================================

const processPublishingQueue = require("./services/queueProcessor");
const processRecurringPosts = require("./services/recurringProcessor");

// =====================================================
// CREATE EXPRESS APP
// =====================================================

const app = express();

// =====================================================
// SERVER CONFIGURATION
// =====================================================

const PORT = 5000;

// =====================================================
// GLOBAL MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

// =====================================================
// REQUEST LOGGING
// =====================================================

app.use((req, res, next) => {
    console.log(
        `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
    );

    next();
});

// =====================================================
// USER ROUTES
// =====================================================

app.use("/api/users", usersRouter);

// =====================================================
// CAMPAIGN ROUTES
// =====================================================

app.use(
    "/api/campaigns",
    authenticateToken,
    campaignsRouter
);

// =====================================================
// SOCIAL ACCOUNT ROUTES
// =====================================================

app.use(
    "/api/social-accounts",
    authenticateToken,
    socialAccountsRouter
);

// =====================================================
// POST ROUTES
// =====================================================

app.use(
    "/api/posts",
    authenticateToken,
    postsRouter
);

// =====================================================
// SCHEDULED POST ROUTES
// =====================================================

app.use(
    "/api/scheduled-posts",
    authenticateToken,
    scheduledPostsRouter
);

// =====================================================
// PUBLISHING QUEUE ROUTES
// =====================================================

app.use(
    "/api/queue",
    authenticateToken,
    queueRouter
);

// =====================================================
// RECURRING POSTS ROUTES
// =====================================================

app.use(
    "/api/recurring-posts",
    authenticateToken,
    recurringPostsRouter
);

// =====================================================
// PUBLISHING LOGS
// =====================================================

// -----------------------------------------------------
// GET ALL PUBLISHING LOGS
// GET /api/publishing-logs
// -----------------------------------------------------

app.get(
    "/api/publishing-logs",
    authenticateToken,
    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    log_id,
                    queue_id,
                    post_id,
                    platform,
                    status,
                    published_at,
                    error_message,
                    retry_count
                FROM publishing_logs
                ORDER BY log_id DESC
            `);

            res.status(200).json({
                publishing_logs: result.rows
            });

        } catch (error) {

            console.error(
                "Error fetching publishing logs:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch publishing logs",
                error: error.message
            });
        }
    }
);

// -----------------------------------------------------
// GET ONE PUBLISHING LOG
// GET /api/publishing-logs/:id
// -----------------------------------------------------

app.get(
    "/api/publishing-logs/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const logId = Number(req.params.id);

            if (Number.isNaN(logId)) {

                return res.status(400).json({
                    message: "Invalid publishing log ID"
                });
            }

            const result = await pool.query(
                `
                SELECT
                    log_id,
                    queue_id,
                    post_id,
                    platform,
                    status,
                    published_at,
                    error_message,
                    retry_count
                FROM publishing_logs
                WHERE log_id = $1
                `,
                [logId]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Publishing log not found"
                });
            }

            res.status(200).json({
                publishing_log: result.rows[0]
            });

        } catch (error) {

            console.error(
                "Error fetching publishing log:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch publishing log",
                error: error.message
            });
        }
    }
);

// -----------------------------------------------------
// GET PUBLISHING LOGS FOR ONE POST
// GET /api/publishing-logs/post/:postId
// -----------------------------------------------------

app.get(
    "/api/publishing-logs/post/:postId",
    authenticateToken,
    async (req, res) => {

        try {

            const postId = Number(req.params.postId);

            if (Number.isNaN(postId)) {

                return res.status(400).json({
                    message: "Invalid post ID"
                });
            }

            const result = await pool.query(
                `
                SELECT
                    log_id,
                    queue_id,
                    post_id,
                    platform,
                    status,
                    published_at,
                    error_message,
                    retry_count
                FROM publishing_logs
                WHERE post_id = $1
                ORDER BY log_id DESC
                `,
                [postId]
            );

            res.status(200).json({
                post_id: postId,
                publishing_logs: result.rows
            });

        } catch (error) {

            console.error(
                "Error fetching publishing logs for post:",
                error
            );

            res.status(500).json({
                message: "Failed to fetch publishing logs",
                error: error.message
            });
        }
    }
);

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.status(200).json({

        message:
            "Social Media Platform API is running!",

        milestone:
            "Milestone 2",

        status:
            "running",

        services: {

            publishing_queue:
                "enabled",

            recurring_posts:
                "enabled",

            publishing_logs:
                "enabled"
        }

    });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                current_database(),
                CURRENT_TIMESTAMP
            `
        );

        res.status(200).json({

            status:
                "healthy",

            server:
                "running",

            database:
                "connected",

            database_name:
                result.rows[0].current_database,

            server_time:
                result.rows[0].current_timestamp,

            milestone:
                "Milestone 2",

            services: {

                publishing_queue:
                    "enabled",

                recurring_posts:
                    "enabled",

                publishing_logs:
                    "enabled"
            }

        });

    } catch (error) {

        console.error(
            "HEALTH CHECK ERROR:",
            error
        );

        res.status(500).json({

            status:
                "unhealthy",

            server:
                "running",

            database:
                "disconnected",

            error:
                error.message

        });
    }
});

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/test-db", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT current_database()"
        );

        res.status(200).json({

            message:
                "Database connected successfully",

            database:
                result.rows[0].current_database

        });

    } catch (error) {

        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({

            message:
                "Database connection failed",

            error:
                error.message

        });
    }
});

// =====================================================
// JWT PROTECTED ROUTE TEST
// =====================================================

app.get(
    "/api/protected",
    authenticateToken,
    (req, res) => {

        res.status(200).json({

            message:
                "You accessed a protected route!",

            user:
                req.user

        });
    }
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        message:
            "API route not found",

        method:
            req.method,

        path:
            req.originalUrl

    });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            err
        );

        res.status(500).json({

            message:
                "Internal server error",

            error:
                err.message

        });
    }
);

// =====================================================
// PROCESSOR CONTROL FLAGS
// =====================================================

let publishingProcessorRunning = false;

let recurringProcessorRunning = false;

// =====================================================
// PROCESSOR INTERVALS
// =====================================================

const PROCESSOR_INTERVAL = 10000;

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "================================================="
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            "================================================="
        );

        console.log(
            "Milestone 2 publishing services are enabled."
        );

        console.log(
            "Publishing queue processor: ENABLED"
        );

        console.log(
            "Recurring posts processor: ENABLED"
        );

        console.log(
            "Publishing logs API: ENABLED"
        );

        console.log(
            "================================================="
        );

        console.log("");

        console.log(
            "Automatic processors will start checking after 10 seconds."
        );
    }
);

// =====================================================
// AUTOMATIC PUBLISHING QUEUE PROCESSOR
// =====================================================

const publishingQueueInterval = setInterval(
    async () => {

        if (publishingProcessorRunning) {

            console.log(
                "Publishing queue processor is already running. Skipping this cycle."
            );

            return;
        }

        publishingProcessorRunning = true;

        console.log(
            "Running publishing queue processor..."
        );

        try {

            await processPublishingQueue();

            console.log(
                "Publishing queue processor completed."
            );

        } catch (error) {

            console.error(
                "Publishing queue processor error:",
                error
            );

        } finally {

            publishingProcessorRunning = false;
        }

    },
    PROCESSOR_INTERVAL
);

// =====================================================
// AUTOMATIC RECURRING POSTS PROCESSOR
// =====================================================

const recurringPostsInterval = setInterval(
    async () => {

        if (recurringProcessorRunning) {

            console.log(
                "Recurring posts processor is already running. Skipping this cycle."
            );

            return;
        }

        recurringProcessorRunning = true;

        console.log(
            "Running recurring posts processor..."
        );

        try {

            await processRecurringPosts();

            console.log(
                "Recurring posts processor completed."
            );

        } catch (error) {

            console.error(
                "Recurring posts processor error:",
                error
            );

        } finally {

            recurringProcessorRunning = false;
        }

    },
    PROCESSOR_INTERVAL
);

// =====================================================
// GRACEFUL SERVER SHUTDOWN
// =====================================================

const shutdownServer = async (signal) => {

    console.log("");

    console.log(
        `${signal} received. Shutting down server...`
    );

    clearInterval(
        publishingQueueInterval
    );

    clearInterval(
        recurringPostsInterval
    );

    server.close(
        async () => {

            console.log(
                "HTTP server closed."
            );

            try {

                await pool.end();

                console.log(
                    "Database connection pool closed."
                );

                console.log(
                    "Server shutdown completed."
                );

                process.exit(0);

            } catch (error) {

                console.error(
                    "Error closing database pool:",
                    error
                );

                process.exit(1);
            }
        }
    );
};

// =====================================================
// SHUTDOWN SIGNALS
// =====================================================

process.on(
    "SIGINT",
    () => shutdownServer("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdownServer("SIGTERM")
);

// =====================================================
// UNHANDLED PROMISE ERROR
// =====================================================

process.on(
    "unhandledRejection",
    (error) => {

        console.error(
            "UNHANDLED PROMISE REJECTION:",
            error
        );
    }
);

// =====================================================
// UNCAUGHT EXCEPTION
// =====================================================

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "UNCAUGHT EXCEPTION:",
            error
        );
    }
);