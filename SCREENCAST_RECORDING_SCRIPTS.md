# Screencast Recording Scripts — PRNIT SOCIAL BIZ
## Meta App Review Submission

You need 4 screencast uploads, but you can cover them with **2 recordings** (reuse the Connect Flow video for 3 permissions).

---

## RECORDING 1: Connect Flow (reuse for 3 permissions)
**Upload this same video to:** `instagram_basic`, `pages_show_list`, `business_management`
**Target length:** 60–90 seconds
**What it proves:** Your app retrieves Facebook Pages, lets users select one, and displays Instagram profile info.

### Before You Record
- Make sure your app is deployed at https://social-media-automation-liart.vercel.app/
- Log into the app with a test account (or create a new one)
- Make sure you are NOT already connected to Instagram (disconnect first if needed)
- Have a Facebook account ready that manages at least one Page with a linked Instagram Business/Creator account
- If possible, use an account with **2+ Facebook Pages** so the Page Selection screen appears

### Step-by-Step Script

1. **Open your browser** — navigate to `https://social-media-automation-liart.vercel.app/`
2. **Show the dashboard** — pause for 2 seconds so the reviewer can see the app UI. The "Connect Instagram" button should be visible.
3. **Click "Connect Instagram"** — this starts the Facebook Login OAuth flow.
4. **Facebook Login dialog appears** — show the permissions being requested. If you're already logged into Facebook, the dialog may auto-proceed. If not, log in with your Facebook credentials.
5. **Grant all permissions** — click "Continue" or "Allow" on the permissions dialog.
6. **Page Selection screen** (if you have multiple Pages):
   - The app should redirect to `/select-page`
   - Show the list of Facebook Pages with their linked Instagram usernames and profile pictures
   - **Click on the Page you want to connect**
   - This proves `pages_show_list` is working
7. **Dashboard loads with connected account:**
   - Show the Instagram **profile picture** displayed on the dashboard
   - Show the **username** next to the profile picture
   - Show the **Facebook Page name** in the status line
   - Show the **post count** (media count)
   - Pause here for 3–4 seconds so the reviewer can clearly see all the info
   - This proves `instagram_basic` is working
8. **Done** — stop recording.

### If You Only Have ONE Facebook Page
That's okay — the app will auto-connect and skip the Page Selection screen. The flow will go: Click Connect → Facebook Login → Dashboard shows connected account. Just make sure the dashboard clearly shows the profile picture, username, and page name. You can add a brief note when uploading the screencast for `pages_show_list` saying: "Test account has only one Page, so auto-selection occurs. Multi-page selection UI is implemented at /select-page."

---

## RECORDING 2: Publish Flow
**Upload this video to:** `instagram_content_publish`
**Target length:** 60–90 seconds
**What it proves:** Your app can compose and publish posts to Instagram on behalf of the user.

### Before You Record
- Make sure you are already connected to Instagram (from Recording 1)
- Have a test image ready to upload (any photo will work)
- The post WILL be published to the connected Instagram account, so use an image you don't mind posting

### Step-by-Step Script

1. **Show the dashboard** — the connected Instagram account should be visible (profile pic, username). Pause briefly.
2. **Start creating a post:**
   - Look for the content creation / compose area
   - **Upload an image** — click the upload area or button, select a photo from your computer
   - Show the image preview appearing in the app
3. **Generate or write a caption:**
   - If AI caption generation is available, click **"Generate Caption"** — show the AI generating a caption
   - The generated caption should appear in the text area
   - You can optionally edit the caption to show it's editable
4. **Publish the post:**
   - Click **"Publish Now"**
   - Wait for the success message / confirmation
   - Show the success state in the app
5. **Verify on Instagram** (optional but strongly recommended):
   - Open a new tab and go to `instagram.com`
   - Navigate to the connected account's profile
   - Show the newly published post appearing in the feed
   - This proves the end-to-end flow works
6. **Done** — stop recording.

### If Publishing Fails
If the publish fails during recording (API error, etc.), you can:
- Retry the publish
- Or show the scheduling flow instead (set a future date/time and show it in the scheduled list)
- Make sure to delete any test posts from Instagram after recording

---

## Upload Instructions

Once you have the 2 recordings saved as .mp4 or .mov files:

1. Go to https://developers.facebook.com/apps/931584669378224/app-review/submissions/?submission_id=936159178920773
2. Click **"Allowed usage"** tab (or expand the Allowed usage section)
3. For each permission, click **"Get started"** then find the screencast upload step:

   | Permission | Upload Which Video |
   |---|---|
   | **pages_show_list** | Recording 1 (Connect Flow) |
   | **instagram_basic** | Recording 1 (Connect Flow) |
   | **business_management** | Recording 1 (Connect Flow) |
   | **instagram_content_publish** | Recording 2 (Publish Flow) |

4. After all 4 screencasts are uploaded, go back to the submission summary
5. All sections should now show green checkmarks
6. Click **"Submit for review"**

---

## Recording Tips

- **Software:** QuickTime Player (Mac: File → New Screen Recording) or OBS Studio (free, any OS) or Loom
- **Resolution:** 1080p recommended
- **Audio:** Not required, but brief narration can help reviewers understand what's happening
- **File format:** .mp4 or .mov (both accepted by Meta)
- **File size:** Max 2 GB per file (your 60-90 second recording will be well under this)
- **Browser:** Use Chrome with a clean window (no personal bookmarks bar or sensitive tabs visible)
- **Speed:** Move at a moderate pace — don't rush clicks. Give the reviewer time to see each screen.
