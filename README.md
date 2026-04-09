# Itapoke Local Setup

## Run locally with backend

### Option A: plain local dev without Vercel

1. Copy `.env.example` to `.env.local`.
2. Fill these variables in `.env.local`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@itapokebd.wmm5sdv.mongodb.net/itapoke?retryWrites=true&w=majority&appName=ItapokeBD
MONGODB_DB_NAME=itapoke
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

3. In MongoDB Atlas:
   - add your current IP in `Network Access`
   - confirm the database user has read/write access
4. In Google Cloud OAuth add `http://localhost:5173` to `Authorized JavaScript origins`.
5. Install dependencies:

```bash
npm install
```

6. Start frontend + local API server:

```bash
npm run dev:local
```

7. Open `http://localhost:5173`.

The frontend runs on Vite and proxies `/api/*` to the local Node API server on port `3001`.

### Option B: simulate Vercel locally

1. Copy `.env.example` to `.env.local`.
2. Fill these variables in `.env.local`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@itapokebd.wmm5sdv.mongodb.net/itapoke?retryWrites=true&w=majority&appName=ItapokeBD
MONGODB_DB_NAME=itapoke
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

3. In MongoDB Atlas:
   - add your current IP in `Network Access`
   - confirm the database user has read/write access
4. In Google Cloud OAuth add `http://localhost:3000` to `Authorized JavaScript origins`.
5. Install dependencies:

```bash
npm install
```

6. Start the app with Vercel local dev:

```bash
npm run dev:vercel
```

7. Open `http://localhost:3000`.

## Notes

- Use `npm run dev:local` for a normal local stack without Vercel.
- Use `vercel dev` only if you want to mimic Vercel more closely.
- If your Mongo password contains special characters, URL-encode it in `MONGODB_URI`.
- If login fails after changing Google settings, wait a few minutes and retry.
