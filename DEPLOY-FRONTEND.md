# Deploy SafeLink Ghana frontend to Vercel

## Option A: Deploy with Vercel CLI (from your PC)

1. **Install Vercel CLI** (if needed):
   ```bash
   npm i -g vercel
   ```

2. **From the project root** (`C:\Users\Addo\apps`):
   ```bash
   cd C:\Users\Addo\apps
   npx vercel
   ```

3. **Follow the prompts:**
   - Log in or create a Vercel account (browser will open).
   - **Set up and deploy?** Yes.
   - **Which scope?** Your account.
   - **Link to existing project?** No (first time).
   - **Project name:** safelink-ghana (or leave default).
   - **In which directory is your code?** `./` (press Enter).
   - **Override settings?** No (Vercel will detect Vite: Build `npm run build`, Output `dist`).

4. After deploy you’ll get a URL like `https://safelink-ghana-xxx.vercel.app`. Use that as your **frontend URL**.

5. **Production deploy** (optional, after first deploy):
   ```bash
   npx vercel --prod
   ```

---

## Option B: Deploy from GitHub (recommended)

1. **Push your code to GitHub** (if not already):
   - Create a repo, then:
   ```bash
   cd C:\Users\Addo\apps
   git init
   git add .
   git commit -m "SafeLink Ghana frontend"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **In Vercel:** Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → **Import** your GitHub repo.

3. **Configure:**
   - **Framework Preset:** Vite (auto-detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** leave blank (repo root).

4. **Environment variable (optional now, required when backend is deployed):**
   - Name: `VITE_API_BASE_URL`
   - Value: your production backend URL (e.g. `https://your-backend.railway.app`)
   - Leave blank for now if you only use local backend; add later and redeploy.

5. Click **Deploy**. Your site will be at `https://your-project.vercel.app`.

---

## After deploy

- Use the deployed URL (e.g. `https://safelink-ghana.vercel.app`) as **FRONTEND_URL** in your **backend** `.env` so Paystack callback and the app return flow work:
  ```env
  FRONTEND_URL=https://safelink-ghana.vercel.app
  ```
- Restart your backend after changing `FRONTEND_URL`.

---

## Make sure they match

| What | Where | Must equal |
|------|--------|------------|
| **FRONTEND_URL** | `backend/.env` | Your **exact** Vercel frontend URL (e.g. `https://safelink-ghana.vercel.app` or `https://safelink-ghana-xyz.vercel.app`). If your Vercel URL is different, update `backend/.env`. |
| **VITE_API_BASE_URL** | Vercel project → Settings → Environment Variables (or local `.env` for dev) | Your backend URL. Local dev: `http://YOUR_PC_IP:3001`. After you deploy the backend: `https://your-backend.railway.app` (or similar). |
