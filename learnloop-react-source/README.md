# LearnLoop — React + Supabase

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

For the existing project that already has profiles and posts, run **supabase/002_connected_app.sql** once in Supabase SQL Editor. Do not rerun schema.sql.

For a new project, run schema.sql first, then 002_connected_app.sql. Both migrations are transactional. Neither adds sample data or deletes existing posts. Migration scripts intentionally fail when rerun rather than silently masking mismatched schemas.

Open the app and sign in. The old /community route now redirects to Home. If the migration is missing, the app shows a setup message and blocks changes until Refresh succeeds.

## Connected features

- Home posts, images, comments, aggregate likes and share counts, follows, profiles, and search.
- Reels saved as direct HTTP(S) video URLs with captions and interactions.
- Shared practice quizzes; completed attempts are scored by a database function.
- Private saved items, drafts, focus pods, completed sessions, best quiz results, and preferences.
- Data is refreshed on sign-in, manual Refresh, and after saves. This version does not use realtime subscriptions.

New writes wait for Supabase before showing success. Failed saves keep forms open. Account changes clear the previous account's loaded data. Import/reset are disabled in connected mode to prevent accidental replacement of shared records. Export downloads the loaded workspace. Old local browser data is not uploaded automatically.

Images currently retain the prototype's 1 MB upload limit and are stored in the post row as data URLs; move them to object storage before scaling. Video hosting/transcoding is not included. Practice quiz answers are readable so learners can review explanations; this is not an exam or anti-cheat system. Private item rows are editable by their owner, so personal progress is not a trusted credential.

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
