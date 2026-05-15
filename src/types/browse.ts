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
}

export interface FriendActivityItem {
  user: string;
  avatar_url: string | null;
  action: string;
  book: string;
  coverUrl: string;
  key: string;
  time: string;
}
