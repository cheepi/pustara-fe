export interface Review {
  name: string;
  avatar: string;
  rating: number;
  text: string;
  time?: string;
  likes?: number;
  loc?: string;
}

export interface BookDetail {
  id: string;
  title: string;
  authors: string[];
  cover_url: string;
  genres: string[];
  avg_rating: number;
  rating_count: number;
  year: number;
  pages: number;
  available: number;
  total_stock: number;
  queue: number;
  description: string;
  relatedBooks?: Partial<BookDetail>[];
  reviews?: Review[];
}

// Shape dari response BE Express: GET /books & GET /books/:id
export interface BookApiResponse {
  success: boolean;
  data: BookDetail | BookDetail[];
  message?: string;
}