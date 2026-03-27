# Frontend Developer Handoff Guide

Ini panduan untuk melanjutkan development frontend setelah perubahan survey/personalization system.

---

## 🚀 Getting Started

### 1. Pull Latest Changes
```bash
cd pustara-fe
git fetch origin
git checkout 513968
git pull origin 513968
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

Backend harusnya sudah jalan di port 3000, frontend di port 3002.

---

## ✅ Current Status

### ✔️ COMPLETED
- ✅ **Firebase Authentication** - Login/Register dengan Email & Google
- ✅ **Personalization Form** - Gender, Age, Genre selection
- ✅ **Survey API Integration** - POST /survey/save endpoint
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Loading States** - Spinner while saving
- ✅ **Auto-redirect** - Redirect ke /catalog setelah survey save

### ⏳ BACKEND AUTO-SYNC
- ✅ User auto-synced ke Azure SQL saat login (via `/auth/verify-token`)
- ✅ Survey data langsung disave ke database
- ✅ Field names fixed: `age`, `gender`, `favoriteGenre`

---

## 🛠️ What's Next for FE Developer

### Phase 1: Validation & Testing (URGENT)

#### Task 1.1: End-to-End Testing
- [ ] Test flow: Register → Personalization Form → Submit
- [ ] Check browser console untuk errors
- [ ] Verify data appears di Azure SQL (ask backend dev untuk confirm)
- [ ] Test dengan multiple genres selection
- [ ] Test error cases: empty form, network error, etc

**Test Accounts:**
```
Email: test@pustara.com
Password: Test123456

Google: Gunakan akun Google personal kamu
```

#### Task 1.2: Test Different Login Methods
- [ ] Login dengan Email/Password → Check Users table di SQL
- [ ] Login dengan Google → Check Users table di SQL
- [ ] Logout and re-login → Verify survey still exists

#### Task 1.3: Fix Any Styling Issues
- [ ] Check form looks good di mobile (max-width: 384px)
- [ ] Check color contrast (dark text on light background)
- [ ] Verify button states (loading, disabled, hover)
- [ ] Check error message visibility

---

### Phase 2: Feature Enhancements (NEXT)

#### Task 2.1: Catalog/Browse Page Integration
**File:** `src/app/browse/page.tsx` atau `src/app/catalog/page.tsx`

```tsx
// Fetch user's survey preferences untuk personalisasi
const { user } = useAuth();
const token = await user.getIdToken();
const response = await fetch(`/survey/profile`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { user: profile, survey } = await response.json();

// profile.email, survey.age, survey.gender, survey.favoriteGenre
```

**What to implement:**
- [ ] Fetch user's survey preferences dari `/survey/profile` endpoint
- [ ] Display user preferences di sidebar/header
- [ ] Filter recommendations based on genres
- [ ] Show age-appropriate content
- [ ] Add "Update Preferences" button → back to personalization

#### Task 2.2: Recommendations Algorithm
**File:** `src/lib/recommendations.ts` (NEW FILE)

```typescript
// Filter books based on user preferences
export function getRecommendedBooks(
  allBooks: Book[],
  userSurvey: SurveyData
): Book[] {
  return allBooks.filter(book => {
    const genreMatch = userSurvey.favoriteGenre
      ?.split(',')
      .includes(book.genre);
    const ageMatch = checkAgeAppropriate(book.ageRating, userSurvey.age);
    return genreMatch || ageMatch;
  });
}
```

#### Task 2.3: User Profile Page
**File:** `src/app/profile/page.tsx` (NEW)

Show:
- [ ] User email & profile picture
- [ ] Current preferences (age, gender, genres)
- [ ] Button to update preferences
- [ ] Logout button
- [ ] Reading history (if available)

---

### Phase 3: Polish & Optimization (LATER)

#### Task 3.1: Loading States
- [ ] Add skeleton loader untuk catalog page
- [ ] Add toast notifications untuk success/error
- [ ] Add pull-to-refresh untuk mobile

#### Task 3.2: Accessibility
- [ ] Add alt text ke semua images
- [ ] Add aria-labels ke buttons
- [ ] Test keyboard navigation
- [ ] Test dengan screen reader

#### Task 3.3: Performance
- [ ] Lazy load images di catalog
- [ ] Add pagination untuk book list (don't load all at once)
- [ ] Cache user preferences di localStorage
- [ ] Optimize bundle size

---

## 🔗 API Endpoints FE Bisa Pakai

Backend udah prepare ini endpoints:

```
Authentication:
  POST   /auth/signup          (email, password)
  POST   /auth/signin          (email, password)
  POST   /auth/verify-token    (token) ← FOR AUTO-SYNC
  GET    /auth/me              (protected)
  POST   /auth/logout          (protected)

Survey (Protected):
  POST   /survey/save          (body: { age, gender, favoriteGenre })
  GET    /survey/my-survey     (get user's survey)
  GET    /survey/profile       (get user + survey combined)
  PUT    /survey/update        (body: partial updates)
```

**Example usage:**
```typescript
const token = await user.getIdToken();

// Get user profile + survey
const response = await fetch('http://localhost:3000/survey/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
const data = await response.json();
// data.user = { id, uid, email, displayName, ... }
// data.survey = { id, userId, age, gender, favoriteGenre, ... }
```

---

## 📁 Frontend Architecture

```
src/
├── app/
│   ├── page.tsx                    ← Home (coming soon)
│   ├── layout.tsx                  ← Root layout + AuthProvider
│   ├── globals.css                 ← Global styles
│   ├── auth/
│   │   ├── login/page.tsx          ✅ Done
│   │   ├── register/page.tsx       ✅ Done
│   │   └── personalization/page.tsx ✅ Done (survey form)
│   ├── browse/
│   │   ├── page.tsx                ⏳ TODO: Show books based on prefs
│   │   └── layout.tsx
│   ├── catalog/
│   │   ├── page.tsx                ⏳ TODO: Same as browse
│   │   └── [id]/page.tsx           ⏳ TODO: Book detail page
│   ├── profile/
│   │   └── page.tsx                ⏳ TODO: User profile page
│   └── settings/
│       └── page.tsx                ⏳ TODO: App settings
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx        ✅ Updated with verify-token call
│   │   └── LoginForm.tsx
│   ├── catalog/
│   │   ├── BookCard.tsx            ⏳ TODO
│   │   ├── FilterSidebar.tsx       ⏳ TODO
│   │   └── CatalogView.tsx         ⏳ TODO
│   ├── home/
│   │   └── HomePage.tsx
│   ├── layout/
│   │   └── Navbar.tsx              ⏳ TODO: Add user menu + logout
│   └── ...
├── hooks/
│   └── useAuth.ts                  ✅ Custom hook for auth state
├── lib/
│   ├── api.ts                      ⏳ TODO: Centralize API calls
│   ├── firebase.ts                 ✅ Firebase config
│   ├── utils.ts
│   └── recommendations.ts          ⏳ TODO: Filter logic
├── store/
│   └── authStore.ts                ✅ Zustand auth state
├── types/
│   ├── styles.d.ts
│   ├── svg.d.ts
│   └── models.ts                   ⏳ TODO: Add Book, Survey types
└── assets/
    └── ...
```

---

## 🚨 Common Issues & Solutions

### Issue: "Failed to fetch" error
**Cause:** Backend belum running atau CORS error
**Solution:**
1. Check backend sudah jalan: `docker-compose up --build` di pustara-be
2. Check NEXT_PUBLIC_API_URL di `.env.local` = `http://localhost:3000`
3. Check browser console untuk actual error message

### Issue: "User not valid" saat survey save
**Cause:** User belum login di AuthProvider
**Solution:**
1. Check `useAuth()` hook return user object
2. Check localStorage untuk Firebase token
3. Logout & login ulang

### Issue: Form styling looks broken
**Cause:** Tailwind config issue
**Solution:**
```bash
npm run build  # Rebuild tailwind
# Atau clear .next folder
rm -r .next
npm run dev
```

---

## 📝 Development Checklist

Gunakan ini untuk track progress:

- [ ] Pull branch 513968
- [ ] Test login & personalization flow
- [ ] Test data appears di SQL (ask BE dev)
- [ ] Fix any styling issues
- [ ] Build catalog/browse page
- [ ] Implement recommendations filter
- [ ] Build user profile page
- [ ] Add error handling
- [ ] Test mobile responsive
- [ ] Performance optimization
- [ ] Accessibility check
- [ ] Create pull request ke development branch

---

## 🤝 Communication with Backend Dev

**What to ask backend developer:**

1. **Testing Data:**
   - "Can you check if user 'bram' berhasil tersimpan di Users table?"
   - "Confirm survey data muncul di UserSurvey table?"

2. **New Endpoints (if needed):**
   - "Can you add endpoint untuk get recommended books based on survey?"
   - "Can we add endpoint untuk update user preferences?"

3. **Database Queries:**
   - "Can you query top 10 books by genre from database?"
   - "Can you setup Books table structure?"

---

## 🔐 Environment Variables

Pastikan `.env.local` punya:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD0Wz2CsxmDAj1LqPkNbEyx3hnFUoCnBMs
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pustara-kw
```

**Note:** NEXT_PUBLIC_ prefix = exposed to browser (safe untuk non-sensitive data)

---

## 📚 Resources

- **Tailwind CSS:** https://tailwindcss.com/docs
- **Next.js:** https://nextjs.org/docs
- **Firebase SDK:** https://firebase.google.com/docs/web/setup
- **React Hooks:** https://react.dev/reference/react/hooks

---

## ✉️ Questions?

Tanya ke backend developer (`@kamu.com`) atau cek ARCHITECTURE.md untuk flow details.

Good luck! 🚀
