# CarryGO - Ghana Logistics MVP

Production-ready monorepo foundation for an Accra-first logistics marketplace connecting customers with mini trucks, pickups, tippers, and cargo vehicles.

## Tech Stack

- **Mobile apps**: Expo + React Native + TypeScript
- **Admin dashboard**: Next.js 14 + Tailwind CSS + TypeScript
- **Backend + DB**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- **Maps**: Google Maps API
- **Payments**: Paystack (escrow + payout workflow)
- **Push notifications**: Firebase Cloud Messaging

---

## System Modules

1. `apps/mobile`: customer + driver mobile experiences with role-aware routing.
2. `apps/admin`: operator panel for approvals, disputes, analytics, and live operations.
3. `supabase/migrations`: full SQL schema, indexes, triggers, and RLS policies.
4. `supabase/functions`: secure payment webhook and escrow release handlers.
5. `packages/shared`: shared TypeScript domain models/constants.
6. `docs/architecture.md`: technical architecture and payment flow.

---

## Local Setup (Step-by-Step)

> Prerequisites: Node 20+, npm 10+, Supabase CLI, Expo CLI, Google Maps API key, Paystack keys.

### 1) Clone and enter workspace

```bash
git clone <your-repo-url>
cd <your-repo>/ghana-logistics-mvp
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

```bash
cp .env.example .env
```

Populate `.env` with real values:
- Supabase project URL and keys
- Paystack secret/webhook keys
- Google Maps key
- Expo and Next public env values

### 4) Boot Supabase locally (optional local stack)

```bash
supabase start
```

### 5) Link to your remote Supabase project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 6) Apply schema to Supabase

```bash
supabase db push
```

### 7) Run mobile app

```bash
npm run dev:mobile
```

In Expo terminal:
- press `a` for Android emulator
- or scan QR with Expo Go

### 8) Run admin dashboard

```bash
npm run dev:admin
```

Open `http://localhost:3000`.

### 9) Deploy edge functions

```bash
supabase functions deploy paystack-webhook
supabase functions deploy release-escrow
```

Set function secrets:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=<key>
supabase secrets set PAYSTACK_WEBHOOK_SECRET=<secret>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 10) Connect Paystack webhook

Set Paystack webhook URL to:

```text
https://<project-ref>.functions.supabase.co/paystack-webhook
```

---

## Folder Structure

```text
ghana-logistics-mvp/
  apps/
    mobile/                 # Expo customer + driver app
    admin/                  # Next.js operations dashboard
  packages/
    shared/                 # Shared TypeScript types/constants
  supabase/
    migrations/             # SQL schema + RLS + indexes
    functions/              # Paystack + escrow edge functions
  docs/
    architecture.md
  .env.example
  package.json
```

---

## Engineering Principles Applied

- Clean architecture with clear domain boundaries
- TypeScript-first across frontend and shared modules
- Role-based access controls with RLS
- API input validation in edge functions
- Realtime subscriptions for location/trip updates
- Resilient payment ledger and escrow release handling
- UI optimized for low-end Android devices (simple hierarchy, large targets, lightweight screens)
