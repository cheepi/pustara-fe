/**
 * reviewLikes.ts
 * Shared helper for toggling and querying review likes.
 * Uses the review_likes pivot table on the backend.
 */

import { apiPost, apiGet } from './api';

export interface ReviewLikeResult {
  liked: boolean;
  likes: number;
}

/**
 * Toggle like on a review. Requires the user to be authenticated —
 * apiPost will include the Firebase auth token automatically if present.
 * Throws on network / auth errors so callers can handle optimistic rollback.
 */
export async function toggleReviewLike(reviewId: string): Promise<ReviewLikeResult> {
  return apiPost<ReviewLikeResult>(`/reviews/${reviewId}/like`, {});
}

/**
 * Fetch like status + count for a single review.
 * Returns { liked: false, likes: 0 } on any error so UI always renders.
 */
export async function getReviewLikeStatus(reviewId: string): Promise<ReviewLikeResult> {
  try {
    return await apiGet<ReviewLikeResult>(`/reviews/${reviewId}/like`);
  } catch {
    return { liked: false, likes: 0 };
  }
}
