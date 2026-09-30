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
