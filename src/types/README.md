/**
 * PUSTARA TYPE SYSTEM GUIDE
 * ========================
 * 
 * This document explains the relationship between PostgreSQL database schema,
 * TypeScript types, and their usage across frontend and backend.
 */

// ============================================================================
// 1. CORE CONCEPTS
// ============================================================================

/**
 * DATABASE TYPES (src/types/database.ts)
 * - Direct 1:1 mapping to PostgreSQL schema
 * - Lowercase field names matching DB columns
 * - Include all nullable fields from schema
 * - These are the "source of truth" types
 * 
 * Example DB type:
 *   interface Book {
 *     id: string;
 *     title: string;
 *     authors: string[];
 *     external_key: string | null;
 *     cover_url: string | null;
 *   }
 */

/**
 * UI TYPES (src/types/*.ts)
 * - Extend/wrap database types for display
 * - Add computed/enriched fields
 * - Can have camelCase aliases for convenience
 * - May omit database-only fields (_sync, _deleted, etc)
 * 
 * Example UI type:
 *   interface BookDetail extends Book {
 *     queue: number; // Computed from queue table
 *     isBorrowed?: boolean; // Computed/enriched
 *   }
 */

// ============================================================================
// 2. TYPE MAPPING REFERENCE
// ============================================================================

/**
 * BOOKS TABLE → BookDetail (UI Display Type)
 * 
 * DB Column          | TypeScript Field | Comments
 * ================== | ================ | =========
 * id                 | id               | UUID primary key
 * external_key       | external_key     | OpenLibrary key (optional)
 * cover_id           | (derived)        | OpenLibrary ID (use cover_url instead)
 * title              | title            | Book title
 * authors            | authors[]        | Array of author names
 * genres             | genres[]         | Array of genre strings
 * description        | description      | Book synopsis
 * year               | year             | Publication year
 * pages              | pages            | Page count
 * language           | language         | Default 'id' (Indonesian)
 * avg_rating         | avg_rating       | 0.00 to 9.99 (numeric 3,2)
 * rating_count       | rating_count     | Total number of ratings
 * total_stock        | total_stock      | Total copies in system
 * available          | available        | Copies currently available
 * is_active          | is_active        | Soft active flag
 * created_at         | created_at       | ISO timestamp
 * updated_at         | updated_at       | ISO timestamp
 * cover_url          | cover_url        | Full URL to book cover image
 * file_url           | file_url         | URL to PDF/ePub file
 * file_type          | file_type        | 'pdf' | 'epub' | 'mobi'
 * file_size          | (excluded)       | Not typically exposed to UI
 * deleted_at         | (excluded)       | Soft delete timestamp (UI doesn't need)
 * deleted_by         | (excluded)       | Admin info (UI doesn't need)
 * 
 * COMPUTED FIELDS (added in API response):
 * - queue: number          FROM: SELECT COUNT(*) FROM queue WHERE book_id = ?
 * - isBorrowed?: boolean   FROM: Check loans table for user_id
 * - isWishlisted?: boolean FROM: Check wishlist table for user_id
 */

/**
 * USERS TABLE → UserProfile (with stats) or User (minimal)
 * 
 * DB Column         | TypeScript Field | Comments
 * ================= | ================ | =========
 * id                | id               | UUID primary key
 * firebase_uid      | firebase_uid     | Auth provider ID
 * username          | username         | Unique username
 * display_name      | display_name     | User's display name (nullable 'name' field inconsistency)
 * email             | email            | Unique email
 * avatar_url        | avatar_url       | Profile picture URL
 * bio               | bio              | User biography
 * preferred_genres  | preferred_genres | Array of favorite genres
 * reading_streak    | reading_streak   | Days of consecutive reading
 * total_read        | total_read       | Total books completed
 * created_at        | created_at       | Account creation time
 * updated_at        | updated_at       | Last profile update
 * 
 * UI ENRICHMENT (UserProfile):
 * - followers_count: number       FROM: COUNT (*) FROM follows WHERE following_id = user_id
 * - following_count: number       FROM: COUNT(*) FROM follows WHERE follower_id = user_id
 * - is_following: boolean         FROM: EXISTS query
 * - currently_reading: Book[]     FROM: reading_sessions JOIN books
 * - liked_books: Book[]           FROM: reviews WHERE user_id = ? AND rating >= 4
 */

/**
 * LOANS TABLE → PinjamanBook (borrowed shelf)
 * 
 * DB Column     | UI Field              | Comments
 * ============== | ==================== | =========
 * id            | loan_id               | UUID for loan record
 * user_id       | (implicit context)    | Current user
 * book_id       | (from books join)     | Book details
 * borrowed_at   | borrowedAt            | Start date
 * due_at        | dueDate               | Return deadline
 * returned_at   | returnedAt            | Actual return date (if returned)
 * extended      | (status field)        | Check status = 'extended'
 * status        | status                | 'active' | 'returned' | 'overdue' | 'extended'
 * 
 * COMPUTED:
 * - daysLeft: number = Math.ceil((new Date(dueDate) - now) / (1000*60*60*24))
 * - progress: number FROM: reading_sessions.progress_percentage
 */

/**
 * REVIEWS TABLE → Review (comment/rating)
 * 
 * DB Column    | TypeScript Field | Comments
 * ============ | ================ | =========
 * id           | id               | UUID primary key
 * user_id      | user_id          | Who wrote review
 * book_id      | book_id          | What book
 * rating       | rating           | 1-5 stars
 * body         | body             | Review text/comment
 * likes        | likes            | (optional) like count
 * created_at   | created_at       | Review date
 * updated_at   | updated_at       | Edit date
 * 
 * UI ENRICHMENT:
 * - name: string           FROM: users.display_name
 * - avatar: string         FROM: users.avatar_url
 * - text: string           ALIAS: body
 */

/**
 * READING_SESSIONS TABLE → BacaanBook or ReaderBook
 * 
 * DB Column           | TypeScript Field | Comments
 * =================== | ================ | =========
 * id                  | session_id       | UUID session ID
 * user_id             | (implicit)       | Current user
 * book_id             | (from book join) | Book being read
 * current_page        | currentPage      | Current position
 * total_pages         | totalPages       | Book length
 * progress_percentage | progress         | Computed as %
 * started_at          | started_at       | Start date
 * last_read_at        | lastRead         | Last activity
 * finished_at         | (status check)   | Completion date
 * status              | reading_status   | 'reading' | 'paused' | 'finished'
 * reading_time_minutes| (optional)       | Time spent reading
 */

/**
 * WISHLIST TABLE → WishlistBook
 * 
 * DB Column  | TypeScript Field | Comments
 * ========== | ================ | =========
 * user_id    | (implicit)       | Current user
 * book_id    | (from join)      | Wished book
 * added_at   | addedAt          | When added
 * 
 * COMPUTED:
 * - available: boolean = book.available > 0
 * - queue_position: number (if user is in queue)
 */

/**
 * QUEUE TABLE → Queue position for books
 * 
 * DB Column  | TypeScript Field | Comments
 * ========== | ================ | =========
 * id         | id               | UUID record ID
 * user_id    | user_id          | Who's queued
 * book_id    | book_id          | What book
 * position   | position         | Line position (1-based)
 * joined_at  | joined_at        | When queued
 * notified   | notified         | If notified about availability
 */

/**
 * NOTIFICATIONS TABLE → NotificationItem
 * 
 * DB Column   | TypeScript Field | Comments
 * =========== | ================ | =========
 * id          | id               | UUID
 * user_id     | user_id          | Recipient
 * type        | type             | Event type
 * title       | title            | Notification title
 * body        | body             | Message content
 * book_id     | book_id          | Related book (nullable)
 * actor_id    | actor_id         | Who triggered (nullable)
 * read        | read             | Read status
 * created_at  | created_at       | When created
 * 
 * Type can be: 'borrow' | 'due' | 'like' | 'follow' | 'review' | 'system' | 'queue'
 * 
 * UI ENRICHMENT:
 * - time: string          FROM: formatRelativeTime(created_at)
 * - avatar: string        FROM: users(actor_id).avatar_url
 * - actionUrl: string     FROM: generated based on type & book_id
 */

// ============================================================================
// 3. COMMON USAGE PATTERNS
// ============================================================================

/**
 * PATTERN 1: Fetching book with all details
 * 
 * Frontend:
 *   const book = await getBookById(bookId);
 *   // Returns: BookDetail (with queue, reviews, related books)
 *   
 * Backend (should return):
 *   {
 *     ...book,
 *     queue: 5,
 *     reviews: [{ id, rating, body, user_id, ... }, ...],
 *     relatedBooks: [{ id, title, authors, cover_url, ... }, ...]
 *   }
 */

/**
 * PATTERN 2: User's borrowed books
 * 
 * Frontend:
 *   const shelf = await getShelfData(userId, 'dipinjam');
 *   // Returns: PinjamanBook[] with progress
 *   
 * Backend (should return):
 *   [
 *     {
 *       loan_id: uuid,
 *       book: { id, title, authors, cover_url },
 *       borrowedAt: "2024-03-20T10:00:00Z",
 *       dueDate: "2024-03-27T10:00:00Z",
 *       daysLeft: 4,
 *       progress: 45.5,
 *       status: 'active'
 *     },
 *     ...
 *   ]
 */

/**
 * PATTERN 3: Book reviews
 * 
 * Frontend:
 *   const reviews = await getBookReviews(bookId);
 *   // Returns: Review[] with user info
 *   
 * Backend (should return):
 *   [
 *     {
 *       id: uuid,
 *       rating: 4,
 *       body: "Amazing book!",
 *       created_at: "2024-03-20T10:00:00Z",
 *       user: {
 *         id, username, display_name, avatar_url
 *       }
 *     },
 *     ...
 *   ]
 */

/**
 * PATTERN 4: User profile
 * 
 * Frontend:
 *   const profile = await getUserProfile(userId);
 *   // Returns: UserProfile (with followers, books, stats)
 *   
 * Backend (should return):
 *   {
 *     id, username, display_name, email, avatar_url,
 *     bio, preferred_genres,
 *     total_read, reading_streak,
 *     followers_count, following_count,
 *     is_following: boolean,
 *     currently_reading: [{ id, title, progress, ... }, ...],
 *     liked_books: [{ id, title, rating, ... }, ...]
 *   }
 */

// ============================================================================
// 4. IMPORTANT NOTES
// ============================================================================

/**
 * FIELD NAME INCONSISTENCIES TO FIX:
 * 
 * 1. display_name vs name
 *    - DB: display_name (nullable)
 *    - UI sometimes uses: name, user_name
 *    - ACTION: Always use display_name in types, provide alias in UI if needed
 * 
 * 2. cover_url vs coverId
 *    - DB: cover_url (full URL), cover_id (legacy OpenLibrary ID)
 *    - UI sometimes uses: coverUrl, coverId, cover
 *    - ACTION: Always use cover_url, derive coverId if needed
 * 
 * 3. authors (Array handling)
 *    - DB: authors TEXT[] (PostgreSQL array)
 *    - Some APIs: authors STRING (comma-separated)
 *    - ACTION: Always parse to string[] on API boundary, normalize in service layer
 * 
 * 4. File access
 *    - DB has: file_url, file_type, file_size
 *    - UI should use: file_url (with fallback to OpenLibrary)
 *    - ACTION: Backend should provide full file_url in API response
 */

/**
 * NULL HANDLING:
 * 
 * These fields can be NULL in DB but should be handled carefully in UI:
 * - cover_url: Show placeholder/icon if null
 * - description: Show "No description available" if null
 * - external_key: Don't expose to UI
 * - returned_at: Use to check if loan is completed
 * - body (review): Allow empty reviews (just rating)
 * - cover_id: Legacy field, prefer cover_url
 */

/**
 * TYPE SAFETY CHECKLIST FOR CONTRIBUTORS:
 * 
 * ✓ All database fields have a corresponding TS type
 * ✓ API responses include computed fields with explicit types
 * ✓ UI types extend database types (don't duplicate)
 * ✓ Nullable fields are marked with | null
 * ✓ Array fields use correct syntax (string[] not string[])
 * ✓ Timestamps are ISO strings (string, not Date object)
 * ✓ Numeric ratings and percentages use number type
 * ✓ UUIDs are string type
 * ✓ Enums like status use literal union types
 * ✓ API response wrappers include success, data, message fields
 */
