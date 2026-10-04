export interface PlatformStats {
  platform: string;
  status: string;
  available: boolean;
  reason?: string;
  likes?: number;
  comments?: number;
  views?: number;
  reach?: number;
  shares?: number;
  saved?: number;
}

export interface PostAnalytics {
  post_id: number;
  title?: string | null;
  campaign_id?: number | null;
  platforms: PlatformStats[];
}

export interface CampaignTotals {
  likes: number;
  comments: number;
  views: number;
  reach: number;
  shares: number;
  saved: number;
}

export interface CampaignAnalytics {
  campaign_id: number;
  campaign_name: string;
  totals: CampaignTotals;
  posts: PostAnalytics[];
}

export interface PlatformSummary {
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  saved: number;
  posts_count: number;
}

export interface OverviewAnalytics {
  totals: CampaignTotals;
  total_posts: number;
  published_posts: number;
  scheduled_posts: number;
  draft_posts: number;
  failed_posts: number;
  platform_summary: PlatformSummary[];
  posts: PostAnalytics[];
}

