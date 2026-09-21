const cron = require("node-cron");
const pool = require("./config/db");

console.log("Scheduler started...");

// Check every minute
cron.schedule("* * * * *", async () => {
    try {
        console.log("Checking scheduled posts...");

        const result = await pool.query(
            `SELECT schedule_id, post_id, scheduled_at
             FROM scheduled_posts
             WHERE status = 'pending'
             AND scheduled_at <= CURRENT_TIMESTAMP`
        );

        for (const post of result.rows) {

            console.log(`Publishing post ${post.post_id}...`);

            // Simulate publishing
            await pool.query(
                `UPDATE scheduled_posts
                 SET status = 'published',
                     published_at = CURRENT_TIMESTAMP
                 WHERE schedule_id = $1`,
                [post.schedule_id]
            );

            await pool.query(
                `UPDATE posts
                 SET status = 'published'
                 WHERE post_id = $1`,
                [post.post_id]
            );

            console.log(
                `Post ${post.post_id} published successfully.`
            );
        }

    } catch (error) {
        console.error("SCHEDULER ERROR:", error.message);
    }
});