import { API_BASE } from './campaigns';
import type { CampaignAnalytics, PostAnalytics, OverviewAnalytics } from '@/types/analytics';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getOverviewAnalytics(): Promise<OverviewAnalytics> {
  const response = await fetch(`${API_BASE}/analytics/overview`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch analytics overview' }));
    throw new Error(err.detail || 'Failed to fetch analytics overview');
  }
  return response.json();
}

export async function getCampaignAnalytics(campaignId: number): Promise<CampaignAnalytics> {
  const response = await fetch(`${API_BASE}/analytics/campaigns/${campaignId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch campaign analytics' }));
    throw new Error(err.detail || 'Failed to fetch campaign analytics');
  }
  return response.json();
}

export async function getPostAnalytics(postId: number): Promise<PostAnalytics> {
  const response = await fetch(`${API_BASE}/analytics/posts/${postId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to fetch post analytics' }));
    throw new Error(err.detail || 'Failed to fetch post analytics');
  }
  return response.json();
}

