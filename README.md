# Automate — Social Media Automation Platform

A full-stack web application that lets you connect Instagram and Google Drive, compose posts (with AI-generated captions, optional logo, and media from Drive or uploads), and publish immediately or on a schedule. It supports images and videos (with in-browser conversion for Instagram compatibility) and an optional **auto-post** mode that picks one image or video from a Drive folder on a recurring schedule.

---

## Table of Contents

- [What This Project Is](#what-this-project-is)
- [Why It Exists](#why-it-exists)
- [Features in Detail](#features-in-detail)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [How to Start](#how-to-start)
- [How to Manage & Configure](#how-to-manage--configure)
- [Code & Functionality Deep Dive](#code--functionality-deep-dive)
- [API Reference](#api-reference)
- [Database (Supabase)](#database-supabase)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## What This Project Is

- **Type:** Next.js 16 (App Router) full-stack app with API routes, optional Supabase backend, and a separate Node.js worker process for scheduling.
- **Purpose:** Central dashboard to create Instagram (and linked Facebook Page) posts from uploaded media or Google Drive, with optional AI captions, logo overlay (images only), and two ways to publish:
  1. **Publish now** — post immediately.
  2. **Schedule** — save a post and publish at a specific date/time via a queue worker.
  3. **Auto-post** — recurring job picks one random image/video from a Drive folder and publishes at configured times (daily, every 3 days, weekly, monthly).
- **Users:** Single-tenant or multi-tenant app users (email + password). Each user can connect one Instagram account (via Meta/Facebook) and one Google Drive account.

---

## Why It Exists

- **Unify workflow:** Upload or pick media from Drive, write or generate captions, add a logo (for images), and publish or schedule in one place.
- **Reliability:** Scheduled and auto-post rely on Redis + a long-running worker so posts run at the right time even when the web app is serverless (e.g. Vercel).
- **Instagram compatibility:** Videos are converted in the browser to H.264/AAC MP4 so they meet Instagram’s requirements; logo overlay on video is not supported (logo applies to images only).
- **Flexibility:** Use file-based storage locally or Supabase (DB + Storage) for production; same codebase supports both.

---

## Features in Detail

| Feature | What it does | Where it lives |
|--------|----------------|----------------|
| **Auth** | Email/password login and signup; session cookie. | `lib/auth.ts`, `app/login`, `app/signup`, `middleware.ts` |
| **Instagram connect** | OAuth with Meta; links Instagram Business/Creator account and Facebook Page. | `lib/instagram.ts`, `app/api/auth/instagram`, callback |
| **Google Drive connect** | OAuth; browse folders and pick images/videos. | `lib/drive.ts`, `app/api/drive/*`, `components/PickFromDrive.tsx` |
| **Media library** | Upload images (and converted videos) or add from Drive; select one or many for a post. | `app/api/upload`, `components/MediaUpload.tsx`, store |
| **Collage** | If multiple images are selected, they are combined into one image (client-side canvas). | `lib/collage.ts`, dashboard `getEffectiveMediaId()` |
| **Caption & hashtags** | Optional AI generation (OpenAI or Gemini); manual edit. | `app/api/generate-caption`, `components/CaptionEditor.tsx` |
| **Logo** | Upload PNG; set position and size. Applied to **images only** (at schedule/publish time on server; not on video). | `lib/sharp-logo.ts`, `components/LogoSettings.tsx`, schedule/publish-now routes |
| **Video conversion** | In-browser FFmpeg.wasm converts video to H.264/AAC MP4 for Instagram (single-video Publish now / Schedule). | `lib/convert-video-browser.ts`, dashboard `handlePublishNow` / `handleSchedule` |
| **Publish now** | Publish selected media to Instagram (and linked Facebook Page) immediately. | `app/api/publish-now`, dashboard `handlePublishNow` |
| **Schedule** | Save post with a future time; worker publishes at that time. | `app/api/schedule`, `lib/queue.ts`, `scripts/worker.ts` |
| **Auto-post** | Worker runs every 10 minutes; for users with recurrence enabled and `next_run_at` in the past, picks one random file from Drive folder, uploads to storage, publishes, then advances `next_run_at`. | `lib/recurrence.ts`, `scripts/worker.ts` |
| **Posts list** | View scheduled and published posts; retry failed or scheduled posts with “Publish now”. | `app/dashboard` (Scheduled tab), `app/api/posts`, `components/PostCard.tsx` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (Dashboard)                                                     │
│  - Next.js App Router pages (dashboard, login, signup)                   │
│  - Zustand store (media, selection, caption, logo, recurrence state)   │
│  - Video conversion (FFmpeg.wasm) and collage (canvas) run in browser    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js App (Vercel or Node server)                                     │
│  - API routes: auth, upload, drive, schedule, publish-now, recurrence…   │
│  - Session auth; reads/writes store (Supabase or file-based)             │
│  - Enqueues scheduled posts into Redis (BullMQ)                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Supabase       │   │  Redis          │   │  Meta / Google  │
│  (or .data/*)   │   │  (BullMQ queue) │   │  (Instagram,    │
│  DB + Storage   │   │  Delayed jobs   │   │   Drive APIs)   │
└─────────────────┘   └────────┬────────┘   └─────────────────┘
                                │
                                │ Worker polls queue + recurrence
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Worker (Node, always-on)  npm run worker                                 │
│  - Consumes BullMQ jobs: publishes scheduled posts at scheduled time     │
│  - Every 10 min: processRecurrence() → due users → pick from Drive, post  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Web app:** Stateless; all persistence is in Supabase (or file store) and Redis.
- **Scheduling:** Only the worker publishes at the scheduled time; there is no cron on Vercel. Same Redis URL must be used by the app and the worker.
- **Media:** Uploaded/converted files go to Supabase Storage bucket `uploads` (when configured) or `public/uploads` locally; Instagram needs a public URL to fetch the media.

---

## Project Structure

```
automation/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── dashboard/              # Main app (media, caption, schedule, recurrence)
│   ├── privacy-policy/
│   └── api/                    # API routes
│       ├── auth/               # login, logout, signup, session, instagram (OAuth)
│       ├── drive/              # auth, callback, browse, pick, folder, images, status, …
│       ├── upload/             # POST multipart → store media (image or video/mp4)
│       ├── schedule/           # POST → save post, enqueue job to Redis
│       ├── publish-now/       # POST → publish immediately to Instagram (+ FB Page)
│       ├── posts/              # GET list, POST [id]/publish (retry one post)
│       ├── recurrence/         # GET/POST recurrence settings (nextRunAt, frequency, times)
│       ├── queue-status/       # GET Redis up/down
│       ├── accounts/           # GET connected accounts, POST analyze
│       ├── media/              # GET media list
│       ├── generate-caption/  # POST → AI caption/hashtags
│       └── add-logo/           # POST form → image + logo → image with logo (optional API)
├── components/
│   ├── PickFromDrive.tsx       # Drive browser, folder stack, file grid
│   ├── MediaUpload.tsx         # Upload + media library grid (images/videos)
│   ├── CaptionEditor.tsx       # Caption + hashtags + generate button
│   ├── LogoSettings.tsx        # Logo upload, position, size (images only)
│   ├── PostPreview.tsx        # Preview panel (image or video)
│   ├── PostCard.tsx            # Scheduled/published post card (list)
│   ├── SchedulePicker.tsx     # Date/time for single scheduled post
│   └── ...
├── lib/
│   ├── auth.ts                 # Session, getSessionFromRequest
│   ├── store.ts                # Facade: Supabase or file-based (users, posts, media, accounts, recurrence)
│   ├── store-supabase.ts       # Supabase implementations
│   ├── store-file.ts           # File-based (.data/*.json) implementations
│   ├── instagram.ts            # Meta Graph API: publish image/video, FB Page, OAuth URL
│   ├── video.ts                # resolveVideoForPublish (returns url + placement "video")
│   ├── convert-video-browser.ts # FFmpeg.wasm: convert to H.264/AAC (no logo on video)
│   ├── sharp-logo.ts           # addLogoToImage (server-side, images only)
│   ├── collage.ts              # buildCollageBlob (client-side, multiple images)
│   ├── queue.ts                # BullMQ: schedulePost, startWorker (consumes jobs)
│   ├── recurrence.ts          # processRecurrenceForUser, processRecurrence, computeNextRunAt
│   ├── drive.ts                # Google Drive: OAuth refresh, list folder, download file
│   ├── storage.ts              # Supabase Storage upload, public URL
│   ├── types.ts                # Shared types (User, MediaItem, ScheduledPost, LogoConfig, …)
│   └── ...
├── store/
│   └── useAppStore.ts          # Zustand: media, selection, caption, hashtags, logo, recurrence state
├── scripts/
│   ├── worker.ts               # Entry: startWorker() + setInterval(processRecurrence, 10 min)
│   └── automation-worker.service.example  # systemd example
├── supabase/
│   ├── migrations/             # SQL migrations (schema, recurrence, storage)
│   └── sql/run-all-new-migrations.sql
├── middleware.ts               # Protects /dashboard; redirects unauthenticated to /login
├── package.json
└── README.md
```

---

## How to Start

### Prerequisites

- Node.js 18+
- (Optional) Redis — required for scheduling and for the worker
- (Optional) Supabase project — recommended for production (DB + Storage)

### 1. Install and run the app

```bash
git clone <repo>
cd automation
npm install
cp .env.example .env
# Edit .env or .env.local (see Environment Variables)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in (or sign up) using the password set in `AUTH_PASSWORD`.

### 2. Run the worker (scheduled and auto-posts)

The worker must run on a machine that has the same env (especially `REDIS_URL`) as the app. It does not run on Vercel.

```bash
# Same directory, same .env
npm run worker
```

- Starts BullMQ worker: consumes scheduled-post jobs and publishes at the right time.
- Every 10 minutes runs `processRecurrence()`: for each user with recurrence enabled and `next_run_at` in the past, picks one file from the Drive folder, uploads it, publishes to Instagram, then advances `next_run_at`.

To keep it running after logout:

- **Linux (systemd):** Use `scripts/automation-worker.service.example`.
- **PM2:** `pm2 start npm --name "automation-worker" -- run worker`, then `pm2 save` and `pm2 startup`.

### 3. Production build

```bash
npm run build
npm run start
```

Deploy the app (e.g. Vercel); run the worker elsewhere with the same `REDIS_URL` and Supabase (if used).

---

## How to Manage & Configure

### Meta (Instagram + Facebook Page)

1. Create an app at [Meta for Developers](https://developers.facebook.com/).
2. Add **Instagram Graph API** and **Facebook Login**.
3. In Facebook Login → Settings, set **Valid OAuth Redirect URIs** to:
   - Local: `http://localhost:3000/api/auth/instagram/callback`
   - Production: `https://<your-domain>/api/auth/instagram/callback`
4. Use an Instagram **Business** or **Creator** account linked to a **Facebook Page**.
5. Set `META_APP_ID`, `META_APP_SECRET`, and `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` or your production URL).

If the app is in **Development** mode, only **Testers** can connect Instagram; add testers in App roles or switch to Live after review.

### Google Drive

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an OAuth 2.0 Client ID (Web application).
2. Add **Authorized redirect URIs**: `http://localhost:3000/api/drive/callback` and your production callback (or use `/api/drive/redirect-uri` in the app to see the exact URI).
3. Enable **Google Drive API**.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in env.

### Supabase (recommended for production)

1. Create a project at [Supabase](https://supabase.com).
2. In SQL Editor, run migrations in order:
   - `supabase/migrations/20260218000000_automation_schema.sql`
   - `supabase/migrations/20260218100000_storage_uploads_bucket.sql` (and any later migrations, or `supabase/sql/run-all-new-migrations.sql` if it includes all new changes).
3. Create Storage bucket `uploads` and set it to **Public** (or apply the storage migration that creates it and policies).
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in env.

### Redis (scheduling + worker)

- Use a Redis instance (local or e.g. Upstash, Redis Cloud).
- Set `REDIS_URL` in **both** the Next.js app and the worker process. If `REDIS_URL` is missing, the worker exits and the schedule API returns 503.

---

## Code & Functionality Deep Dive

### Authentication

- **lib/auth.ts:** Session creation/validation; password check against stored hash. Session stored in an encrypted cookie.
- **middleware.ts:** For `/dashboard`, checks session; redirects to `/login` if missing.
- **app/api/auth/login, signup, logout, session:** Handle login, signup, logout, and session read; all use the store (Supabase or file) for users.

### Dashboard flow (create post)

1. User selects media (upload or from Drive). Multiple images → collage is built in the browser and uploaded as one image.
2. Single video → on Publish now / Schedule, the app runs **convert-video-browser** (FFmpeg.wasm) to produce H.264/AAC MP4, uploads that file via `/api/upload`, then uses the new media ID for publish or schedule. Logo is **not** applied to video.
3. Caption/hashtags: manual or from `/api/generate-caption` (OpenAI or Gemini).
4. Logo: configured in LogoSettings; applied **only for images** in `publish-now` and `schedule` routes via `addLogoToImage` (Sharp). Video posts are published without logo.
5. **Publish now:** `POST /api/publish-now` with `mediaId`, caption, hashtags, etc. Resolves media URL (and video placement), applies logo for images, then calls `publishToInstagram` and optionally `publishToFacebookPage`.
6. **Schedule:** `POST /api/schedule` with same payload. Saves post to DB, then `schedulePost(post, at)` enqueues a delayed job in Redis. Worker later runs the job: loads post, resolves media (by `mediaId` when present so converted video is used), publishes, marks post as published.

### Scheduling (BullMQ)

- **lib/queue.ts:** `schedulePost(post, runAt)` adds a job with `delay` until `runAt`. Worker’s job handler: loads post from DB, checks status is `scheduled`, resolves media URL (from media record when `mediaId` set), calls `publishToInstagram` / `publishToFacebookPage`, then updates post to `published`.
- **scripts/worker.ts:** Calls `startWorker()` from `lib/queue` and runs `processRecurrence()` every 10 minutes.

### Recurrence (auto-post)

- **lib/recurrence.ts:** `getDueRecurrenceSettings(now)` returns users with `enabled` and `next_run_at <= now`. For each, `processRecurrenceForUser`: refreshes Drive token, lists files in folder (`settings.driveFolderId` or Drive account’s `folderId`), excludes already-posted IDs (round-robin), picks one random file, downloads it, uploads to Supabase Storage, creates media record, publishes to Instagram (and FB Page), saves post, advances `next_run_at` via `computeNextRunAtWithTimes` (rotates through 3 time slots).
- **GET /api/recurrence:** If `nextRunAt` is in the past and recurrence is enabled, returns a **computed** next run time for display only (so “Next post at” shows the next date); does not persist it so the worker still sees the old due time and can run.
- Dashboard sends `driveFolderId` (current Drive folder) when saving recurrence so the worker uses that folder.

### Video handling

- **lib/video.ts:** `resolveVideoForPublish(url)` returns `{ url, placement: "video" }` (no server-side conversion).
- **lib/convert-video-browser.ts:** Used only from the dashboard. Converts a single video to H.264/AAC MP4 (no logo). Result is uploaded via `/api/upload` and that media ID is used for publish/schedule. Worker and publish-now then use the stored URL (converted file) so Instagram accepts it.

### Instagram API

- **lib/instagram.ts:** Creates container with `media_type=VIDEO` or `REELS` and `video_url`, or `image_url` for images. Uses Graph API v25. On “Unknown media type” for VIDEO, retries with REELS. Polls container status; on ERROR, maps known subcodes to user-facing messages (e.g. format not supported, URL not fetchable).

---

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/session` | Current session |
| POST | `/api/auth/login` | Log in (email + password) |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/instagram` | Redirect to Meta OAuth |
| GET | `/api/auth/instagram/callback` | OAuth callback; save account |
| POST | `/api/upload` | Upload image or video (multipart); returns media item |
| GET | `/api/drive/status` | Drive connection status |
| GET | `/api/drive/browse` | List folder contents |
| POST | `/api/drive/pick` | Pick file from Drive; add to media library |
| POST | `/api/schedule` | Create scheduled post; enqueue job (requires REDIS_URL) |
| POST | `/api/publish-now` | Publish immediately |
| GET | `/api/posts` | List posts for current user |
| POST | `/api/posts/[id]/publish` | Publish one scheduled/failed post now |
| GET | `/api/recurrence` | Get recurrence settings (nextRunAt may be computed if past) |
| POST | `/api/recurrence` | Save recurrence (enabled, frequency, postTimes, driveFolderId) |
| GET | `/api/queue-status` | Redis up/down |
| GET | `/api/accounts` | Connected Instagram/account info |
| POST | `/api/generate-caption` | AI caption/hashtags (OpenAI or Gemini) |
| POST | `/api/add-logo` | (Optional) Image + logo file → image with logo |

---

## Database (Supabase)

When Supabase is configured, the app uses these main tables:

- **users** — App users (id, email, password_hash).
- **posts** — Scheduled/published posts (media_id, media_url, caption, hashtags, scheduled_at, status, media_type, logo_config, …).
- **media** — Uploaded or Drive-picked media (url, mime_type, drive_file_id, …).
- **accounts** — Instagram (Meta) account per user (access_token, instagram_business_account_id, facebook_page_id, …).
- **drive_accounts** — Drive OAuth per user (access_token, refresh_token, folder_id).
- **drive_posted_round** — Tracks which Drive file IDs were used per folder (for recurrence round-robin).
- **recurrence_settings** — Auto-post (enabled, frequency, next_run_at, post_times, next_time_index, drive_folder_id).

Storage bucket **uploads** is used for uploaded and converted media; public read so Instagram can fetch URLs.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes (OAuth) | App base URL (e.g. `http://localhost:3000`, `https://your-app.vercel.app`) |
| `META_APP_ID` | Yes (Instagram) | Meta app ID |
| `META_APP_SECRET` | Yes (Instagram) | Meta app secret |
| `AUTH_PASSWORD` | Yes | Password for login (or use your own auth) |
| `AUTH_SECRET` | No | Secret for signing session cookie |
| `REDIS_URL` | Yes (scheduling) | Redis URL for BullMQ (app + worker must use same URL) |
| `SUPABASE_URL` | No (recommended) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (server-side only) |
| `GOOGLE_CLIENT_ID` | No (Drive) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No (Drive) | Google OAuth client secret |
| `OPENAI_API_KEY` | No | OpenAI for caption/hashtag generation |
| `GEMINI_API_KEY` | No | Google Gemini for caption/hashtag (alternative) |

---

## Troubleshooting

- **“Media container failed” / “Invalid parameter”**  
  Usually video format or URL. Use single-video flow so the app converts to H.264/AAC and uploads; ensure media URL is public (Supabase public bucket, not localhost). See container error subcodes in `lib/instagram.ts` (e.g. format not supported, URL not fetchable).

- **Scheduled post never publishes**  
  Worker must be running and `REDIS_URL` must be set (same as app). Check queue status on dashboard; run `npm run worker` on an always-on machine.

- **“Next post at” date not updating**  
  GET recurrence now returns a computed next run when the stored one is in the past (display only). Dashboard also refetches recurrence every 60s when auto-post is enabled. If the worker runs and advances `next_run_at`, the next refetch will show the new time.

- **Auto-post not picking media**  
  Auto-post uses **only** the connected Drive folder. Connect Drive, open a folder that contains images/videos, and save recurrence (so `driveFolderId` is set). Worker must be running.

- **Logo not on video**  
  Logo is applied to images only (Sharp on server). Video posts are published without logo to avoid Instagram rejection.

- **OAuth redirect errors**  
  Ensure Meta and Google redirect URIs match exactly (no trailing slash, correct host). Use `/api/drive/redirect-uri` to see the exact Drive callback URL.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| **`npm run worker`** | Start queue worker + recurrence (requires REDIS_URL; run on always-on machine) |
