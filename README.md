# SafeLink Ghana - Secure Escrow & Payment Platform

A modern, mobile-first React web application for trust-based escrow and payment services in Ghana.

## Features

- **Dashboard**: Trust Score (0–100, from deal history), Holding (Escrow) and Available balance, **Top up**, My Deals
- **New Secure Deal**: Create escrow transactions with item name, price (GHS), seller MoMo; 1% service fee; insufficient-balance check
- **SafeLink**: Generate and share links (Copy, WhatsApp, SMS); **View SafeLink** from My Deals for active deals
- **My Deals**: **Confirm receipt**, **Cancel deal** (refund), status: Active / Completed / Cancelled
- **MoMo Optimizer**: Calculate 1% service fee (Total, Net, Show details)
- **Persistence**: Deals and balances saved in `localStorage` (survive refresh)
- **Toasts**: “Deal created”, “Receipt confirmed”, “Link copied”, “Funds added”, “Deal cancelled. Funds returned.”
- **Modern UI**: Dark theme with Ghana Gold (#FFD700) accent
- **Animations**: Framer Motion transitions

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React (Icons)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a local env file (do not commit it):
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

## Project Structure

```
src/
  ├── components/
  │   ├── Dashboard.jsx          # Dashboard, balances, Top up, My Deals (View SafeLink, Confirm, Cancel)
  │   ├── NewDealForm.jsx        # New secure deal form
  │   ├── SafeLinkDisplay.jsx    # SafeLink view: copy, share WhatsApp/SMS
  │   ├── MoMoOptimizer.jsx      # 1% fee calculator
  │   └── Toast.jsx              # Toast notifications
  ├── App.jsx                    # Main app, view state, deals & balance logic
  ├── main.jsx                   # Entry point
  └── index.css                  # Global styles
```

## Design

- **Theme**: Dark with Ghana Gold (#FFD700) accents
- **Layout**: Mobile-first, optimized for smartphone screens
- **Icons**: Lucide React (Shield, Lock, CheckCircle)
- **Animations**: Smooth transitions between screens using Framer Motion

## Build

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Production & Paystack callback (Android app)

For the **mobile app**, Paystack redirects the user to your frontend after payment. That URL must be your **deployed** site so the in-app browser can load it and then close, returning the user to the app.

1. **Deploy the frontend** (e.g. Vercel, Netlify) and note the URL (e.g. `https://safelink-ghana.vercel.app`).

2. **Set backend `FRONTEND_URL`** to that URL in your backend environment (e.g. Railway variables) or a local `backend/.env` file (do **not** commit it):
   ```env
   FRONTEND_URL=https://your-deployed-app.vercel.app
   ```
   Do **not** use `http://localhost:5173` in production; the app’s return flow will not work.

3. Restart the backend after changing `.env`. Paystack’s `callback_url` will be `https://your-deployed-app.vercel.app/payment/callback`, so the in-app browser loads your callback page, verifies the payment, and closes automatically back to the app.
