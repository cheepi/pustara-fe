export interface BrowseBook {
  key: string;
  title: string;
  author: string;
  coverUrl?: string;
  genres?: string[];
  rating?: number;
  year?: number;
  pages?: number;
  desc?: string;
  coverId?: number;
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
