export interface CommunityReview {
  review_id: string;   // actual review UUID from DB — used for like toggle
  user: string;
  avatar_url: string | null;
  loc: string;
  rating: number;
  book: string;
  author: string;
  cover_url?: string | null;   // direct cover URL from books table
  key: string;                 // book_id (UUID) — used for navigation to /book/:key
  text: string;
  likes: number;
  comments: number;
  time: string;
}
