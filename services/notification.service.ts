/**
 * Notification Service - 通知相關 API
 */

import { get, postBoolean } from './core/http';
import { getUserId } from './user.service';

export interface Notification {
  id: string;
  type: 'info' | 'alert' | 'success';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

/**
 * 取得通知列表
 */
export async function getNotifications(limit = 20): Promise<Notification[]> {
  const userId = getUserId();
  const result = await get<Notification[]>(`/api/notifications/${userId}?limit=${limit}`);
  return result ?? [];
}

/**
 * 標記通知為已讀
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  return postBoolean(`/api/notifications/${notificationId}/read`);
}

/**
 * 標記所有通知為已讀
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  return postBoolean(`/api/notifications/${userId}/read-all`);
}
