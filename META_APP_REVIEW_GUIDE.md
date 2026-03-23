# Meta App Review - Permission Descriptions & Screencast Guide
## PRNIT SOCIAL BIZ (App ID: 931584669378224)

---

## How To Use This Guide
1. For each permission below, copy the **Description** text into the Meta App Review form
2. Record a **Screencast** (screen recording) following the instructions for each permission
3. The screencast should be 1-2 minutes, showing the end-to-end flow described

---

## Permissions REMOVED (not needed)
The following were removed from the submission because the app does not use them:
- `instagram_manage_comments` — no comment management feature
- `pages_read_engagement` — no engagement metrics display
- `instagram_business_manage_messages` — no DM feature
- `instagram_manage_messages` — no DM feature

---

## 1. instagram_basic

**Description (copy this):**
```
Our app, PRNIT Social BIZ, is a social media automation platform that helps small businesses manage their Instagram presence. We use instagram_basic to read basic profile information from the user's Instagram account, including username, profile picture, and media count. After the user connects via Facebook Login, this information is displayed on our dashboard so users can confirm which Instagram account is connected. The profile picture is shown alongside their username, and the media count helps users track their content volume.
```

**Screencast should show:**
- User clicks "Connect Instagram" in the app
- Facebook Login dialog appears
- User grants permissions
- App dashboard shows the connected Instagram account info (username, profile picture, post count)

---

## 2. instagram_content_publish

**Description (copy this):**
```
Our app uses instagram_content_publish to publish organic feed photo and video posts to Instagram on behalf of business users. Users can compose posts within our platform by selecting media (from Google Drive integration or direct upload), writing captions with AI-assisted generation, adding hashtags, and either publishing immediately or scheduling posts for a future date and time. The app handles the full publishing workflow including media upload, caption formatting, and Instagram API container creation and publishing. We also support logo overlay on images and video format conversion for Instagram compatibility.
```

**Screencast should show:**
- User creates a new post in the app
- User selects/uploads an image or video
- User writes or generates a caption (show AI caption generation)
- User clicks "Publish Now" or "Schedule"
- Post appears on their Instagram feed (show the published result)

---

## 3. pages_show_list

**Description (copy this):**
```
Our app uses pages_show_list to retrieve the list of Facebook Pages that a user manages. Since Instagram Business accounts are linked to Facebook Pages, we need this permission to let users select which Facebook Page (and its linked Instagram account) they want to connect for content publishing. When a user has multiple Facebook Pages, we display a page selection screen showing each page name and its linked Instagram account, allowing the user to choose which one to connect. If only one page has a linked Instagram account, we auto-connect it.
```

**Screencast should show:**
- User initiates Instagram connection by clicking "Connect Instagram"
- After Facebook Login, if user manages multiple pages, app shows the Page Selection screen
- The selection screen displays page names with linked Instagram usernames and profile pictures
- User selects which Page to connect
- App redirects to dashboard showing the connected account

---

## 4. business_management

**Description (copy this):**
```
Our app uses business_management to access the Business Manager API on behalf of users. This permission is required for the /me/accounts endpoint to return Facebook Pages when the user's account is managed through Meta Business Manager. Without this permission, users who manage their Instagram Business accounts via Business Manager would not be able to connect their accounts. We are a Tech Provider and need this permission to access business assets of our clients for content publishing and account management.
```

**Screencast should show:**
- User connects their account via Facebook Login
- App successfully retrieves their Facebook Pages (which requires business_management for Business Manager users)
- Show the connection flow completing successfully

---

## Screencast Recording Tips

1. **Use QuickTime (Mac)** or **OBS Studio (any OS)** to record your screen
2. **Keep each video under 2 minutes**
3. **Show the FULL flow** from clicking the button to the final result
4. **No audio required** but you can add narration if helpful
5. **Record at a good resolution** (1080p recommended)
6. **Export as .mp4 or .mov**
7. **You can reuse screencasts** for permissions that show the same flow

## Minimum Screencasts Needed (3 recordings)

1. **Connect Flow** — Covers `instagram_basic`, `pages_show_list`, `business_management`
   - Click "Connect Instagram" → Facebook Login → Page Selection (if multiple) → Dashboard shows profile pic + username

2. **Publish Flow** — Covers `instagram_content_publish`
   - Select media → Generate/write caption → Click Publish → Show result on Instagram

3. **Schedule Flow** (optional, strengthens submission)
   - Select media → Generate caption → Set schedule time → Show it in scheduled posts list

## Data Handling Section Answers

**Do you store Platform Data?** Yes
**Where?** In our secure database (Supabase with Row-Level Security or encrypted file storage)
**What data?** Instagram Business Account ID, username, profile picture URL, Facebook Page ID, page access token, media count
**How long?** Until the user disconnects their account, at which point all data is deleted
**Do you share data with third parties?** No
**Do you use data for advertising?** No
**Is data encrypted?** Yes, access tokens are stored server-side only and never exposed to the client

## Reviewer Instructions

```
To test our app:

1. Visit https://social-media-automation-liart.vercel.app/
2. Create an account using email and password (or use test account: test@prnitsocial.com / TestReview2024!)
3. Click "Connect Instagram" on the dashboard
4. Log in with your Facebook test account and grant permissions
5. If your test account manages multiple Facebook Pages, you'll see a page selection screen — select the page with a linked Instagram account
6. After connecting, the dashboard shows your Instagram profile picture, username, and connected Facebook Page name
7. To test publishing: upload an image, click "Generate Caption" to see AI caption generation, then click "Publish Now"
8. The post will appear on the connected Instagram account

Note: The app requires an Instagram Business or Creator account linked to a Facebook Page. Personal Instagram accounts cannot be connected.
```
