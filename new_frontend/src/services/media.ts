import type { MediaItem, MediaListResponse, MediaFilterType, MediaSortOption } from '@/types/media';

const API_BASE = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getMediaList(params?: {
  media_type?: MediaFilterType;
  search?: string;
  sort?: MediaSortOption;
  all_users?: boolean;
}): Promise<MediaListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.media_type && params.media_type !== 'all') {
    queryParams.append('media_type', params.media_type);
  }
  if (params?.search && params.search.trim()) {
    queryParams.append('search', params.search.trim());
  }
  if (params?.sort) {
    queryParams.append('sort', params.sort);
  }
  if (params?.all_users) {
    queryParams.append('all_users', 'true');
  }

  const url = `${API_BASE}/media${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch media files');
  }

  return response.json();
}

export async function uploadMediaFile(file: File): Promise<MediaItem> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to upload media file');
  }

  return data;
}

export async function deleteMediaItem(id: number): Promise<{ message: string; id: number }> {
  const response = await fetch(`${API_BASE}/media/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to delete media item');
  }

  return data;
}
