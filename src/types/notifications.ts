export type NotifType = 'borrow' | 'due' | 'like' | 'follow' | 'review' | 'system';

export interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  avatar?: string;
  bookCover?: number;
}
