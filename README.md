# ScamShield Ghana MVP

Low-cost anti-fraud app for Ghana that helps users:

1. Scan suspicious websites (Safe / Suspicious / Dangerous),
2. Check if a mobile app looks official or fake,
3. Report scam links/apps to improve local intelligence.

The project ships as a React app wrapped with Capacitor for Android (Google Play path), plus a lightweight Express backend.

---

## 1) Product spec (what we built now)

### Core MVP features

- **URL Scanner**
  - Input: URL
  - Output: verdict, risk score (0-100), clear reasons
  - Logic: blacklist match, suspicious TLDs, punycode, scam keywords, lookalike-brand checks

- **App Authenticity Checker**
  - Input: app name, package name, developer name
  - Output: verdict, risk score, mismatch reasons
  - Logic: compares with trusted local brand catalog

- **Scam Report Submission**
  - Users submit suspicious URL/app + context
  - Reports stored for moderation and future blacklist updates

- **Subscription + Usage Control**
  - Freemium: **1 scan per day**
  - Weekly plan: **GHS 5** for unlimited scans (7 days)
  - Monthly plan: **GHS 15** for unlimited scans (30 days)
  - Enforced server-side by device ID

### Monetization-ready positioning

- Free tier: limited scans/day + report tools
- Premium tier: unlimited scans, family protection, instant alerts
- Extra: in-app ads (free tier), B2B dashboard later

---

## 2) Architecture

### Frontend

- React + Vite + Tailwind
- Mobile-first UI
- Capacitor wrapper for Android build

### Backend

- Node.js + Express
- JSON file store (cheap MVP, no DB cost)
- Risk engine for URL/app scoring

### Data files

- `backend/data/fake_domains.json` - known scam domains
- `backend/data/trusted_brands.json` - verified brands/domains/packages
- `backend/data/reports.json` - incoming user scam reports
- `backend/data/subscriptions.json` - device plans and daily scan usage

---

## 3) API endpoints

Base URL local backend: `http://localhost:3001`

### URL scan

`POST /api/scan/url`

```json
{
  "url": "https://mtn-momo-security-check.xyz/login",
  "deviceId": "your-device-id"
}
```

### App check

`POST /api/scan/app`

```json
{
  "appName": "MTN MoMo Wallet",
  "packageName": "com.fake.mtn.wallet",
  "developerName": "MTN Official Ltd",
  "deviceId": "your-device-id"
}
```

### Submit report

`POST /api/reports`

```json
{
  "type": "url",
  "value": "https://phishing-example.top",
  "description": "Asked for MoMo PIN",
  "contact": "optional@email.com"
}
```

### List reports (admin/dev use)

`GET /api/reports`

### Subscription status

`GET /api/subscription/status?deviceId=your-device-id`

### Activate paid plan

`POST /api/subscription/activate`

```json
{
  "deviceId": "your-device-id",
  "planId": "weekly"
}
```

---

## 4) Database schema (current JSON model)

### Trusted brands

```json
{
  "brand": "MTN MoMo",
  "officialDomains": ["mtn.com.gh"],
  "officialApps": [
    {
      "appName": "MyMTN",
      "packageName": "com.mtnplayapp",
      "developerName": "MTN"
    }
  ]
}
```

### Scam report

```json
{
  "id": "uuid",
  "type": "url | app",
  "value": "reported url or app identifier",
  "description": "user context",
  "contact": "optional",
  "status": "new",
  "createdAt": "ISO date"
}
```

---

## 5) Local setup

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Backend `.env.example`

- `PORT=3001`
- `FRONTEND_URL=http://localhost:5173`

`VITE_API_BASE_URL` can be set in frontend environment for production.

---

## 6) Google Play launch checklist

1. Add app icon + screenshots + privacy policy URL
2. Keep permissions minimal (no SMS/call logs unless truly required)
3. Add disclaimer: best-effort detection, no 100% guarantee
4. Complete Play Data Safety form accurately
5. Set support email and abuse-report process
6. Publish internal test track first, then production rollout

---

## 7) Ghana compliance and trust basics

- Comply with Ghana Data Protection Act (Act 843)
- Store only minimum user data required
- Provide delete-request contact for users
- Keep moderation logs for scam report decisions

---

## 8) Next implementation steps

1. Add Play Integrity + device attestation
2. Add abuse rate-limiting and API keys
3. Migrate JSON files to Postgres/Supabase
4. Integrate real payment collection for subscriptions (Google Play Billing / Paystack)
5. Add automated phishing feeds and admin moderation panel

---

## 9) Suggested low-cost stack (production)

- Frontend hosting: Vercel / Netlify
- Backend hosting: Render / Railway / Cloud Run
- Database: Supabase Postgres (free tier to start)
- Analytics: Firebase Analytics
- Crash reporting: Firebase Crashlytics

This gets you to market fast without high infrastructure cost.
