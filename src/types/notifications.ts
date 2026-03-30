import type { Notification as DBNotification, NotificationType } from './database';

/**
 * Notification for display with enriched data
 * Extends database notification with computed/display fields
 */
export interface NotificationItem extends DBNotification {
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  // UI enrichment fields
  time?: string; // Formatted time
  avatar?: string; // Actor's avatar
  bookCover?: string; // Book cover URL if relevant
  actionUrl?: string; // Link to take action
}

/**
 * Notification preferences for user
 */
export interface NotificationPreferences {
  user_id: string;
  borrow_enabled: boolean;
  due_enabled: boolean;
  like_enabled: boolean;
  follow_enabled: boolean;
  review_enabled: boolean;
  queue_enabled: boolean;
  system_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

