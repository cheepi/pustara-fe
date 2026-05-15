export interface CommunityReview {
  user: string;
  avatar_url: string | null;
  loc: string;
  rating: number;
  book: string;
  author: string;
  coverId?: number;
  key: string;
  text: string;
  likes: number;
  comments: number;
  time: string;
}
