# Pustara Frontend

Next.js 14 + Tailwind CSS + Firebase Auth + Framer Motion

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Auth**: Firebase Client SDK (connect ke backend Express teman)
- **Animations**: Framer Motion
- **State**: Zustand
- **Icons**: Lucide React

---

## Setup

### 1. Clone & install dependencies

```bash
# Masuk ke folder ini
cd pustara-fe

# Install packages
npm install
```

### 2. Install lucide-react (icons)

```bash
npm install lucide-react
```

### 3. Setup environment variables

```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local dan isi dengan nilai dari Firebase Console
```

Buka [Firebase Console](https://console.firebase.google.com):
- Pilih project
- Project Settings → Your apps → Web app
- Copy semua config ke `.env.local`

**Aktifkan Authentication methods di Firebase Console:**
- Authentication → Sign-in method → Enable: Email/Password + Google

### 4. Jalankan dev server

```bash
npm run dev
```

Buka `http://localhost:3001` (atau port lain kalau 3000 dipakai backend)

---

## Struktur Project

```
pustara-fe/
├── app/
│   ├── page.tsx                    # Splash screen
│   ├── layout.tsx                  # Root layout + AuthProvider
│   ├── globals.css                 # Global styles + Tailwind
│   ├── auth/
│   │   ├── login/page.tsx          # Login page
│   │   ├── register/page.tsx       # Register page
│   │   └── personalization/page.tsx # Preferensi AI
│   ├── catalog/page.tsx            # Home + katalog buku
│   └── read/page.tsx               # PDF reader (TODO)
├── components/
│   ├── auth/
│   │   └── AuthProvider.tsx        # Firebase auth state observer
│   └── ...
├── lib/
│   ├── firebase.ts                 # Firebase init
│   ├── api.ts                      # API client (calls backend)
│   └── utils.ts                    # cn() helper
├── store/
│   └── authStore.ts                # Zustand auth store
├── hooks/
│   └── useAuth.ts                  # useAuth hook
└── ...
```

---

## Auth Flow

```
User → Login/Register (Firebase Client SDK)
     → Dapat Firebase ID Token
     → Token dikirim ke backend Express (Authorization: Bearer <token>)
     → Backend verify pakai Firebase Admin SDK
     → Protected routes accessible
```

Cara kirim request ke backend yang dilindungi:

```typescript
import { apiGet, apiPost } from '@/lib/api';

// GET request dengan auth header otomatis
const data = await apiGet('/api/protected');

// POST request
const result = await apiPost('/api/books', { title: 'test' });
```

---

## Responsive Layout

- Mobile: `max-w-sm` centered (375px - 430px) → mirip app native
- Tablet/Desktop: `max-w-lg` / `max-w-2xl` dengan sidebar (TODO)

---

## TODO

- [ ] Connect Google Books API untuk cover yang lebih bagus
- [ ] PDF Reader page dengan watermark
- [ ] Rak Buku page (butuh login)
- [ ] Profil page
- [ ] Dark/light mode toggle
- [ ] Connect preferensi ke backend AI recommendation
