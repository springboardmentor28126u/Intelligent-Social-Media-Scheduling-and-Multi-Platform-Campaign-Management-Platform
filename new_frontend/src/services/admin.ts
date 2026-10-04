import type { AdminSettings, AdminStats, AdminAnalytics } from '@/types/admin';

const API_BASE = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const response = await fetch(`${API_BASE}/admin/settings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch admin settings');
  }
  return response.json();
}

export async function updateAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
  const response = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update admin settings');
  }
  return response.json();
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch admin statistics');
  }
  return response.json();
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const response = await fetch(`${API_BASE}/admin/analytics`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch admin analytics');
  }
  return response.json();
}

export async function getAdminUsersList(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch users list');
  }
  return response.json();
}

export async function updateAdminUserRole(userId: string | number, role: string): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update user role');
  }
  return response.json();
}

export async function deleteAdminUser(userId: string | number): Promise<any> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete user');
  }
  return response.json();
}
