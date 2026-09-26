import type {
  CampaignOut,
  CampaignCreate,
  CampaignUpdate,
} from '@/types/campaign';
import type { PostOut } from '@/types/post';

export const API_BASE = 'http://localhost:8000';

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response, defaultError: string): Promise<T> {
  if (!response.ok) {
    let errorDetail = defaultError;
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || defaultError;
    } catch {
      // fallback to default error
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

export async function getCampaigns(): Promise<CampaignOut[]> {
  const response = await fetch(`${API_BASE}/campaigns/`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  });
  return handleResponse<CampaignOut[]>(response, 'Failed to fetch campaigns');
}

export async function getCampaign(id: number): Promise<CampaignOut> {
  const response = await fetch(`${API_BASE}/campaigns/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  });
  return handleResponse<CampaignOut>(response, `Failed to fetch campaign #${id}`);
}

export async function createCampaign(campaign: CampaignCreate): Promise<CampaignOut> {
  const response = await fetch(`${API_BASE}/campaigns/`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(campaign),
  });
  return handleResponse<CampaignOut>(response, 'Failed to create campaign');
}

export async function updateCampaign(
  id: number,
  update: CampaignUpdate
): Promise<CampaignOut> {
  const response = await fetch(`${API_BASE}/campaigns/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(update),
  });
  return handleResponse<CampaignOut>(response, `Failed to update campaign #${id}`);
}

export async function deleteCampaign(id: number): Promise<{ detail: string }> {
  const response = await fetch(`${API_BASE}/campaigns/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  return handleResponse<{ detail: string }>(response, `Failed to delete campaign #${id}`);
}

export async function getCampaignPosts(id: number): Promise<PostOut[]> {
  const response = await fetch(`${API_BASE}/campaigns/${id}/posts`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  });
  return handleResponse<PostOut[]>(response, `Failed to fetch posts for campaign #${id}`);
}
