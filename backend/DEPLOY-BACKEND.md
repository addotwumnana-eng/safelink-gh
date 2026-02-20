# Deploy SafeLink backend (Railway)

Deploy the backend so the app works from anywhere (no same-WiFi needed).

## 1. Push backend to GitHub (if not already)

From your **apps** repo root (parent of `backend/`):

```bash
cd C:\Users\Addo\apps
git add .
git commit -m "Add backend for deployment"
git push origin main
```

(If the whole repo is already on GitHub, skip this.)

---

## 2. Create a Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub is easiest).
2. **New Project** → **Deploy from GitHub repo**.
3. Select your **apps** repo (or the repo that contains `backend`).
4. Railway may ask which directory to use:
   - Set **Root Directory** to **`backend`** (so it runs `npm start` from the `backend` folder).
   - If there’s no root directory option, add a **railway.toml** or **nixpacks.toml** in `backend/` (see below), or deploy the `backend` folder as a separate repo.

---

## 3. Set environment variables in Railway

In your Railway project → **Variables** (or **Settings** → **Variables**), add:

| Name | Value |
|------|--------|
| `PORT` | `3001` (or leave unset; Railway sets `PORT` automatically) |
| `FRONTEND_URL` | Your Vercel frontend URL, e.g. `https://safelink-ghana.vercel.app` |
| `PAYSTACK_SECRET_KEY` | Your Paystack secret key (e.g. `sk_test_...` or `sk_live_...`) |
| `PAYSTACK_PUBLIC_KEY` | Your Paystack public key |
| `DATABASE_PATH` | `./data/deals.json` (default; optional) |
| `NODE_ENV` | `production` |

Railway usually injects `PORT`; if it does, you can omit it. If the app fails to start, set `PORT` to `3001`.

---

## 4. Deploy and get the backend URL

1. Trigger a deploy (push to GitHub or **Deploy** in Railway).
2. Open the **Settings** tab → **Networking** → **Generate Domain** (or use the default one).
3. Copy the public URL, e.g. `https://safelink-backend-production-xxxx.up.railway.app`.

That URL is your **backend URL**.

---

## 5. Point the frontend and app at the backend

**A. Vercel (deployed frontend)**  
- Vercel project → **Settings** → **Environment Variables**  
- Add: `VITE_API_BASE_URL` = `https://your-backend-url.up.railway.app`  
- **Redeploy** the frontend so the new build uses this URL.

**B. Local frontend / Android app**  
- Create an **apps root** `.env` from `.env.example` (do **not** commit it), then set:
  ```env
  VITE_API_BASE_URL=https://your-backend-url.up.railway.app
  ```
- Rebuild and sync the app:
  ```bash
  npm run build
  npx cap sync android
  ```
- Reinstall or run the app from Android Studio.

---

## 6. Check it works

- In a browser: `https://your-backend-url.up.railway.app/health` → should return `{"status":"ok",...}`.
- Open your deployed frontend or the app and create a deal; it should hit the backend without needing to be on the same WiFi.

---

## Alternative: Render

If you prefer Render instead of Railway:

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Connect your GitHub repo.
3. **Root Directory:** `backend`.
4. **Build Command:** `npm install`.
5. **Start Command:** `npm start`.
6. Add the same env vars as in the table above.
7. Create Web Service; use the given URL as your backend URL.
