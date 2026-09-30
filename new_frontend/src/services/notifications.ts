import { API_BASE } from './campaigns';
import type { NotificationItem, NotificationListResponse } from '@/types/notification';

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

export async function getNotifications(limit = 20, offset = 0): Promise<NotificationListResponse> {
  const response = await fetch(`${API_BASE}/notifications?limit=${limit}&offset=${offset}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

export async function markNotificationAsRead(id: number): Promise<NotificationItem> {
  const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  return response.json();
}

export async function markAllNotificationsAsRead(): Promise<{ message: string; updated_count: number }> {
  const response = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
  return response.json();
}
