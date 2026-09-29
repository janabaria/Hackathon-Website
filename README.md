# Beyond the Book — React + Supabase

An empty-by-default social learning app using React, TypeScript, Vite, and Supabase. Existing profiles and posts are preserved when upgrading.

## Run

Use Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
# Copy .env.example to .env.local and enter your project URL and publishable key.
npm run dev -- --port 5174 --strictPort
```

The local project is already configured. Do not use a service-role key in the browser. Configure the same VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY variables on your deployment host before building.

## Database upgrade

Existing installations through migration 003: run **004_learning_workspace.sql**, then **005_learning_validation.sql** once in the Supabase SQL Editor. Then run **006_social_study_rooms.sql** for profile photos and shared pod rooms. Migrations through 006 are already applied to the connected project. Do not rerun earlier migrations.

New installations: run `schema.sql`, `002_connected_app.sql`, `003_reel_uploads.sql`, `004_learning_workspace.sql`, `005_learning_validation.sql`, and `006_social_study_rooms.sql` in order. No sample content is inserted.

See [Learning workspace setup](supabase/LEARNING_WORKSPACE_SETUP.md) for Edge Functions, optional AI configuration, and reminders.

## Connected features

- Posts and portrait reels with device video uploads, Study this selections, saves, discussions, and owner-only deletion.
- Required interest categories at signup, clickable interests, profile photo uploads, and earned learning badges.
- Notebook library and three-column section/page editor, formatted note previews, and attachments from studied/saved posts and reels. Study this offers Create pod or Add to notebook, including new notebook creation.
- Exam calendar and in-app reminders for exams and four-day notebook review.
- Manual community quizzes, matching-block games, flashcards, and optional AI draft creation/review.
- Public/private pods, membership requests, and creator approvals. Private goals require approved membership.
- Search across profiles, post captions, reel titles/captions, topics, and creators.
- Account deletion through an authenticated server function with storage cleanup.
- Pod presence, microphone/camera calls, host-controlled shared quizzes, answer-block mini games, and round scoreboards. Room state polls every 2 seconds; signaling polls every 1.2 seconds, with membership enforced by database policies.
- Other data refreshes on sign-in, manual Refresh, and saves.

New writes wait for Supabase before showing success. Failed saves keep forms open. Account changes clear the previous account's loaded data. Import/reset are disabled in connected mode to prevent accidental replacement of shared records. Export downloads the loaded workspace. Old local browser data is not uploaded automatically.

Images currently retain the prototype's 1 MB upload limit and are stored in post/profile rows as data URLs; move them to object storage before scaling. Videos use private Supabase Storage; transcoding is not included. Practice quiz answers are readable so learners can review explanations; this is not an exam or anti-cheat system. Private item rows are editable by their owner, so personal progress is not a trusted credential.

With no Supabase environment configuration, the app can still run in local-only mode using its original browser storage.

## Source organization

- src/app/App.tsx — routes and sign-in gate
- src/pages/ — screens and forms
- src/components/ — reusable layout, cards, dialogs, and actions
- src/state/AppProvider.tsx — session lifecycle, async saves, refresh, state
- src/services/account.ts — Supabase reads/writes and data mapping
- src/services/supabase.ts — client configuration
- src/domain/ — typed schemas and pure local transitions
- src/styles/ — design tokens and responsive styles
- supabase/ — SQL migrations and setup notes
- scripts/database-test.mjs — isolated PostgreSQL migration/access tests

## Checks

```sh
npm run build
npm test
npm run test:database
npm run format:check
```

Database tests use an isolated in-memory PostgreSQL runtime with simulated authenticated users. They do not write to the live project. They verify existing data survives the upgrade, account isolation, shared reactions/comments, rejected impersonation, anonymous denial, and best-score preservation.

After applying the migration, verify the live app with two accounts: post/comment/like/follow, refresh, switch accounts, and confirm that private drafts and bookmarks remain private. Live verification requires the migration to be applied first.

## Video file uploads

Run supabase/003_reel_uploads.sql once after migration 002. Reels → Add reel now defaults to a file picker, with preview and MP4/WebM support up to 50 MB. Link entry remains optional. The private reel-videos bucket permits authenticated members to read videos and upload only into their own user-ID folder. Playback uses one-hour signed URLs; Retry refreshes access if a video expires while the page stays open. The database stores a stable storage locator, not the expiring link.

Uploads are standard single-request transfers, not resumable. A failed post save keeps the uploaded locator in the open form so retry does not upload again. Leaving the page after an upload but before a successful post save can leave an unused object in Storage; automatic orphan cleanup is not implemented. Files must use a browser-supported codec; there is no transcoding. The live upload flow needs verification after the storage migration runs.

## Appearance, language, and custom interests

Open Settings from the top bar or profile. The hue wheel, saturation/brightness square, keyboard sliders, and hex field update a preview only. Save changes applies the color, light/dark mode, text spacing, and English/Arabic language choice. Cancel changes restores saved preferences. Account preferences use the existing private settings record; local mode saves in this browser. No new SQL migration is required.

Arabic uses right-to-left layout. Interface translations live in `src/lib/i18n.tsx`; user-created content keeps its original language. Theme conversion and contrast helpers are in `src/lib/appearance.ts`.

In Edit Profile or signup, Other interests opens a dialog. Custom interests become selected category buttons and are saved with the profile. Blank and duplicate interests are rejected; the existing 20-interest and 120-character limits apply.

## Beyond the Book identity and device theme

The interface is now BTB (Beyond the Book). `Brand.tsx` contains a scalable vector recreation of the supplied book/network mark. The letters in BTB smoothly expand into Beyond the Book on hover or keyboard focus, while the sidebar stays the same width. Transparent black and white SVG assets are in `public/btb-logo-black.svg` and `public/btb-logo-white.svg`.

Device theme is the default for new and existing accounts. Choose Device theme, Light, or Dark in Settings. The synchronous `public/theme-init.js` applies appearance before React renders; a small local appearance cache preserves explicitly saved preferences during account loading. Device-theme changes are observed live. No SQL migration is needed; `followDeviceTheme` is stored in the existing private settings record. Legacy storage/database identifiers are intentionally retained so existing accounts and content continue to work.

## Shared room limits and verification

Calls use WebRTC peer-to-peer media, Google STUN, and authenticated Supabase signaling. No recording is implemented. HTTPS (or localhost) and browser microphone/camera permission are required. A TURN relay is not configured: restrictive networks can prevent calls, so cross-network media must be tested before production use. Small study groups are the intended scope.

The isolated database tests simulate an owner, approved member, and outsider. They verify simultaneous presence, signaling ownership, per-user answers, and host-only round control. This is not a two-device microphone/camera test. Test with two signed-in accounts on separate devices: request/approve membership, both enter the pod, start a published quiz as host, answer from each account, then join audio/video and check mute/camera/leave.

Notebook, Study this, avatar upload, and reel deletion browser checks use a separate local-only workspace to preserve existing account content.

## Owner administration

Apply `supabase/007_admin_controls.sql` after 006, then run `supabase/008_activate_owner.sql` in the trusted Supabase SQL Editor. The activation script matches exactly one **verified** auth account for `mhamedmohamad3@gmail.com` and attaches access to its UUID. It gives that account unlimited **BTB** AI allowance; Gemini/provider quotas remain unchanged. It does not grant Supabase project ownership or reveal API secrets.

The Administration link appears in the sidebar and connected account Settings after refresh/sign-in. Admins can change the default daily AI allowance, override each user's allowance, reset today's app usage, pause AI globally, restrict/unrestrict contributions, and hide/restore posts, reels, discussions, quizzes and pods. Changes require a reason and write an immutable browser-facing audit trail. `-1` means unlimited, `0` means no requests, and an empty user override inherits the default. Limits reset at midnight UTC. Failed provider requests count toward app usage.

Restrictions block new/updated contributions, room participation and AI calls. They do not ban authentication, erase content, or prevent private notebook access/export. Moderation removes content from subsequent database reads; already loaded copies disappear on refresh. An active peer-to-peer call may need participants to leave to fully end media already connected. Admins cannot view private notebooks, promote other admins, access passwords/API keys, impersonate accounts, or permanently delete other accounts through this panel. Admin grants are deliberately limited to the trusted SQL Editor.

Redeploy `generate-learning` and `review-post` after the migration so errors display the configurable app allowance rather than the previous hard-coded ten-request message. Existing authenticated quota enforcement is retained. The new database test covers denied non-admin access, owner activation, adjustable quotas, restrictions, moderation restoration, notebook privacy and audit protection.

## Video thumbnails and restored Profile navigation

Migration 009 adds validated optional thumbnails for post videos and reels. New video forms accept PNG/JPG/WebP/GIF covers up to 1 MB with preview and removal. Covers appear before playback and in reel profile/search cards. Existing videos remain valid without a custom cover. Profile is restored alongside Notebooks in both desktop navigation and the six-item mobile bar; mobile administration remains accessible from Settings.

Live deployment on September 29: migrations 007–009 installed; the verified owner account was activated after explicit confirmation. Both AI Edge Functions were redeployed. The owner dashboard showed unlimited app allowance, thumbnail file preview was checked, and mobile Profile navigation was verified at 390px width. Build, 28 app tests, and 5 database tests passed. No other user was restricted and no content was hidden during live verification.
