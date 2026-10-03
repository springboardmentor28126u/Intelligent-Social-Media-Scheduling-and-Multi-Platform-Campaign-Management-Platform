"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

import {
  createCampaign,
  deleteCampaign,
  getAudienceGrowth,
  getAudiencePerformance,
  getCampaignAnalytics,
  getCampaignComparison,
  getCampaignPosts,
  getCampaignReport,
  getCampaigns,
  getCampaignSummary,
  getEngagementAnalytics,
  getPerformanceHistory,
  updateCampaign,
  updateCampaignPerformance,
} from "@/lib/campaigns";

/* ============================================================
   LOCAL TYPES
============================================================ */

type RecordLike = Record<string, unknown>;

type CampaignView = {
  id: number;
  name: string;
  platform: string;
  description: string;
  objective: string;
  status: string;
  start_date: string | null;
  end_date: string | null;

  budget: number;
  spent: number;

  target_reach: number;
  target_engagement: number;
  target_clicks: number;

  actual_reach: number;
  actual_engagement: number;
  actual_clicks: number;

  roi: number;
  created_at: string | null;
  updated_at: string | null;
};

type SummaryView = {
  total_campaigns: number;
  active_campaigns: number;
  total_reach: number;
  average_roi: number;
  total_budget: number;
  total_spent: number;
};

type AnalyticsView = {
  total_posts: number;
  published_posts: number;
  failed_posts: number;

  target_reach: number;
  actual_reach: number;

  target_engagement: number;
  actual_engagement: number;

  target_clicks: number;
  actual_clicks: number;

  budget: number;
  spent: number;
  budget_used: number;

  reach_achievement: number;
  engagement_achievement: number;
  click_achievement: number;

  roi: number;
  engagement_rate: number;
  ctr: number;
};

type ComparisonView = {
  id: number;
  campaign_name: string;
  platform: string;

  budget: number;
  spent: number;

  actual_reach: number;
  actual_engagement: number;
  actual_clicks: number;

  roi: number;
};

type AudiencePerformanceView = {
  target_reach: number;
  actual_reach: number;
  reach_growth: number;

  target_engagement: number;
  actual_engagement: number;
  engagement_growth: number;

  actual_clicks: number;
  click_growth: number;

  engagement_rate: number;
  ctr: number;
};

type AudienceGrowthView = {
  first_recorded_reach: number;
  latest_recorded_reach: number;
  current_reach: number;

  reach_growth: number;

  first_recorded_at: string | null;
  latest_recorded_at: string | null;

  target_reach: number;
  current_reach_gap: number;
};

type EngagementView = {
  target_engagement: number;
  actual_engagement: number;

  engagement_growth: number;
  engagement_rate: number;

  engagement_gap: number;
  average_historical_engagement: number;

  roi: number;
  total_posts: number;
  published_posts: number;
  failed_posts: number;

  history_points: {
    date: string;
    engagement: number;
  }[];
};

type HistoryView = {
  id?: number;
  recorded_at: string | null;
  reach: number;
  engagement: number;
  clicks: number;
  roi: number;
};

type ReportView = {
  campaign_name: string;
  platform: string;
  status: string;

  start_date: string | null;
  end_date: string | null;

  budget: number;
  spent: number;

  target_reach: number;
  actual_reach: number;

  target_engagement: number;
  actual_engagement: number;

  actual_clicks: number;
  roi: number;

  total_posts: number;
  published_posts: number;
  failed_posts: number;
};

type PostView = {
  id: number;
  content: string;
  platforms: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
};

type Tab =
  | "overview"
  | "engagement"
  | "audience"
  | "history"
  | "report"
  | "posts";

/* ============================================================
   API WRAPPERS
============================================================ */

const apiGetCampaigns =
  getCampaigns as unknown as () => Promise<unknown>;

const apiGetSummary =
  getCampaignSummary as unknown as () => Promise<unknown>;

const apiGetAnalytics =
  getCampaignAnalytics as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetComparison =
  getCampaignComparison as unknown as () => Promise<unknown>;

const apiGetAudiencePerformance =
  getAudiencePerformance as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetAudienceGrowth =
  getAudienceGrowth as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetEngagement =
  getEngagementAnalytics as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetHistory =
  getPerformanceHistory as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetReport =
  getCampaignReport as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiGetPosts =
  getCampaignPosts as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiCreateCampaign =
  createCampaign as unknown as (
    payload: RecordLike
  ) => Promise<unknown>;

const apiUpdateCampaign =
  updateCampaign as unknown as (
    campaignId: number,
    payload: RecordLike
  ) => Promise<unknown>;

const apiDeleteCampaign =
  deleteCampaign as unknown as (
    campaignId: number
  ) => Promise<unknown>;

const apiUpdatePerformance =
  updateCampaignPerformance as unknown as (
    campaignId: number,
    payload: RecordLike
  ) => Promise<unknown>;

/* ============================================================
   SAMPLE CAMPAIGNS FOR DEMO & FALLBACK
============================================================ */

const SAMPLE_CAMPAIGNS: CampaignView[] = [
  {
    id: 1,
    name: "Q4 Product Launch - AI Copilot",
    platform: "LinkedIn, Twitter",
    description:
      "Multi-channel launch campaign for SocialPilot AI Scenario Planner and Content Assistant.",
    objective: "Lead Generation & Signups",
    status: "active",
    start_date: "2026-10-01",
    end_date: "2026-11-15",
    budget: 8000,
    spent: 4350,
    target_reach: 200000,
    target_engagement: 18000,
    target_clicks: 6000,
    actual_reach: 184500,
    actual_engagement: 16820,
    actual_clicks: 5410,
    roi: 286,
    created_at: "2026-09-28T10:00:00Z",
    updated_at: "2026-10-02T12:00:00Z",
  },
  {
    id: 2,
    name: "SaaS Growth Blitz - LinkedIn Authority",
    platform: "LinkedIn",
    description:
      "Thought leadership and executive branding sprint targeting founders and marketing leads.",
    objective: "Brand Authority & Engagement",
    status: "active",
    start_date: "2026-09-15",
    end_date: "2026-10-30",
    budget: 5000,
    spent: 3120,
    target_reach: 120000,
    target_engagement: 10000,
    target_clicks: 3500,
    actual_reach: 112400,
    actual_engagement: 9870,
    actual_clicks: 3410,
    roi: 216,
    created_at: "2026-09-14T08:00:00Z",
    updated_at: "2026-10-01T15:30:00Z",
  },
  {
    id: 3,
    name: "Brand Awareness 2026 - Multi-Platform",
    platform: "Instagram, YouTube, X",
    description:
      "Video series, carousels, and reels showcasing social scheduling automation.",
    objective: "Audience Growth & Reach",
    status: "active",
    start_date: "2026-08-01",
    end_date: "2026-12-31",
    budget: 15000,
    spent: 9800,
    target_reach: 400000,
    target_engagement: 32000,
    target_clicks: 12000,
    actual_reach: 345000,
    actual_engagement: 29400,
    actual_clicks: 10200,
    roi: 198,
    created_at: "2026-07-25T11:00:00Z",
    updated_at: "2026-10-02T09:00:00Z",
  },
  {
    id: 4,
    name: "DevRel Community Outreach",
    platform: "X, YouTube",
    description:
      "Technical tutorials, API release announcements, and developer hackathon highlights.",
    objective: "Developer Acquisition",
    status: "completed",
    start_date: "2026-08-15",
    end_date: "2026-09-30",
    budget: 4000,
    spent: 3950,
    target_reach: 100000,
    target_engagement: 8500,
    target_clicks: 3000,
    actual_reach: 98200,
    actual_engagement: 8140,
    actual_clicks: 2950,
    roi: 174,
    created_at: "2026-08-10T09:00:00Z",
    updated_at: "2026-09-30T18:00:00Z",
  },
];

/* ============================================================
   HELPERS
============================================================ */

function isRecord(value: unknown): value is RecordLike {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asRecord(value: unknown): RecordLike {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function stringValue(
  value: unknown,
  fallback = ""
): string {
  return typeof value === "string"
    ? value
    : value == null
      ? fallback
      : String(value);
}

function nullableString(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value);
}

function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(value);
}

function formatCurrency(
  value: number
): string {
  return `₹${new Intl.NumberFormat(
    "en-IN"
  ).format(Math.round(value))}`;
}

function formatPercent(
  value: number
): string {
  return `${numberValue(value).toFixed(2)}%`;
}

function normalizePlatform(
  value: unknown
): string {
  return stringValue(
    value,
    "Unknown"
  );
}

/* ============================================================
   NORMALIZERS
============================================================ */

function normalizeCampaign(
  value: unknown,
  index = 0
): CampaignView {
  const item = asRecord(value);

  return {
    id: numberValue(
      item.id,
      index + 1
    ),

    name: stringValue(
      item.name ??
        item.campaign_name,
      "Untitled Campaign"
    ),

    platform:
      normalizePlatform(
        item.platform
      ),

    description:
      stringValue(
        item.description,
        ""
      ),

    objective:
      stringValue(
        item.objective ??
          item.objectives,
        ""
      ),

    status:
      stringValue(
        item.status,
        "draft"
      ),

    start_date:
      nullableString(
        item.start_date
      ),

    end_date:
      nullableString(
        item.end_date
      ),

    budget:
      numberValue(
        item.budget
      ),

    spent:
      numberValue(
        item.spent ??
          item.actual_spent
      ),

    target_reach:
      numberValue(
        item.target_reach
      ),

    target_engagement:
      numberValue(
        item.target_engagement
      ),

    target_clicks:
      numberValue(
        item.target_clicks
      ),

    actual_reach:
      numberValue(
        item.actual_reach ??
          item.reach
      ),

    actual_engagement:
      numberValue(
        item.actual_engagement ??
          item.engagement
      ),

    actual_clicks:
      numberValue(
        item.actual_clicks ??
          item.clicks
      ),

    roi:
      numberValue(
        item.roi
      ),

    created_at:
      nullableString(
        item.created_at
      ),

    updated_at:
      nullableString(
        item.updated_at
      ),
  };
}

function normalizeCampaigns(
  value: unknown
): CampaignView[] {
  const source =
    asRecord(value);

  const raw =
    Array.isArray(value)
      ? value
      : source.campaigns ??
        source.items ??
        source.data ??
        [];

  return asArray(raw).map(
    (item, index) =>
      normalizeCampaign(
        item,
        index
      )
  );
}

function normalizeSummary(
  value: unknown,
  campaigns: CampaignView[]
): SummaryView {
  const item =
    asRecord(value);

  return {
    total_campaigns:
      numberValue(
        item.total_campaigns,
        campaigns.length
      ),

    active_campaigns:
      numberValue(
        item.active_campaigns,
        campaigns.filter(
          (campaign) =>
            [
              "active",
              "running",
              "in_progress",
            ].includes(
              campaign.status.toLowerCase()
            )
        ).length
      ),

    total_reach:
      numberValue(
        item.total_reach,
        campaigns.reduce(
          (
            sum,
            campaign
          ) =>
            sum +
            campaign.actual_reach,
          0
        )
      ),

    average_roi:
      numberValue(
        item.average_roi,
        campaigns.length
          ? campaigns.reduce(
              (
                sum,
                campaign
              ) =>
                sum +
                campaign.roi,
              0
            ) /
              campaigns.length
          : 0
      ),

    total_budget:
      numberValue(
        item.total_budget,
        campaigns.reduce(
          (
            sum,
            campaign
          ) =>
            sum +
            campaign.budget,
          0
        )
      ),

    total_spent:
      numberValue(
        item.total_spent,
        campaigns.reduce(
          (
            sum,
            campaign
          ) =>
            sum +
            campaign.spent,
          0
        )
      ),
  };
}

function normalizeAnalytics(
  value: unknown,
  campaign: CampaignView | null
): AnalyticsView {
  const item =
    asRecord(value);

  const actualReach =
    numberValue(
      item.actual_reach ??
        item.reach,
      campaign?.actual_reach ??
        0
    );

  const actualEngagement =
    numberValue(
      item.actual_engagement ??
        item.engagement,
      campaign?.actual_engagement ??
        0
    );

  const actualClicks =
    numberValue(
      item.actual_clicks ??
        item.clicks,
      campaign?.actual_clicks ??
        0
    );

  const targetReach =
    numberValue(
      item.target_reach,
      campaign?.target_reach ??
        0
    );

  const targetEngagement =
    numberValue(
      item.target_engagement,
      campaign?.target_engagement ??
        0
    );

  const targetClicks =
    numberValue(
      item.target_clicks,
      campaign?.target_clicks ??
        0
    );

  const budget =
    numberValue(
      item.budget,
      campaign?.budget ??
        0
    );

  const spent =
    numberValue(
      item.spent,
      campaign?.spent ??
        0
    );

  const reachAchievement =
    numberValue(
      item.reach_achievement,
      targetReach > 0
        ? (actualReach /
            targetReach) *
          100
        : 0
    );

  const engagementAchievement =
    numberValue(
      item.engagement_achievement,
      targetEngagement > 0
        ? (actualEngagement /
            targetEngagement) *
          100
        : 0
    );

  const clickAchievement =
    numberValue(
      item.click_achievement,
      targetClicks > 0
        ? (actualClicks /
            targetClicks) *
          100
        : 0
    );

  return {
    total_posts:
      numberValue(
        item.total_posts
      ),

    published_posts:
      numberValue(
        item.published_posts
      ),

    failed_posts:
      numberValue(
        item.failed_posts
      ),

    target_reach:
      targetReach,

    actual_reach:
      actualReach,

    target_engagement:
      targetEngagement,

    actual_engagement:
      actualEngagement,

    target_clicks:
      targetClicks,

    actual_clicks:
      actualClicks,

    budget,

    spent,

    budget_used:
      numberValue(
        item.budget_used,
        budget > 0
          ? (spent / budget) *
            100
          : 0
      ),

    reach_achievement:
      reachAchievement,

    engagement_achievement:
      engagementAchievement,

    click_achievement:
      clickAchievement,

    roi:
      numberValue(
        item.roi,
        campaign?.roi ??
          0
      ),

    engagement_rate:
      numberValue(
        item.engagement_rate,
        actualReach > 0
          ? (actualEngagement /
              actualReach) *
            100
          : 0
      ),

    ctr:
      numberValue(
        item.ctr,
        actualReach > 0
          ? (actualClicks /
              actualReach) *
            100
          : 0
      ),
  };
}

function normalizeComparison(
  value: unknown
): ComparisonView[] {
  const source =
    asRecord(value);

  const raw =
    Array.isArray(value)
      ? value
      : source.comparison ??
        source.items ??
        source.data ??
        [];

  return asArray(raw).map(
    (
      entry,
      index
    ) => {
      const item =
        asRecord(entry);

      return {
        id:
          numberValue(
            item.id,
            index + 1
          ),

        campaign_name:
          stringValue(
            item.campaign_name ??
              item.name,
            "Campaign"
          ),

        platform:
          stringValue(
            item.platform,
            "Unknown"
          ),

        budget:
          numberValue(
            item.budget
          ),

        spent:
          numberValue(
            item.spent
          ),

        actual_reach:
          numberValue(
            item.actual_reach ??
              item.reach
          ),

        actual_engagement:
          numberValue(
            item.actual_engagement ??
              item.engagement
          ),

        actual_clicks:
          numberValue(
            item.actual_clicks ??
              item.clicks
          ),

        roi:
          numberValue(
            item.roi
          ),
      };
    }
  );
}

function normalizeAudiencePerformance(
  value: unknown,
  campaign: CampaignView | null
): AudiencePerformanceView {
  const item =
    asRecord(value);

  const actualReach =
    numberValue(
      item.actual_reach,
      campaign?.actual_reach ??
        0
    );

  const actualEngagement =
    numberValue(
      item.actual_engagement,
      campaign?.actual_engagement ??
        0
    );

  const actualClicks =
    numberValue(
      item.actual_clicks,
      campaign?.actual_clicks ??
        0
    );

  return {
    target_reach:
      numberValue(
        item.target_reach,
        campaign?.target_reach ??
          0
      ),

    actual_reach:
      actualReach,

    reach_growth:
      numberValue(
        item.reach_growth
      ),

    target_engagement:
      numberValue(
        item.target_engagement,
        campaign?.target_engagement ??
          0
      ),

    actual_engagement:
      actualEngagement,

    engagement_growth:
      numberValue(
        item.engagement_growth
      ),

    actual_clicks:
      actualClicks,

    click_growth:
      numberValue(
        item.click_growth
      ),

    engagement_rate:
      numberValue(
        item.engagement_rate,
        actualReach > 0
          ? (actualEngagement /
              actualReach) *
            100
          : 0
      ),

    ctr:
      numberValue(
        item.ctr,
        actualReach > 0
          ? (actualClicks /
              actualReach) *
            100
          : 0
      ),
  };
}

function normalizeAudienceGrowth(
  value: unknown,
  campaign: CampaignView | null
): AudienceGrowthView {
  const item =
    asRecord(value);

  const currentReach =
    numberValue(
      item.current_reach ??
        item.latest_recorded_reach,
      campaign?.actual_reach ??
        0
    );

  const firstReach =
    numberValue(
      item.first_recorded_reach
    );

  const latestReach =
    numberValue(
      item.latest_recorded_reach,
      currentReach
    );

  return {
    first_recorded_reach:
      firstReach,

    latest_recorded_reach:
      latestReach,

    current_reach:
      currentReach,

    reach_growth:
      numberValue(
        item.reach_growth,
        firstReach > 0
          ? ((latestReach -
                firstReach) /
              firstReach) *
            100
          : 0
      ),

    first_recorded_at:
      nullableString(
        item.first_recorded_at
      ),

    latest_recorded_at:
      nullableString(
        item.latest_recorded_at
      ),

    target_reach:
      numberValue(
        item.target_reach,
        campaign?.target_reach ??
          0
      ),

    current_reach_gap:
      numberValue(
        item.current_reach_gap,
        Math.max(
          (campaign?.target_reach ??
            0) -
            currentReach,
          0
        )
      ),
  };
}

function normalizeHistory(
  value: unknown
): HistoryView[] {
  const source =
    asRecord(value);

  const raw =
    Array.isArray(value)
      ? value
      : source.history ??
        source.items ??
        source.data ??
        [];

  return asArray(raw).map(
    (entry) => {
      const item =
        asRecord(entry);

      return {
        id:
          item.id == null
            ? undefined
            : numberValue(
                item.id
              ),

        recorded_at:
          nullableString(
            item.recorded_at ??
              item.created_at ??
              item.date
          ),

        reach:
          numberValue(
            item.reach
          ),

        engagement:
          numberValue(
            item.engagement
          ),

        clicks:
          numberValue(
            item.clicks
          ),

        roi:
          numberValue(
            item.roi
          ),
      };
    }
  );
}

function normalizeEngagement(
  value: unknown,
  campaign: CampaignView | null,
  history: HistoryView[]
): EngagementView {
  const item =
    asRecord(value);

  const actualEngagement =
    numberValue(
      item.actual_engagement,
      campaign?.actual_engagement ??
        0
    );

  const targetEngagement =
    numberValue(
      item.target_engagement,
      campaign?.target_engagement ??
        0
    );

  const historyPoints =
    history.map(
      (
        point,
        index
      ) => ({
        date:
          point.recorded_at
            ? formatDate(
                point.recorded_at
              )
            : `Point ${
                index + 1
              }`,

        engagement:
          point.engagement,
      })
    );

  return {
    target_engagement:
      targetEngagement,

    actual_engagement:
      actualEngagement,

    engagement_growth:
      numberValue(
        item.engagement_growth
      ),

    engagement_rate:
      numberValue(
        item.engagement_rate,
        campaign &&
        campaign.actual_reach >
          0
          ? (actualEngagement /
              campaign.actual_reach) *
            100
          : 0
      ),

    engagement_gap:
      numberValue(
        item.engagement_gap,
        Math.max(
          targetEngagement -
            actualEngagement,
          0
        )
      ),

    average_historical_engagement:
      numberValue(
        item.average_historical_engagement,
        history.length > 0
          ? history.reduce(
              (
                sum,
                point
              ) =>
                sum +
                point.engagement,
              0
            ) /
              history.length
          : 0
      ),

    roi:
      numberValue(
        item.roi,
        campaign?.roi ??
          0
      ),

    total_posts:
      numberValue(
        item.total_posts
      ),

    published_posts:
      numberValue(
        item.published_posts
      ),

    failed_posts:
      numberValue(
        item.failed_posts
      ),

    history_points:
      historyPoints,
  };
}

function normalizeReport(
  value: unknown,
  campaign: CampaignView | null,
  analytics: AnalyticsView
): ReportView {
  const item =
    asRecord(value);

  return {
    campaign_name:
      stringValue(
        item.campaign_name ??
          item.name,
        campaign?.name ??
          "Campaign"
      ),

    platform:
      stringValue(
        item.platform,
        campaign?.platform ??
          "Unknown"
      ),

    status:
      stringValue(
        item.status,
        campaign?.status ??
          "draft"
      ),

    start_date:
      nullableString(
        item.start_date
      ) ??
      campaign?.start_date ??
      null,

    end_date:
      nullableString(
        item.end_date
      ) ??
      campaign?.end_date ??
      null,

    budget:
      numberValue(
        item.budget,
        campaign?.budget ??
          0
      ),

    spent:
      numberValue(
        item.spent,
        campaign?.spent ??
          0
      ),

    target_reach:
      numberValue(
        item.target_reach,
        analytics.target_reach
      ),

    actual_reach:
      numberValue(
        item.actual_reach,
        analytics.actual_reach
      ),

    target_engagement:
      numberValue(
        item.target_engagement,
        analytics.target_engagement
      ),

    actual_engagement:
      numberValue(
        item.actual_engagement,
        analytics.actual_engagement
      ),

    actual_clicks:
      numberValue(
        item.actual_clicks,
        analytics.actual_clicks
      ),

    roi:
      numberValue(
        item.roi,
        analytics.roi
      ),

    total_posts:
      numberValue(
        item.total_posts,
        analytics.total_posts
      ),

    published_posts:
      numberValue(
        item.published_posts,
        analytics.published_posts
      ),

    failed_posts:
      numberValue(
        item.failed_posts,
        analytics.failed_posts
      ),
  };
}

function normalizePosts(
  value: unknown
): PostView[] {
  const source =
    asRecord(value);

  const raw =
    Array.isArray(value)
      ? value
      : source.posts ??
        source.items ??
        source.data ??
        [];

  return asArray(raw).map(
    (
      entry,
      index
    ) => {
      const item =
        asRecord(entry);

      const platformsValue =
        item.platforms;

      const platforms =
        Array.isArray(
          platformsValue
        )
          ? platformsValue.map(
              (platform) =>
                String(
                  platform
                )
            )
          : platformsValue
            ? [
                String(
                  platformsValue
                ),
              ]
            : [];

      return {
        id:
          numberValue(
            item.id ??
              item.post_id,
            index + 1
          ),

        content:
          stringValue(
            item.content,
            "No content"
          ),

        platforms,

        status:
          stringValue(
            item.status,
            "draft"
          ),

        scheduled_at:
          nullableString(
            item.scheduled_at
          ),

        published_at:
          nullableString(
            item.published_at
          ),

        created_at:
          nullableString(
            item.created_at
          ),
      };
    }
  );
}

/* ============================================================
   STATUS
============================================================ */

function statusClass(
  status: string
): string {
  const normalized =
    status.toLowerCase();

  if (
    normalized === "active" ||
    normalized === "running" ||
    normalized === "published"
  ) {
    return "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
  }

  if (
    normalized ===
    "completed"
  ) {
    return "bg-blue-950/80 text-blue-300 border-blue-800/60";
  }

  if (
    normalized ===
    "paused"
  ) {
    return "bg-amber-950/80 text-amber-300 border-amber-800/60";
  }

  return "bg-slate-800 text-slate-300 border-slate-700";
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function CampaignsPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);
  const [
    campaigns,
    setCampaigns,
  ] = useState<
    CampaignView[]
  >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<SummaryView>({
      total_campaigns: 0,
      active_campaigns: 0,
      total_reach: 0,
      average_roi: 0,
      total_budget: 0,
      total_spent: 0,
    });

  const [
    selectedCampaignId,
    setSelectedCampaignId,
  ] =
    useState<number | null>(
      null
    );

  /*
    IMPORTANT FIX:

    selectedCampaign is no longer stored
    separately in React state.

    It is derived directly from the
    selectedCampaignId and campaigns list.

    This prevents the
    react-hooks/set-state-in-effect
    ESLint error.
  */

  const selectedCampaign =
    useMemo(
      () =>
        campaigns.find(
          (campaign) =>
            campaign.id ===
            selectedCampaignId
        ) ?? null,
      [
        campaigns,
        selectedCampaignId,
      ]
    );

  const [
    analytics,
    setAnalytics,
  ] =
    useState<
      AnalyticsView | null
    >(null);

  const [
    comparison,
    setComparison,
  ] =
    useState<
      ComparisonView[]
    >([]);

  const [
    audiencePerformance,
    setAudiencePerformance,
  ] =
    useState<
      AudiencePerformanceView | null
    >(null);

  const [
    audienceGrowth,
    setAudienceGrowth,
  ] =
    useState<
      AudienceGrowthView | null
    >(null);

  const [
    history,
    setHistory,
  ] =
    useState<
      HistoryView[]
    >([]);

  const [
    engagement,
    setEngagement,
  ] =
    useState<
      EngagementView | null
    >(null);

  const [
    report,
    setReport,
  ] =
    useState<
      ReportView | null
    >(null);

  const [
    posts,
    setPosts,
  ] =
    useState<
      PostView[]
    >([]);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>(
      "overview"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    showCreateModal,
    setShowCreateModal,
  ] =
    useState(false);

  const [
    showEditModal,
    setShowEditModal,
  ] =
    useState(false);

  const [
    showPerformanceModal,
    setShowPerformanceModal,
  ] =
    useState(false);

  const [
    editingCampaign,
    setEditingCampaign,
  ] =
    useState<
      CampaignView | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState({
      name: "",
      platform:
        "Facebook",
      description: "",
      objective: "",
      start_date: "",
      end_date: "",
      budget: "",
      target_reach: "",
      target_engagement:
        "",
      target_clicks:
        "",
    });

  const [
    performanceForm,
    setPerformanceForm,
  ] =
    useState({
      reach: "",
      engagement: "",
      clicks: "",
      spent: "",
      roi: "",
    });

  /* ==========================================================
     EXPORT REPORT HANDLERS
  ========================================================== */

  const handleExportPDF = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportCSV = () => {
    if (!selectedCampaign) return;

    const rows = [
      ["Metric", "Value"],
      ["Campaign Name", `"${selectedCampaign.name}"`],
      ["Platform", `"${selectedCampaign.platform}"`],
      ["Status", selectedCampaign.status],
      ["Objective", `"${selectedCampaign.objective || "N/A"}"`],
      ["Start Date", selectedCampaign.start_date || "N/A"],
      ["End Date", selectedCampaign.end_date || "N/A"],
      ["Budget (USD)", selectedCampaign.budget],
      ["Total Spent (USD)", selectedCampaign.spent],
      ["Budget Utilization (%)", selectedAnalytics.budget_used],
      ["ROI (%)", selectedCampaign.roi],
      ["Actual Reach", selectedCampaign.actual_reach],
      ["Target Reach", selectedCampaign.target_reach],
      ["Reach Achievement (%)", selectedAnalytics.reach_achievement],
      ["Actual Engagement", selectedCampaign.actual_engagement],
      ["Target Engagement", selectedCampaign.target_engagement],
      ["Engagement Achievement (%)", selectedAnalytics.engagement_achievement],
      ["Actual Clicks", selectedCampaign.actual_clicks],
      ["Target Clicks", selectedCampaign.target_clicks],
      ["Click Achievement (%)", selectedAnalytics.click_achievement],
      ["Engagement Rate (%)", selectedAnalytics.engagement_rate],
      ["CTR (%)", selectedAnalytics.ctr],
      ["Published Posts", selectedAnalytics.published_posts],
      ["Failed Posts", selectedAnalytics.failed_posts],
      ["Total Associated Posts", posts.length],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${selectedCampaign.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ==========================================================
     LOAD OVERVIEW
  ========================================================== */

  const loadOverview =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            campaignsData,
            summaryData,
            comparisonData,
          ] =
            await Promise.all([
              apiGetCampaigns().catch(() => null),
              apiGetSummary().catch(() => null),
              apiGetComparison().catch(() => null),
            ]);

          const normalizedCampaigns =
            normalizeCampaigns(
              campaignsData
            );

          const finalCampaigns =
            normalizedCampaigns.length > 0
              ? normalizedCampaigns
              : SAMPLE_CAMPAIGNS;

          setCampaigns(finalCampaigns);

          setSummary(
            normalizeSummary(
              summaryData,
              finalCampaigns
            )
          );

          setComparison(
            normalizeComparison(
              comparisonData ??
                finalCampaigns.map((c) => ({
                  id: c.id,
                  campaign_name: c.name,
                  platform: c.platform,
                  budget: c.budget,
                  spent: c.spent,
                  actual_reach: c.actual_reach,
                  actual_engagement: c.actual_engagement,
                  actual_clicks: c.actual_clicks,
                  roi: c.roi,
                }))
            )
          );

          /*
            Keep the current selection when
            the selected campaign still exists.
          */

          if (
            selectedCampaignId !==
              null &&
            finalCampaigns.some(
              (campaign) =>
                campaign.id ===
                selectedCampaignId
            )
          ) {
            return;
          }

          /*
            Automatically select the first
            campaign when needed.
          */

          if (
            finalCampaigns.length >
            0
          ) {
            setSelectedCampaignId(
              finalCampaigns[0].id
            );
          } else {
            setSelectedCampaignId(
              null
            );
          }
        } catch {
          setCampaigns(SAMPLE_CAMPAIGNS);
          setSummary(
            normalizeSummary(
              null,
              SAMPLE_CAMPAIGNS
            )
          );
          setSelectedCampaignId(
            SAMPLE_CAMPAIGNS[0].id
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        selectedCampaignId,
      ]
    );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadOverview();
        },
        0
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    loadOverview,
  ]);

  /* ==========================================================
     LOAD DETAILS
  ========================================================== */

  const loadDetails =
    useCallback(
      async (
        campaignId: number
      ) => {
        setDetailsLoading(
          true
        );

        setError("");

        try {
          const campaign =
            campaigns.find(
              (item) =>
                item.id ===
                campaignId
            ) ?? SAMPLE_CAMPAIGNS.find((item) => item.id === campaignId) ?? null;

          const [
            analyticsData,
            audiencePerformanceData,
            audienceGrowthData,
            historyData,
            postsData,
            reportData,
            engagementData,
          ] =
            await Promise.all([
              apiGetAnalytics(
                campaignId
              ).catch(() => null),

              apiGetAudiencePerformance(
                campaignId
              ).catch(() => null),

              apiGetAudienceGrowth(
                campaignId
              ).catch(() => null),

              apiGetHistory(
                campaignId
              ).catch(() => null),

              apiGetPosts(
                campaignId
              ).catch(() => null),

              apiGetReport(
                campaignId
              ).catch(() => null),

              apiGetEngagement(
                campaignId
              ).catch(() => null),
            ]);

          const normalizedHistory =
            normalizeHistory(
              historyData
            );

          const normalizedAnalytics =
            normalizeAnalytics(
              analyticsData,
              campaign
            );

          setAnalytics(
            normalizedAnalytics
          );

          setAudiencePerformance(
            normalizeAudiencePerformance(
              audiencePerformanceData,
              campaign
            )
          );

          setAudienceGrowth(
            normalizeAudienceGrowth(
              audienceGrowthData,
              campaign
            )
          );

          setHistory(
            normalizedHistory
          );

          setEngagement(
            normalizeEngagement(
              engagementData,
              campaign,
              normalizedHistory
            )
          );

          setReport(
            normalizeReport(
              reportData,
              campaign,
              normalizedAnalytics
            )
          );

          setPosts(
            normalizePosts(
              postsData
            )
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Failed to load campaign details."
          );
        } finally {
          setDetailsLoading(
            false
          );
        }
      },
      [
        campaigns,
      ]
    );

  /*
    IMPORTANT FIX:

    There is NO setSelectedCampaign()
    inside this effect.

    selectedCampaign is derived with useMemo above.
  */

  useEffect(() => {
    if (
      selectedCampaignId ===
      null
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void loadDetails(
            selectedCampaignId
          );
        },
        0
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    selectedCampaignId,
    loadDetails,
  ]);

  /* ==========================================================
     FORM HELPERS
  ========================================================== */

  const resetForm = () => {
    setForm({
      name: "",
      platform:
        "Facebook",
      description: "",
      objective: "",
      start_date: "",
      end_date: "",
      budget: "",
      target_reach: "",
      target_engagement:
        "",
      target_clicks:
        "",
    });
  };

  const openCreateModal =
    () => {
      resetForm();

      setEditingCampaign(
        null
      );

      setShowCreateModal(
        true
      );
    };

  const openEditModal = (
    campaign: CampaignView
  ) => {
    setEditingCampaign(
      campaign
    );

    setForm({
      name:
        campaign.name,

      platform:
        campaign.platform,

      description:
        campaign.description,

      objective:
        campaign.objective,

      start_date:
        campaign.start_date
          ? campaign.start_date.slice(
              0,
              10
            )
          : "",

      end_date:
        campaign.end_date
          ? campaign.end_date.slice(
              0,
              10
            )
          : "",

      budget:
        campaign.budget
          ? String(
              campaign.budget
            )
          : "",

      target_reach:
        campaign.target_reach
          ? String(
              campaign.target_reach
            )
          : "",

      target_engagement:
        campaign.target_engagement
          ? String(
              campaign.target_engagement
            )
          : "",

      target_clicks:
        campaign.target_clicks
          ? String(
              campaign.target_clicks
            )
          : "",
    });

    setShowEditModal(
      true
    );
  };

  const openPerformanceModal =
    (
      campaign: CampaignView
    ) => {
      /*
        IMPORTANT:
        Do not call setSelectedCampaign here.
        The selected campaign is derived from
        selectedCampaignId.
      */

      setSelectedCampaignId(
        campaign.id
      );

      setPerformanceForm({
        reach:
          campaign.actual_reach
            ? String(
                campaign.actual_reach
              )
            : "",

        engagement:
          campaign.actual_engagement
            ? String(
                campaign.actual_engagement
              )
            : "",

        clicks:
          campaign.actual_clicks
            ? String(
                campaign.actual_clicks
              )
            : "",

        spent:
          campaign.spent
            ? String(
                campaign.spent
              )
            : "",

        roi:
          campaign.roi
            ? String(
                campaign.roi
              )
            : "",
      });

      setShowPerformanceModal(
        true
      );
    };

  /* ==========================================================
     CREATE CAMPAIGN
  ========================================================== */

  const handleCreateCampaign =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");

      try {
        const payload = {
          name:
            form.name.trim(),

          platform:
            form.platform,

          description:
            form.description.trim(),

          objective:
            form.objective.trim(),

          start_date:
            form.start_date ||
            undefined,

          end_date:
            form.end_date ||
            undefined,

          budget:
            form.budget
              ? Number(
                  form.budget
                )
              : 0,

          target_reach:
            form.target_reach
              ? Number(
                  form.target_reach
                )
              : 0,

          target_engagement:
            form.target_engagement
              ? Number(
                  form.target_engagement
                )
              : 0,

          target_clicks:
            form.target_clicks
              ? Number(
                  form.target_clicks
                )
              : 0,
        };

        const created =
          await apiCreateCampaign(
            payload
          );

        const normalized =
          normalizeCampaign(
            created
          );

        setShowCreateModal(
          false
        );

        resetForm();

        await loadOverview();

        if (
          normalized.id
        ) {
          setSelectedCampaignId(
            normalized.id
          );
        }
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to create campaign."
        );
      }
    };

  /* ==========================================================
     UPDATE CAMPAIGN
  ========================================================== */

  const handleUpdateCampaign =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !editingCampaign
      ) {
        return;
      }

      setError("");

      try {
        const payload = {
          name:
            form.name.trim(),

          platform:
            form.platform,

          description:
            form.description.trim(),

          objective:
            form.objective.trim(),

          start_date:
            form.start_date ||
            undefined,

          end_date:
            form.end_date ||
            undefined,

          budget:
            form.budget
              ? Number(
                  form.budget
                )
              : 0,

          target_reach:
            form.target_reach
              ? Number(
                  form.target_reach
                )
              : 0,

          target_engagement:
            form.target_engagement
              ? Number(
                  form.target_engagement
                )
              : 0,

          target_clicks:
            form.target_clicks
              ? Number(
                  form.target_clicks
                )
              : 0,
        };

        await apiUpdateCampaign(
          editingCampaign.id,
          payload
        );

        setShowEditModal(
          false
        );

        setEditingCampaign(
          null
        );

        await loadOverview();
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to update campaign."
        );
      }
    };

  /* ==========================================================
     ACTIVATE
  ========================================================== */

  const handleActivate =
    async (
      campaign: CampaignView
    ) => {
      try {
        await apiUpdateCampaign(
          campaign.id,
          {
            status:
              "active",
          }
        );

        await loadOverview();
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to activate campaign."
        );
      }
    };

  /* ==========================================================
     DELETE
  ========================================================== */

  const handleDelete =
    async (
      campaign: CampaignView
    ) => {
      const confirmed =
        window.confirm(
          `Delete "${campaign.name}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await apiDeleteCampaign(
          campaign.id
        );

        if (
          selectedCampaignId ===
          campaign.id
        ) {
          setSelectedCampaignId(
            null
          );
        }

        await loadOverview();
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to delete campaign."
        );
      }
    };

  /* ==========================================================
     UPDATE PERFORMANCE
  ========================================================== */

  const handleUpdatePerformance =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !selectedCampaign
      ) {
        return;
      }

      setError("");

      try {
        const payload = {
          actual_reach:
            performanceForm.reach
              ? Number(
                  performanceForm.reach
                )
              : undefined,

          actual_engagement:
            performanceForm.engagement
              ? Number(
                  performanceForm.engagement
                )
              : undefined,

          actual_clicks:
            performanceForm.clicks
              ? Number(
                  performanceForm.clicks
                )
              : undefined,

          spent:
            performanceForm.spent
              ? Number(
                  performanceForm.spent
                )
              : undefined,

          roi:
            performanceForm.roi
              ? Number(
                  performanceForm.roi
                )
              : 0,
        };

        await apiUpdatePerformance(
          selectedCampaign.id,
          payload
        );

        setShowPerformanceModal(
          false
        );

        await loadOverview();

        await loadDetails(
          selectedCampaign.id
        );
      } catch (
        err
      ) {
        setError(
          err instanceof
            Error
            ? err.message
            : "Failed to update campaign performance."
        );
      }
    };

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const selectedAnalytics =
    analytics ??
    normalizeAnalytics(
      {},
      selectedCampaign
    );

  const overviewChartData =
    selectedCampaign
      ? [
          {
            name: "Reach",
            target:
              selectedCampaign.target_reach,
            actual:
              selectedCampaign.actual_reach,
          },

          {
            name:
              "Engagement",
            target:
              selectedCampaign.target_engagement,
            actual:
              selectedCampaign.actual_engagement,
          },

          {
            name: "Clicks",
            target:
              selectedCampaign.target_clicks,
            actual:
              selectedCampaign.actual_clicks,
          },
        ]
      : [];

  const budgetChartData =
    selectedCampaign
      ? [
          {
            name: "Budget",
            value:
              selectedCampaign.budget,
          },

          {
            name: "Spent",
            value:
              selectedCampaign.spent,
          },
        ]
      : [];

  const roiComparisonData =
    comparison
      .slice(0, 8)
      .map(
        (item) => ({
          name:
            item.campaign_name
              .length > 16
              ? `${item.campaign_name.slice(
                  0,
                  16
                )}…`
              : item.campaign_name,

          roi: item.roi,
        })
      );

  const historyChartData =
    history.map(
      (
        item,
        index
      ) => ({
        name:
          item.recorded_at
            ? formatDate(
                item.recorded_at
              )
            : `#${index + 1}`,

        reach:
          item.reach,

        engagement:
          item.engagement,

        clicks:
          item.clicks,

        roi:
          item.roi,
      })
    );

  const engagementPieData =
    selectedCampaign
      ? [
          {
            name: "Likes",
            value:
              Math.max(
                Math.round(
                  selectedCampaign.actual_engagement *
                    0.7
                ),
                0
              ),
          },

          {
            name:
              "Comments",
            value:
              Math.max(
                Math.round(
                  selectedCampaign.actual_engagement *
                    0.15
                ),
                0
              ),
          },

          {
            name:
              "Shares",
            value:
              Math.max(
                Math.round(
                  selectedCampaign.actual_engagement *
                    0.15
                ),
                0
              ),
          },
        ]
      : [];

  const progressValues =
    useMemo(
      () => ({
        reach:
          Math.min(
            100,
            selectedAnalytics.reach_achievement
          ),

        engagement:
          Math.min(
            100,
            selectedAnalytics.engagement_achievement
          ),

        clicks:
          Math.min(
            100,
            selectedAnalytics.click_achievement
          ),
      }),
      [
        selectedAnalytics,
      ]
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Nav />

        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

              <p className="text-sm text-slate-400">
                Loading campaigns...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              SocialPilot / Campaigns
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Campaign Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Create campaigns, track performance,
              monitor engagement, and analyse
              audience growth.
            </p>
          </div>

          <button
            type="button"
            onClick={
              openCreateModal
            }
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Create Campaign
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="font-semibold text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Campaigns"
            value={formatNumber(
              summary.total_campaigns
            )}
            subtitle="All campaigns"
          />

          <SummaryCard
            title="Active Campaigns"
            value={formatNumber(
              summary.active_campaigns
            )}
            subtitle="Currently running"
          />

          <SummaryCard
            title="Total Reach"
            value={formatNumber(
              summary.total_reach
            )}
            subtitle="Across campaigns"
          />

          <SummaryCard
            title="Average ROI"
            value={formatPercent(
              summary.average_roi
            )}
            subtitle="Campaign average"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">

          {/* CAMPAIGN LIST */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-base font-bold text-white">
                Your Campaigns
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Select a campaign to view details.
              </p>
            </div>

            <div className="max-h-[720px] overflow-y-auto p-3">
              {campaigns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-300">
                    No campaigns yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Create your first campaign.
                  </p>

                  <button
                    type="button"
                    onClick={
                      openCreateModal
                    }
                    className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(
                    (
                      campaign
                    ) => {
                      const active =
                        selectedCampaignId ===
                        campaign.id;

                      return (
                        <button
                          key={
                            campaign.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedCampaignId(
                              campaign.id
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            active
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">
                                {
                                  campaign.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  campaign.platform
                                }{" "}
                                ·{" "}
                                {formatDate(
                                  campaign.start_date
                                )}
                                {" — "}
                                {formatDate(
                                  campaign.end_date
                                )}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(
                                campaign.status
                              )}`}
                            >
                              {
                                campaign.status
                              }
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <MetricMini
                              label="Reach"
                              value={formatNumber(
                                campaign.actual_reach
                              )}
                            />

                            <MetricMini
                              label="ROI"
                              value={formatPercent(
                                campaign.roi
                              )}
                            />
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          {/* DETAILS */}

          <section className="min-w-0">

            {!selectedCampaign ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/90">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                    ◈
                  </div>

                  <h2 className="text-lg font-bold text-white">
                    Select a campaign
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Choose a campaign from the
                    list to view analytics.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* CAMPAIGN TOP CARD */}

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-sm">
                  <div className="flex flex-col gap-5 border-b border-slate-800 p-6 xl:flex-row xl:items-start xl:justify-between">

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-white">
                          {
                            selectedCampaign.name
                          }
                        </h2>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClass(
                            selectedCampaign.status
                          )}`}
                        >
                          {
                            selectedCampaign.status
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {
                          selectedCampaign.platform
                        }
                        {" · "}
                        {formatDate(
                          selectedCampaign.start_date
                        )}
                        {" — "}
                        {formatDate(
                          selectedCampaign.end_date
                        )}
                      </p>

                      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                        {
                          selectedCampaign.description ||
                          "No campaign description provided."
                        }
                      </p>

                      {selectedCampaign.objective && (
                        <div className="mt-3 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                          <span className="font-semibold text-slate-200">
                            Objective:
                          </span>{" "}
                          {
                            selectedCampaign.objective
                          }
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {selectedCampaign.status.toLowerCase() !==
                        "active" && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleActivate(
                              selectedCampaign
                            )
                          }
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Activate
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            selectedCampaign
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-950/70"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openPerformanceModal(
                            selectedCampaign
                          )
                        }
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Update Performance
                      </button>

                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-sky-100"
                      >
                        📄 Export PDF
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        📊 Export CSV
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            selectedCampaign
                          )
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* BASIC FINANCIALS */}

                  <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      label="Total Budget"
                      value={formatCurrency(
                        selectedCampaign.budget
                      )}
                    />

                    <StatCard
                      label="Total Spent"
                      value={formatCurrency(
                        selectedCampaign.spent
                      )}
                    />

                    <StatCard
                      label="Actual Reach"
                      value={formatNumber(
                        selectedCampaign.actual_reach
                      )}
                    />

                    <StatCard
                      label="ROI"
                      value={formatPercent(
                        selectedCampaign.roi
                      )}
                    />
                  </div>
                </div>

                {/* TABS */}

                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90">
                  <div className="flex min-w-max">
                    {(
                      [
                        [
                          "overview",
                          "Overview",
                        ],
                        [
                          "engagement",
                          "Engagement",
                        ],
                        [
                          "audience",
                          "Audience",
                        ],
                        [
                          "history",
                          "History",
                        ],
                        [
                          "report",
                          "Report",
                        ],
                        [
                          "posts",
                          "Posts",
                        ],
                      ] as [
                        Tab,
                        string
                      ][]
                    ).map(
                      ([
                        value,
                        label,
                      ]) => (
                        <button
                          key={
                            value
                          }
                          type="button"
                          onClick={() =>
                            setActiveTab(
                              value
                            )
                          }
                          className={`border-b-2 px-5 py-3 text-xs font-semibold transition ${
                            activeTab ===
                            value
                              ? "border-indigo-500 text-indigo-700"
                              : "border-transparent text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {
                            label
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>

                {detailsLoading ? (
                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-10 text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

                    <p className="text-sm text-slate-400">
                      Loading campaign analytics...
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">

                    {/* OVERVIEW */}

                    {activeTab ===
                      "overview" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <StatCard
                            label="Engagement"
                            value={formatNumber(
                              selectedCampaign.actual_engagement
                            )}
                          />

                          <StatCard
                            label="Engagement Rate"
                            value={formatPercent(
                              selectedAnalytics.engagement_rate
                            )}
                          />

                          <StatCard
                            label="Clicks"
                            value={formatNumber(
                              selectedCampaign.actual_clicks
                            )}
                          />

                          <StatCard
                            label="CTR"
                            value={formatPercent(
                              selectedAnalytics.ctr
                            )}
                          />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">

                          <ChartCard
                            title="Target vs Actual Performance"
                            subtitle="Campaign metrics"
                          >
                            <div className="h-80">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <BarChart
                                  data={
                                    overviewChartData
                                  }
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={
                                      false
                                    }
                                  />

                                  <XAxis
                                    dataKey="name"
                                  />

                                  <YAxis />

                                  <Tooltip />

                                  <Legend />

                                  <Bar
                                    dataKey="target"
                                    name="Target"
                                    fill="#94a3b8"
                                    radius={[
                                      5,
                                      5,
                                      0,
                                      0,
                                    ]}
                                  />

                                  <Bar
                                    dataKey="actual"
                                    name="Actual"
                                    fill="#0ea5e9"
                                    radius={[
                                      5,
                                      5,
                                      0,
                                      0,
                                    ]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                          <ChartCard
                            title="Budget Overview"
                            subtitle="Budget utilisation"
                          >
                            <div className="h-80">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <BarChart
                                  data={
                                    budgetChartData
                                  }
                                  layout="vertical"
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={
                                      false
                                    }
                                  />

                                  <XAxis
                                    type="number"
                                  />

                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={70}
                                  />

                                  <Tooltip
                                    formatter={(
                                      value
                                    ) =>
                                      formatCurrency(
                                        numberValue(
                                          value
                                        )
                                      )
                                    }
                                  />

                                  <Bar
                                    dataKey="value"
                                    fill="#8b5cf6"
                                    radius={[
                                      0,
                                      5,
                                      5,
                                      0,
                                    ]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">

                          <ProgressCard
                            title="Reach Achievement"
                            value={
                              selectedAnalytics.reach_achievement
                            }
                            progress={
                              progressValues.reach
                            }
                          />

                          <ProgressCard
                            title="Engagement Achievement"
                            value={
                              selectedAnalytics.engagement_achievement
                            }
                            progress={
                              progressValues.engagement
                            }
                          />

                          <ProgressCard
                            title="Click Achievement"
                            value={
                              selectedAnalytics.click_achievement
                            }
                            progress={
                              progressValues.clicks
                            }
                          />

                        </div>
                      </>
                    )}

                    {/* ENGAGEMENT */}

                    {activeTab ===
                      "engagement" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                          <StatCard
                            label="Total Engagement"
                            value={formatNumber(
                              selectedCampaign.actual_engagement
                            )}
                          />

                          <StatCard
                            label="Engagement Rate"
                            value={formatPercent(
                              selectedAnalytics.engagement_rate
                            )}
                          />

                          <StatCard
                            label="Clicks"
                            value={formatNumber(
                              selectedCampaign.actual_clicks
                            )}
                          />

                          <StatCard
                            label="ROI"
                            value={formatPercent(
                              selectedCampaign.roi
                            )}
                          />

                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">

                          <ChartCard
                            title="Engagement Trend"
                            subtitle="Recorded campaign performance"
                          >
                            <div className="h-80">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <LineChart
                                  data={
                                    historyChartData
                                  }
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                  />

                                  <XAxis
                                    dataKey="name"
                                  />

                                  <YAxis />

                                  <Tooltip />

                                  <Legend />

                                  <Line
                                    type="monotone"
                                    dataKey="engagement"
                                    name="Engagement"
                                    stroke="#0ea5e9"
                                    strokeWidth={
                                      3
                                    }
                                    dot={{
                                      r: 4,
                                    }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                          <ChartCard
                            title="Engagement Breakdown"
                            subtitle="Estimated interaction mix"
                          >
                            <div className="h-80">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <PieChart>
                                  <Pie
                                    data={
                                      engagementPieData
                                    }
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={
                                      100
                                    }
                                    label
                                  >
                                    {engagementPieData.map(
                                      (
                                        _entry,
                                        index
                                      ) => (
                                        <Cell
                                          key={
                                            index
                                          }
                                          fill={
                                            [
                                              "#0ea5e9",
                                              "#8b5cf6",
                                              "#10b981",
                                            ][
                                              index %
                                                3
                                            ]
                                          }
                                        />
                                      )
                                    )}
                                  </Pie>

                                  <Tooltip />

                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                        </div>

                        <div className="grid gap-4 md:grid-cols-3">

                          <InfoCard
                            title="Average Historical Engagement"
                            value={formatNumber(
                              engagement?.average_historical_engagement ??
                                0
                            )}
                          />

                          <InfoCard
                            title="Engagement Gap"
                            value={formatNumber(
                              engagement?.engagement_gap ??
                                0
                            )}
                          />

                          <InfoCard
                            title="Engagement Growth"
                            value={formatPercent(
                              engagement?.engagement_growth ??
                                0
                            )}
                          />

                        </div>
                      </>
                    )}

                    {/* AUDIENCE */}

                    {activeTab ===
                      "audience" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                          <StatCard
                            label="Current Reach"
                            value={formatNumber(
                              audienceGrowth?.current_reach ??
                                selectedCampaign.actual_reach
                            )}
                          />

                          <StatCard
                            label="Reach Growth"
                            value={formatPercent(
                              audienceGrowth?.reach_growth ??
                                0
                            )}
                          />

                          <StatCard
                            label="Target Reach"
                            value={formatNumber(
                              audienceGrowth?.target_reach ??
                                selectedCampaign.target_reach
                            )}
                          />

                          <StatCard
                            label="Reach Gap"
                            value={formatNumber(
                              audienceGrowth?.current_reach_gap ??
                                0
                            )}
                          />

                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">

                          <ChartCard
                            title="Audience Reach History"
                            subtitle="Growth over recorded points"
                          >
                            <div className="h-80">
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <LineChart
                                  data={
                                    historyChartData
                                  }
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                  />

                                  <XAxis
                                    dataKey="name"
                                  />

                                  <YAxis />

                                  <Tooltip />

                                  <Legend />

                                  <Line
                                    type="monotone"
                                    dataKey="reach"
                                    name="Reach"
                                    stroke="#10b981"
                                    strokeWidth={
                                      3
                                    }
                                    dot={{
                                      r: 4,
                                    }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                          <ChartCard
                            title="Audience Performance"
                            subtitle="Reach and engagement indicators"
                          >
                            <div className="grid gap-4 p-2">

                              <MetricRow
                                label="Reach Growth"
                                value={formatPercent(
                                  audiencePerformance?.reach_growth ??
                                    audienceGrowth?.reach_growth ??
                                    0
                                )}
                              />

                              <MetricRow
                                label="Engagement Growth"
                                value={formatPercent(
                                  audiencePerformance?.engagement_growth ??
                                    0
                                )}
                              />

                              <MetricRow
                                label="Click Growth"
                                value={formatPercent(
                                  audiencePerformance?.click_growth ??
                                    0
                                )}
                              />

                              <MetricRow
                                label="Engagement Rate"
                                value={formatPercent(
                                  audiencePerformance?.engagement_rate ??
                                    selectedAnalytics.engagement_rate
                                )}
                              />

                              <MetricRow
                                label="CTR"
                                value={formatPercent(
                                  audiencePerformance?.ctr ??
                                    selectedAnalytics.ctr
                                )}
                              />

                            </div>
                          </ChartCard>

                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
                          <h3 className="text-base font-bold text-white">
                            Audience Growth Summary
                          </h3>

                          <div className="mt-5 grid gap-4 md:grid-cols-3">

                            <InfoCard
                              title="First Recorded Reach"
                              value={formatNumber(
                                audienceGrowth?.first_recorded_reach ??
                                  0
                              )}
                              subtitle={formatDate(
                                audienceGrowth?.first_recorded_at
                              )}
                            />

                            <InfoCard
                              title="Latest Recorded Reach"
                              value={formatNumber(
                                audienceGrowth?.latest_recorded_reach ??
                                  0
                              )}
                              subtitle={formatDate(
                                audienceGrowth?.latest_recorded_at
                              )}
                            />

                            <InfoCard
                              title="Net Growth"
                              value={formatPercent(
                                audienceGrowth?.reach_growth ??
                                  0
                              )}
                            />

                          </div>
                        </div>
                      </>
                    )}

                    {/* HISTORY */}

                    {activeTab ===
                      "history" && (
                      <>
                        <ChartCard
                          title="Performance History"
                          subtitle="Reach, engagement, clicks and ROI"
                        >
                          <div className="h-96">
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >
                              <LineChart
                                data={
                                  historyChartData
                                }
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                />

                                <XAxis
                                  dataKey="name"
                                />

                                <YAxis />

                                <Tooltip />

                                <Legend />

                                <Line
                                  type="monotone"
                                  dataKey="reach"
                                  name="Reach"
                                  stroke="#0ea5e9"
                                  strokeWidth={
                                    2
                                  }
                                />

                                <Line
                                  type="monotone"
                                  dataKey="engagement"
                                  name="Engagement"
                                  stroke="#8b5cf6"
                                  strokeWidth={
                                    2
                                  }
                                />

                                <Line
                                  type="monotone"
                                  dataKey="clicks"
                                  name="Clicks"
                                  stroke="#10b981"
                                  strokeWidth={
                                    2
                                  }
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90">

                          <div className="border-b border-slate-800 px-5 py-4">
                            <h3 className="font-bold text-white">
                              Recorded Performance
                            </h3>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">

                              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">

                                <tr>
                                  <th className="px-5 py-3">
                                    Date
                                  </th>

                                  <th className="px-5 py-3">
                                    Reach
                                  </th>

                                  <th className="px-5 py-3">
                                    Engagement
                                  </th>

                                  <th className="px-5 py-3">
                                    Clicks
                                  </th>

                                  <th className="px-5 py-3">
                                    ROI
                                  </th>
                                </tr>

                              </thead>

                              <tbody>

                                {history.length ===
                                0 ? (
                                  <tr>
                                    <td
                                      colSpan={
                                        5
                                      }
                                      className="px-5 py-10 text-center text-sm text-slate-400"
                                    >
                                      No performance
                                      history
                                      recorded
                                      yet.
                                    </td>
                                  </tr>
                                ) : (
                                  history.map(
                                    (
                                      item,
                                      index
                                    ) => (
                                      <tr
                                        key={
                                          item.id ??
                                          index
                                        }
                                        className="border-t border-slate-800/80"
                                      >

                                        <td className="px-5 py-4 text-slate-300">
                                          {formatDate(
                                            item.recorded_at
                                          )}
                                        </td>

                                        <td className="px-5 py-4 font-medium text-white">
                                          {formatNumber(
                                            item.reach
                                          )}
                                        </td>

                                        <td className="px-5 py-4 text-slate-300">
                                          {formatNumber(
                                            item.engagement
                                          )}
                                        </td>

                                        <td className="px-5 py-4 text-slate-300">
                                          {formatNumber(
                                            item.clicks
                                          )}
                                        </td>

                                        <td className="px-5 py-4 text-slate-300">
                                          {formatPercent(
                                            item.roi
                                          )}
                                        </td>

                                      </tr>
                                    )
                                  )
                                )}

                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* REPORT */}

                    {activeTab ===
                      "report" && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                          <StatCard
                            label="Campaign ROI"
                            value={formatPercent(
                              report?.roi ??
                                selectedCampaign.roi
                            )}
                          />

                          <StatCard
                            label="Published Posts"
                            value={formatNumber(
                              report?.published_posts ??
                                selectedAnalytics.published_posts
                            )}
                          />

                          <StatCard
                            label="Failed Posts"
                            value={formatNumber(
                              report?.failed_posts ??
                                selectedAnalytics.failed_posts
                            )}
                          />

                          <StatCard
                            label="Budget Used"
                            value={formatPercent(
                              selectedAnalytics.budget_used
                            )}
                          />

                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">

                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                Campaign Report
                              </p>

                              <h3 className="mt-1 text-xl font-bold text-white">
                                {
                                  report?.campaign_name ??
                                  selectedCampaign.name
                                }
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                {
                                  report?.platform ??
                                  selectedCampaign.platform
                                }
                                {" · "}
                                {formatDate(
                                  report?.start_date ??
                                    selectedCampaign.start_date
                                )}
                                {" — "}
                                {formatDate(
                                  report?.end_date ??
                                    selectedCampaign.end_date
                                )}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase ${statusClass(
                                  report?.status ??
                                    selectedCampaign.status
                                )}`}
                              >
                                {
                                  report?.status ??
                                  selectedCampaign.status
                                }
                              </span>

                              <button
                                type="button"
                                onClick={handleExportPDF}
                                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-sky-100 transition shadow-sm"
                              >
                                📄 Export PDF
                              </button>

                              <button
                                type="button"
                                onClick={handleExportCSV}
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                              >
                                📊 Export CSV / Excel
                              </button>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                            <ReportMetric
                              label="Budget"
                              value={formatCurrency(
                                report?.budget ??
                                  selectedCampaign.budget
                              )}
                            />

                            <ReportMetric
                              label="Spent"
                              value={formatCurrency(
                                report?.spent ??
                                  selectedCampaign.spent
                              )}
                            />

                            <ReportMetric
                              label="Actual Reach"
                              value={formatNumber(
                                report?.actual_reach ??
                                  selectedCampaign.actual_reach
                              )}
                            />

                            <ReportMetric
                              label="Actual Engagement"
                              value={formatNumber(
                                report?.actual_engagement ??
                                  selectedCampaign.actual_engagement
                              )}
                            />

                            <ReportMetric
                              label="Actual Clicks"
                              value={formatNumber(
                                report?.actual_clicks ??
                                  selectedCampaign.actual_clicks
                              )}
                            />

                            <ReportMetric
                              label="Target Reach"
                              value={formatNumber(
                                report?.target_reach ??
                                  selectedCampaign.target_reach
                              )}
                            />

                            <ReportMetric
                              label="Target Engagement"
                              value={formatNumber(
                                report?.target_engagement ??
                                  selectedCampaign.target_engagement
                              )}
                            />

                            <ReportMetric
                              label="ROI"
                              value={formatPercent(
                                report?.roi ??
                                  selectedCampaign.roi
                              )}
                            />

                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">

                          <h3 className="text-base font-bold text-white">
                            Campaign Comparison
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            Compare campaign ROI and performance.
                          </p>

                          <div className="mt-5 h-80">
                            <ResponsiveContainer
                              width="100%"
                              height="100%"
                            >
                              <BarChart
                                data={
                                  roiComparisonData
                                }
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={
                                    false
                                  }
                                />

                                <XAxis
                                  dataKey="name"
                                />

                                <YAxis />

                                <Tooltip
                                  formatter={(
                                    value
                                  ) =>
                                    formatPercent(
                                      numberValue(
                                        value
                                      )
                                    )
                                  }
                                />

                                <Bar
                                  dataKey="roi"
                                  name="ROI"
                                  fill="#8b5cf6"
                                  radius={[
                                    5,
                                    5,
                                    0,
                                    0,
                                  ]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="mt-6 overflow-x-auto">
                            <table className="w-full min-w-[780px] text-sm">

                              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">

                                <tr>
                                  <th className="px-4 py-3">
                                    Campaign
                                  </th>

                                  <th className="px-4 py-3">
                                    Platform
                                  </th>

                                  <th className="px-4 py-3">
                                    Budget
                                  </th>

                                  <th className="px-4 py-3">
                                    Reach
                                  </th>

                                  <th className="px-4 py-3">
                                    Engagement
                                  </th>

                                  <th className="px-4 py-3">
                                    Clicks
                                  </th>

                                  <th className="px-4 py-3">
                                    ROI
                                  </th>
                                </tr>

                              </thead>

                              <tbody>

                                {comparison.map(
                                  (
                                    item
                                  ) => (
                                    <tr
                                      key={
                                        item.id
                                      }
                                      className="border-t border-slate-800/80"
                                    >

                                      <td className="px-4 py-3 font-semibold text-white">
                                        {
                                          item.campaign_name
                                        }
                                      </td>

                                      <td className="px-4 py-3 text-slate-300">
                                        {
                                          item.platform
                                        }
                                      </td>

                                      <td className="px-4 py-3">
                                        {formatCurrency(
                                          item.budget
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        {formatNumber(
                                          item.actual_reach
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        {formatNumber(
                                          item.actual_engagement
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        {formatNumber(
                                          item.actual_clicks
                                        )}
                                      </td>

                                      <td className="px-4 py-3 font-semibold">
                                        {formatPercent(
                                          item.roi
                                        )}
                                      </td>

                                    </tr>
                                  )
                                )}

                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}

                    {/* POSTS */}

                    {activeTab ===
                      "posts" && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/90">

                        <div className="border-b border-slate-800 px-6 py-5">

                          <h3 className="text-base font-bold text-white">
                            Campaign Posts
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            Content grouped under this campaign.
                          </p>

                        </div>

                        {posts.length ===
                        0 ? (
                          <div className="px-6 py-12 text-center">

                            <p className="text-sm font-semibold text-slate-300">
                              No posts linked to this campaign.
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Add posts from the Create Post page.
                            </p>

                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">

                            {posts.map(
                              (
                                post
                              ) => (
                                <div
                                  key={
                                    post.id
                                  }
                                  className="p-6"
                                >

                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                                    <div className="min-w-0">

                                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                        {
                                          post.content
                                        }
                                      </p>

                                      <div className="mt-3 flex flex-wrap gap-2">

                                        {post.platforms.map(
                                          (
                                            platform
                                          ) => (
                                            <span
                                              key={
                                                platform
                                              }
                                              className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-300"
                                            >
                                              {
                                                platform
                                              }
                                            </span>
                                          )
                                        )}

                                      </div>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClass(
                                        post.status
                                      )}`}
                                    >
                                      {
                                        post.status
                                      }
                                    </span>

                                  </div>

                                  <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-3">

                                    <div>
                                      <span className="font-semibold text-slate-300">
                                        Created:
                                      </span>{" "}
                                      {formatDate(
                                        post.created_at
                                      )}
                                    </div>

                                    <div>
                                      <span className="font-semibold text-slate-300">
                                        Scheduled:
                                      </span>{" "}
                                      {formatDate(
                                        post.scheduled_at
                                      )}
                                    </div>

                                    <div>
                                      <span className="font-semibold text-slate-300">
                                        Published:
                                      </span>{" "}
                                      {formatDate(
                                        post.published_at
                                      )}
                                    </div>

                                  </div>

                                </div>
                              )
                            )}

                          </div>
                        )}

                      </div>
                    )}

                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {/* ========================================================
         CREATE MODAL
      ======================================================== */}

      {showCreateModal && (
        <Modal
          title="Create Campaign"
          onClose={() =>
            setShowCreateModal(
              false
            )
          }
        >
          <form
            onSubmit={
              handleCreateCampaign
            }
            className="space-y-5"
          >

            <CampaignFormFields
              form={form}
              setForm={setForm}
            />

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(
                    false
                  )
                }
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-950/70"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create Campaign
              </button>

            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
         EDIT MODAL
      ======================================================== */}

      {showEditModal &&
        editingCampaign && (
          <Modal
            title="Edit Campaign"
            onClose={() =>
              setShowEditModal(
                false
              )
            }
          >
            <form
              onSubmit={
                handleUpdateCampaign
              }
              className="space-y-5"
            >

              <CampaignFormFields
                form={form}
                setForm={setForm}
              />

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowEditModal(
                      false
                    )
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-950/70"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Changes
                </button>

              </div>
            </form>
          </Modal>
        )}

      {/* ========================================================
         PERFORMANCE MODAL
      ======================================================== */}

      {showPerformanceModal &&
        selectedCampaign && (
          <Modal
            title="Update Performance"
            onClose={() =>
              setShowPerformanceModal(
                false
              )
            }
          >
            <form
              onSubmit={
                handleUpdatePerformance
              }
              className="space-y-5"
            >

              <div className="grid gap-4 sm:grid-cols-2">

                <NativeField
                  label="Actual Reach"
                  type="number"
                  value={
                    performanceForm.reach
                  }
                  onChange={(
                    event
                  ) =>
                    setPerformanceForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        reach:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. 25000"
                />

                <NativeField
                  label="Actual Engagement"
                  type="number"
                  value={
                    performanceForm.engagement
                  }
                  onChange={(
                    event
                  ) =>
                    setPerformanceForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        engagement:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. 3250"
                />

                <NativeField
                  label="Actual Clicks"
                  type="number"
                  value={
                    performanceForm.clicks
                  }
                  onChange={(
                    event
                  ) =>
                    setPerformanceForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        clicks:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. 950"
                />

                <NativeField
                  label="Spent"
                  type="number"
                  value={
                    performanceForm.spent
                  }
                  onChange={(
                    event
                  ) =>
                    setPerformanceForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        spent:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. 25000"
                />

                <NativeField
                  label="ROI (%)"
                  type="number"
                  step="0.01"
                  value={
                    performanceForm.roi
                  }
                  onChange={(
                    event
                  ) =>
                    setPerformanceForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        roi:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. 18.50"
                />

              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs leading-5 text-indigo-800">
                  Updating performance stores
                  the current campaign metrics and
                  adds a performance-history record.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowPerformanceModal(
                      false
                    )
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-950/70"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Performance
                </button>

              </div>
            </form>
          </Modal>
        )}

    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {subtitle}
      </p>

    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">

      <p className="text-xs font-semibold text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-white">
        {value}
      </p>

    </div>
  );
}

function MetricMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-950/80 p-2.5">

      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-200">
        {value}
      </p>

    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">

      <div className="mb-5">

        <h3 className="text-base font-bold text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>

      </div>

      {children}

    </div>
  );
}

function ProgressCard({
  title,
  value,
  progress,
}: {
  title: string;
  value: number;
  progress: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-semibold text-slate-300">
          {title}
        </p>

        <span className="text-sm font-bold text-white">
          {formatPercent(
            value
          )}
        </span>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800/80">

        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                progress
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

function InfoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">

      <p className="text-xs font-semibold text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-white">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>
      )}

    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-3">

      <span className="text-sm text-slate-300">
        {label}
      </span>

      <span className="font-bold text-white">
        {value}
      </span>

    </div>
  );
}

function ReportMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/70 p-4">

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   NATIVE FORM FIELD
============================================================ */

function NativeField({
  label,
  type,
  value,
  onChange,
  placeholder,
  step,
  required = false,
}: {
  label: string;
  type: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  placeholder?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-xs font-semibold text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={
          placeholder
        }
        step={step}
        required={required}
        style={{ colorScheme: "dark", color: "#f8fafc", backgroundColor: "#0f172a" }}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </label>
  );
}

/* ============================================================
   CAMPAIGN FORM
============================================================ */

function CampaignFormFields({
  form,
  setForm,
}: {
  form: {
    name: string;
    platform: string;
    description: string;
    objective: string;
    start_date: string;
    end_date: string;
    budget: string;
    target_reach: string;
    target_engagement: string;
    target_clicks: string;
  };

  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      platform: string;
      description: string;
      objective: string;
      start_date: string;
      end_date: string;
      budget: string;
      target_reach: string;
      target_engagement: string;
      target_clicks: string;
    }>
  >;
}) {
  return (
    <>

      <div className="grid gap-4 sm:grid-cols-2">

        <NativeField
          label="Campaign Name"
          type="text"
          value={
            form.name
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                name:
                  event.target.value,
              })
            )
          }
          placeholder="e.g. Diwali Promotion"
          required
        />

        <label className="block">

          <span className="mb-2 block text-xs font-semibold text-slate-300">
            Platform
          </span>

          <select
            value={
              form.platform
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  previous
                ) => ({
                  ...previous,
                  platform:
                    event.target.value,
                })
              )
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option>
              Facebook
            </option>

            <option>
              Instagram
            </option>

            <option>
              LinkedIn
            </option>

            <option>
              X
            </option>

            <option>
              YouTube
            </option>

            <option>
              Pinterest
            </option>

            <option>
              Multi-Platform
            </option>

          </select>

        </label>

      </div>

      <NativeField
        label="Description"
        type="text"
        value={
          form.description
        }
        onChange={(
          event
        ) =>
          setForm(
            (
              previous
            ) => ({
              ...previous,
              description:
                event.target.value,
            })
          )
        }
        placeholder="Brief campaign description"
      />

      <NativeField
        label="Objective"
        type="text"
        value={
          form.objective
        }
        onChange={(
          event
        ) =>
          setForm(
            (
              previous
            ) => ({
              ...previous,
              objective:
                event.target.value,
            })
          )
        }
        placeholder="e.g. increase awareness and engagement"
      />

      <div className="grid gap-4 sm:grid-cols-2">

        <NativeField
          label="Start Date"
          type="date"
          value={
            form.start_date
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                start_date:
                  event.target.value,
              })
            )
          }
          required
        />

        <NativeField
          label="End Date"
          type="date"
          value={
            form.end_date
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                end_date:
                  event.target.value,
              })
            )
          }
          required
        />

      </div>

      <div className="grid gap-4 sm:grid-cols-2">

        <NativeField
          label="Budget"
          type="number"
          value={
            form.budget
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                budget:
                  event.target.value,
              })
            )
          }
          placeholder="e.g. 74000"
          required
        />

        <NativeField
          label="Target Reach"
          type="number"
          value={
            form.target_reach
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                target_reach:
                  event.target.value,
              })
            )
          }
          placeholder="e.g. 100000"
        />

        <NativeField
          label="Target Engagement"
          type="number"
          value={
            form.target_engagement
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                target_engagement:
                  event.target.value,
              })
            )
          }
          placeholder="e.g. 10000"
        />

        <NativeField
          label="Target Clicks"
          type="number"
          value={
            form.target_clicks
          }
          onChange={(
            event
          ) =>
            setForm(
              (
                previous
              ) => ({
                ...previous,
                target_clicks:
                  event.target.value,
              })
            )
          }
          placeholder="e.g. 2500"
        />

      </div>

    </>
  );
}

/* ============================================================
   MODAL
============================================================ */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-2xl">

        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">

          <h2 className="text-lg font-bold text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
          >
            ×
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

      </div>
    </div>
  );
}
