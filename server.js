const express = require("express");
const cors = require("cors");

const pool = require("./config/db");
const usersRouter = require("./routes/users");
const authenticateToken = require("./middleware/auth");
const campaignsRouter = require("./routes/campaigns");
const socialAccountsRouter = require("./routes/social_accounts");
const postsRouter = require("./routes/posts");
const scheduledPostsRouter = require("./routes/scheduled_posts");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/social-accounts", socialAccountsRouter);
app.use("/api/posts", postsRouter);
app.use("/api/scheduled-posts", scheduledPostsRouter);

app.get("/", (req, res) => {
    res.send("Social Media Platform API is running!");
});

app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT current_database()");

        res.json({
            message: "Database connected successfully",
            database: result.rows[0].current_database
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.get("/api/protected", authenticateToken, (req, res) => {
    res.json({
        message: "You accessed a protected route!",
        user: req.user
    });
});

app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});