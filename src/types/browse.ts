export interface BrowseBook {
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  available?: boolean;
  availableCount?: number;
  totalStock?: number;
  genres?: string[];
  rating?: number;
  year?: number;
  pages?: number;
  desc?: string;
  coverId?: number;
  isbn?: string | number;
}

export interface FriendActivityItem {
  user: string;
  avatar: string;
  action: string;
  book: string;
  coverUrl: string;
  key: string;
  time: string;
}
