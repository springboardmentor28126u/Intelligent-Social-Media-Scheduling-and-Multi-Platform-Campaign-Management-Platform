const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/*
=====================================================
GET CAMPAIGN ANALYTICS
GET /api/analytics/campaign/:campaignId
=====================================================
*/

router.get("/campaign/:campaignId", async (req, res) => {
    try {
        const { campaignId } = req.params;

        // Validate campaign ID
        if (!/^\d+$/.test(campaignId)) {
            return res.status(400).json({
                message: "Invalid campaign ID"
            });
        }

        const result = await pool.query(
            `
            SELECT
                campaign_id,
                platform,
                impressions,
                reach,
                likes,
                comments,
                shares,
                clicks,
                engagement_rate
            FROM campaign_analytics
            WHERE campaign_id = $1
            `,
            [campaignId]
        );

        let totalImpressions = 0;
        let totalReach = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalClicks = 0;

        result.rows.forEach((row) => {
            totalImpressions += Number(row.impressions || 0);
            totalReach += Number(row.reach || 0);
            totalLikes += Number(row.likes || 0);
            totalComments += Number(row.comments || 0);
            totalShares += Number(row.shares || 0);
            totalClicks += Number(row.clicks || 0);
        });

        const totalEngagement =
            totalLikes +
            totalComments +
            totalShares;

        const engagementRate =
            totalReach > 0
                ? Number(
                    ((totalEngagement / totalReach) * 100).toFixed(2)
                )
                : 0;

        return res.status(200).json({
            campaign_id: Number(campaignId),

            platforms: result.rows,

            summary: {
                total_impressions: totalImpressions,
                total_reach: totalReach,
                total_likes: totalLikes,
                total_comments: totalComments,
                total_shares: totalShares,
                total_clicks: totalClicks,
                total_engagement: totalEngagement,
                engagement_rate: engagementRate
            }
        });

    } catch (error) {
        console.error(
            "CAMPAIGN ANALYTICS ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch campaign analytics",
            error: error.message
        });
    }
});


/*
=====================================================
GET AUDIENCE GROWTH
GET /api/analytics/audience/:campaignId
=====================================================
*/

router.get("/audience/:campaignId", async (req, res) => {
    try {
        const { campaignId } = req.params;

        // Validate campaign ID
        if (!/^\d+$/.test(campaignId)) {
            return res.status(400).json({
                message: "Invalid campaign ID"
            });
        }

        const result = await pool.query(
            `
            SELECT
                campaign_id,
                platform,
                followers_start,
                followers_end,
                follower_growth
            FROM audience_growth
            WHERE campaign_id = $1
            `,
            [campaignId]
        );

        let totalFollowersStart = 0;
        let totalFollowersEnd = 0;
        let totalFollowerGrowth = 0;

        result.rows.forEach((row) => {
            totalFollowersStart +=
                Number(row.followers_start || 0);

            totalFollowersEnd +=
                Number(row.followers_end || 0);

            totalFollowerGrowth +=
                Number(row.follower_growth || 0);
        });

        const growthPercentage =
            totalFollowersStart > 0
                ? Number(
                    (
                        (totalFollowerGrowth /
                            totalFollowersStart) *
                        100
                    ).toFixed(2)
                )
                : 0;

        return res.status(200).json({
            campaign_id: Number(campaignId),

            platforms: result.rows,

            summary: {
                total_followers_start:
                    totalFollowersStart,

                total_followers_end:
                    totalFollowersEnd,

                total_follower_growth:
                    totalFollowerGrowth,

                growth_percentage:
                    growthPercentage
            }
        });

    } catch (error) {
        console.error(
            "AUDIENCE GROWTH ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch audience growth",
            error: error.message
        });
    }
});


/*
=====================================================
GET CAMPAIGN EXPENSES
GET /api/analytics/expenses/:campaignId
=====================================================
*/

router.get("/expenses/:campaignId", async (req, res) => {
    try {
        const { campaignId } = req.params;

        // Validate campaign ID
        if (!/^\d+$/.test(campaignId)) {
            return res.status(400).json({
                message: "Invalid campaign ID"
            });
        }

        const result = await pool.query(
            `
            SELECT
                campaign_id,
                budget,
                amount_spent,
                revenue_generated
            FROM campaign_expenses
            WHERE campaign_id = $1
            `,
            [campaignId]
        );

        /*
        If no expense record exists, return zero values
        instead of 404. This allows the analytics dashboard
        to work for newly created campaigns.
        */

        if (result.rows.length === 0) {
            return res.status(200).json({
                campaign_id: Number(campaignId),

                summary: {
                    budget: 0,
                    amount_spent: 0,
                    revenue_generated: 0,
                    profit: 0,
                    roi: 0
                }
            });
        }

        const row = result.rows[0];

        const budget =
            Number(row.budget || 0);

        const amountSpent =
            Number(row.amount_spent || 0);

        const revenueGenerated =
            Number(row.revenue_generated || 0);

        const profit =
            revenueGenerated - amountSpent;

        const roi =
            amountSpent > 0
                ? Number(
                    ((profit / amountSpent) * 100).toFixed(2)
                )
                : 0;

        return res.status(200).json({
            campaign_id: Number(campaignId),

            summary: {
                budget: budget,
                amount_spent: amountSpent,
                revenue_generated:
                    revenueGenerated,
                profit: profit,
                roi: roi
            }
        });

    } catch (error) {
        console.error(
            "CAMPAIGN EXPENSE ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch campaign expenses",
            error: error.message
        });
    }
});


/*
=====================================================
EXPORT ROUTER
=====================================================
*/

module.exports = router;