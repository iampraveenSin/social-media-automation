# Automate — AI Social Media Automation (MVP)

Phase 1 MVP of an AI-powered social media automation platform: connect Instagram, upload images, generate captions and hashtags, add a logo, and schedule posts for auto-publish.

## Phase 1 MVP features

- **Connect Instagram** — OAuth via Meta Graph API (Business or Creator account linked to a Facebook Page)
- **Connect Google Drive** — OAuth; pick images from a Drive folder instead of uploading each time. Use “Load images” and “Pick random” or click a thumbnail to use that image for the post.
- **Upload images** — Store in `public/uploads`, metadata in file-based store
- **Generate caption + hashtags** — OpenAI API (optional; falls back to placeholder if no key)
- **Add logo** — Position, size %, opacity; applied with Sharp when scheduling
- **Schedule post** — BullMQ + Redis; post is published at the scheduled time
- **Auto publish** — Worker consumes queue and publishes to Instagram via Graph API

## Quick start

1. **Install and run**

   ```bash
   npm install
   cp .env.example .env
   # Edit .env or .env.local: add META_APP_ID, META_APP_SECRET, optional OPENAI_API_KEY; for scheduling add REDIS_URL (see step 3)
   npm run dev
   ```

   **If `OPENAI_API_KEY` is not picked up:** Next.js loads env only at startup. Put `.env.local` in the project root (same folder as `package.json`), use `OPENAI_API_KEY=sk-...` with no spaces around `=`, then **restart the dev server** (Ctrl+C, then `npm run dev`). To verify: open [http://localhost:3000/api/env-check](http://localhost:3000/api/env-check) — it shows whether the key is set (never shows the key).

   **Login:** Set `AUTH_PASSWORD` in `.env.local` (and optionally `AUTH_SECRET` for signing). The dashboard is protected; unauthenticated users are redirected to `/login`. Use **Log in** on the home page or go to `/login`, then **Log out** from the dashboard header.

2. **Meta / Instagram setup**

   - Create a [Meta for Developers](https://developers.facebook.com/) app.
   - Add **Instagram Graph API** and **Facebook Login**.
   - In Facebook Login settings, set **Valid OAuth Redirect URIs** to your app’s callback URL: **Local:** `http://localhost:3000/api/auth/instagram/callback` · **Production:** `https://automation-aditya.vercel.app/api/auth/instagram/callback` (no trailing slash).
   - Use an Instagram **Business** or **Creator** account linked to a **Facebook Page**.
   - Set `NEXT_PUBLIC_APP_URL`: **Local dev** `http://localhost:3000` · **Production** `https://automation-aditya.vercel.app`.

   **“App not active” when users connect Instagram/Facebook**

   This message comes from Meta when the app is in **Development** mode. In that mode, only **Testers** can log in; everyone else sees “App not active… You will be able to log in when the app is reactivated.”

   - **Option A – Allow specific users (no review):** In [Meta for Developers](https://developers.facebook.com/) → your app → **App roles** → **Roles** → add each user’s Facebook account as a **Tester**. They can then connect Instagram from your dashboard.
   - **Option B – Allow any user:** In the same app, open **App Review** and request the permissions you need (e.g. `instagram_basic`, `pages_show_list`, `pages_read_engagement`) and switch the app to **Live** once approved. Then any user can connect.

   Keep **Valid OAuth Redirect URIs** in sync with the URL users use (localhost for local dev, or your production URL).

3. **Scheduling — Redis + Worker (required for scheduled posts)**

   Scheduling is powered **only** by Redis + a long-running worker. An always-on machine is required; there is no cron-based fallback.

   **Setup:**

   1. **Redis**  
     - **Local / same machine:** Install Redis (e.g. `redis-server` or Docker) and set `REDIS_URL=redis://localhost:6379` in `.env` or `.env.local`.  
     - **Remote (e.g. Upstash, Redis Cloud):** Create a Redis instance, get its URL, and set `REDIS_URL=redis://...` in `.env` on **both** the app and the worker machine (same URL).

   2. **Worker (always-on machine)**  
     - Clone or copy this repo to the machine that will run 24/7.  
     - Install dependencies: `npm ci`.  
     - Use the same `.env` (or `.env.local`) as the app, including `REDIS_URL`, `SUPABASE_*` if you use Supabase, and any keys the worker needs.  
     - Start the worker: `npm run worker`. The worker will exit with a clear error if `REDIS_URL` is missing.  
     - To run in the background and survive reboots:
       - **systemd (Linux):** See `scripts/automation-worker.service.example`; copy to `/etc/systemd/system/`, set your user and project path, then `systemctl enable --now automation-worker`.  
       - **PM2:** `npm i -g pm2 && pm2 start npm --name "automation-worker" -- run worker` then `pm2 save` and `pm2 startup`.

   3. **App (Vercel or anywhere)**  
     - Set `REDIS_URL` in the app’s environment to the **same** Redis URL the worker uses. When users schedule a post, the app enqueues a delayed job into Redis; the worker picks it up and publishes at the exact scheduled time. If `REDIS_URL` is missing or Redis is unreachable, the schedule API returns 503 with a clear message.

   **Result:** Scheduled posts publish at the exact time. If the worker or Redis is down, posts stay "scheduled"; use **Publish now** on a card to send that post immediately.

4. **Publish to Instagram (local vs production)**

   Instagram needs a **public** image URL. On **localhost** the image URL is not reachable by Meta, so **Publish now** will fail. Use **production** for posting:

   - **Local dev:** `NEXT_PUBLIC_APP_URL=http://localhost:3000` — use the app for everything except publishing to Instagram (or test publishing after deploying).
   - **Production (Vercel):** Deploy the app and set `NEXT_PUBLIC_APP_URL=https://automation-aditya.vercel.app` in Vercel env. Then image URLs are public and **Publish now** / scheduled posts work.

5. **Google Drive (optional)**

   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create OAuth 2.0 Client ID (Web application).
   - **Redirect URI must match exactly** (Error 400 `redirect_uri_mismatch` otherwise). Add **both** to **Authorized redirect URIs**: **Local** `http://localhost:3000/api/drive/callback` · **Production** `https://automation-aditya.vercel.app/api/drive/callback` (no trailing slash). Or open your app and visit **`/api/drive/redirect-uri`** to see the exact URI for the current host.
   - Enable the **Google Drive API** for the project.
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`. Restart the dev server.
   - On the dashboard, click **Connect Google Drive**, then optionally paste a folder link and **Save folder**. Use **Load images** and **Pick random** or click an image to use it for the post (no need to re-upload).

   **“Access blocked” or “This app isn’t verified” when users connect Drive**

   If the OAuth consent screen is in **Testing** mode, only users listed under **Test users** in Google Cloud Console can sign in. Others get “Access blocked” or similar.

   - **Option A – Allow specific users:** In Google Cloud Console → **OAuth consent screen** → **Test users** → add each user’s Google email. They can then connect Drive.
   - **Option B – Allow any user:** Publish the app (set OAuth consent screen to **Production** and complete verification if required), or add each user as a test user.

6. **Deploying to Vercel**

   Vercel’s serverless environment has a **read-only filesystem**. The app detects Vercel (`VERCEL=1`) and uses `/tmp/.data` for the file-based store so **login and signup work** (no more `ENOENT: mkdir '.data'`).

   - Set **Environment variables** in the Vercel project: `META_APP_ID`, `META_APP_SECRET`, `AUTH_SECRET`, `AUTH_PASSWORD`, `NEXT_PUBLIC_APP_URL`, and optionally `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `REDIS_URL` (required for scheduling; same URL as the worker). Vercel is used only for the web app and API; scheduling runs on Redis + worker on an always-on machine.
   - In Meta and Google OAuth settings, add **production** redirect URIs: `https://automation-aditya.vercel.app/api/auth/instagram/callback` and `https://automation-aditya.vercel.app/api/drive/callback`.

   **Limitations on Vercel (without Supabase):** `/tmp` is ephemeral and not shared across serverless instances. User and post data may not persist reliably. **Use Supabase** (see below) so all app data is stored in the database and persists on Vercel. Image uploads still write to `public/uploads`, which is read-only on Vercel—for production you may also need object storage (e.g. Vercel Blob).

7. **Supabase (optional, recommended for Vercel)**

   When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the app stores **all data** in Supabase (users, posts, media metadata, Instagram/Drive accounts) instead of local files. This gives persistent storage on Vercel and multi-instance consistency.

   - Create a project at [Supabase](https://supabase.com) → **Settings** → **API**: copy **Project URL** and **service_role** key (keep it secret).
   - In the Supabase **SQL Editor**, run the contents of `supabase/migrations/20260218000000_automation_schema.sql` to create the tables.
   - In `.env.local` (or Vercel env vars) set:
     - `SUPABASE_URL=https://your-project.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
   - Restart the dev server (or redeploy on Vercel). Login, signup, posts, and connections will then be stored in Supabase.
   - **For images (Drive pick, upload, Instagram):** Create a Storage bucket and policies so Select/Upload work and Instagram can load image URLs:
     1. Supabase → **Storage** → **New bucket** → Name: `uploads` → turn **Public bucket** ON → **Create**.
     2. In **SQL Editor**, run the contents of `supabase/migrations/20260218100000_storage_uploads_bucket.sql` (this adds read/upload policies for `uploads`). If you see "Failed to store image" or "Bucket not found", the bucket or policies are missing.

   **If you see "Could not find the table 'public.xxx' in the schema cache":** The migration has not been run. In [Supabase](https://supabase.com) → your project → **SQL Editor** → New query, paste the full contents of `supabase/migrations/20260218000000_automation_schema.sql` and click **Run**. Then reload the app.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` / `npm run start` — Production
- **`npm run worker`** — Queue worker for scheduled posts (Redis + worker, machine always on). Run on an always-on machine with `REDIS_URL` set; loads `.env.local` automatically. Keeps running and publishes posts at their scheduled time. If this isn’t running, scheduled posts are saved but never published until you run the worker or use **Publish now** on a card.

## Architecture (MVP)

**Scheduling flow:** User → App (Vercel) → Redis → Worker (always-on machine) → Social API (Instagram/Facebook).

- **Vercel:** Hosts the web app and API only. No built-in cron; scheduling is not done on Vercel.
- **Frontend:** Next.js App Router, Tailwind, Framer Motion, Zustand. Uploads via `fetch("/api/upload", ...)` only — no Supabase client on the frontend.
- **Supabase:** Browser → API route → **service role** (`getSupabase()`) → Supabase (DB + Storage). Never call Supabase from the frontend (anon role would hit RLS and fail).
- **API routes:** `/api/upload`, `/api/drive/pick`, `/api/generate-caption`, `/api/add-logo`, `/api/schedule`, `/api/posts`, `/api/accounts`, `/api/auth/instagram`, `/api/auth/instagram/callback`
- **Storage:** Supabase (when configured) or file-based (`.data/*.json`) for users, posts, media metadata, and connected accounts. Images: Supabase Storage bucket `uploads` (via API only) or `public/uploads/` locally.
- **Scheduling:** Redis + worker only. App enqueues a delayed job into Redis when the user schedules a post. Worker runs on an always-on machine, consumes the queue, and publishes at the exact scheduled time. Same `REDIS_URL` for app and worker.

## Roadmap

- **Phase 2:** Collage automation, video generator, Google Drive sync
- **Phase 3:** Full AI creative system, niche detection, post-uniqueness and regeneration

## Env reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes (for OAuth) | Base URL of the app |
| `META_APP_ID` | Yes (for Instagram) | Meta app ID |
| `META_APP_SECRET` | Yes (for Instagram) | Meta app secret |
| `OPENAI_API_KEY` | No | Caption/hashtag generation (fallback if missing) |
| `REDIS_URL` | Yes (for scheduling) | Redis URL for BullMQ. Required for scheduling; use the same URL in the app and the worker. If missing, the worker exits with an error; the schedule API returns 503. |
| `GOOGLE_CLIENT_ID` | No (for Drive) | Google OAuth client ID for Drive |
| `GOOGLE_CLIENT_SECRET` | No (for Drive) | Google OAuth client secret |
| `AUTH_PASSWORD` | Yes (for dashboard) | Password for `/login` |
| `AUTH_SECRET` | No | Secret for signing session cookie |
