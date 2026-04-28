# PixelReach AI — by CodeMyPixel

AI-powered cold email outreach & lead nurture platform. Sends hyper-personalized emails at scale using OpenRouter AI, tracks opens/clicks, manages follow-ups, and runs on **$0/month** infrastructure.

---

## Quick Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql`
3. Then run `supabase/functions.sql`
4. Copy your **Project URL**, **Anon Key**, and **Service Role Key**

### 2. Environment Variables

Copy `env.template` → create `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_KEY=any_32_character_random_string___
CRON_SECRET=any_secret_token_for_cron_jobs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com) → add the env vars above
3. Deploy

### 5. Vercel Cron (campaign worker)

This repo includes [`vercel.json`](./vercel.json) so **production** deployments register one cron job:

| Field | Value |
|-------|--------|
| **Path** | `/api/jobs/campaign-worker` |
| **Schedule** | `* * * * *` (every minute, UTC) |

**Required:** add **`CRON_SECRET`** (random string, 16+ characters) in **Vercel → Project → Settings → Environment Variables** (Production). Vercel sends it automatically as `Authorization: Bearer <CRON_SECRET>` when invoking cron routes ([docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)).

After deploy, confirm under **Project → Settings → Cron Jobs** that the schedule is active and invocations return **200**.

**Plan limits:** On **Vercel Hobby**, cron expressions that run **more than once per day** fail at deploy time. Use **Vercel Pro** for per-minute cron, or keep an external scheduler (e.g. [cron-job.org](https://cron-job.org)) calling the same URL with the same `Authorization` header.

For reply and bounce tracking, keep an IMAP poller pointed at `/api/imap/ingest`. The included `hostinger/cron-imap.php` script can still be used for that if you host it somewhere with PHP IMAP enabled.

---

### Optional: External cron (Hobby / redundancy)

If you cannot use Pro yet, create **one** GET job at [cron-job.org](https://cron-job.org) to:

`https://your-app.vercel.app/api/jobs/campaign-worker`

with header `Authorization: Bearer <same CRON_SECRET>` and schedule `* * * * *`.

---
## Architecture

```
User Browser → Next.js (Vercel) → Supabase Postgres
                     ↑
        Vercel Cron (* * * * * UTC) — Pro plan for every-minute schedules
        → /api/jobs/campaign-worker
          → generate next email → send one → schedule follow-ups

        IMAP poller
        → /api/imap/ingest (bounce/reply detection)
```

(Hobby: use external cron or upgrade to Pro — see README §5.)

---


## Email Tracking

- **Open tracking**: `<img src="/t/open/:trackingId" />` — 1×1 GIF pixel
- **Click tracking**: All links wrapped as `/t/click/:trackingId?url=ORIGINAL`
- **Reply/Bounce**: Detected via IMAP polling on Hostinger

## OpenRouter AI

Users bring their own OpenRouter API key — they pay only for what they use. Any model is supported (Claude, GPT-4o, Gemini, Llama, etc.). Every email is a separate API call generating a completely unique, personalized message per lead.

## Database Queue (No Redis)

`email_send_queue` Postgres table with `FOR UPDATE SKIP LOCKED` concurrency. Safe for multiple simultaneous cron invocations. Stale locks auto-released after 5 minutes via `unlock_stale_queue_rows()`.

---

*Built by CodeMyPixel · Stack: Vercel + Supabase + OpenRouter (+ Vercel Cron or external cron on Hobby)*

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
