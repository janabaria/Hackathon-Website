# Learning workspace setup

## Database upgrade

Existing projects: run `supabase/004_learning_workspace.sql` and then `supabase/005_learning_validation.sql` once in Supabase SQL Editor, after migrations 001–003. This preserves profiles, posts, reactions and saved items, migrates personal pods to private shared pods, adds owner-only deletion, and creates notebook/exam storage plus pod request policies. Existing likes now mean **Study this**. Then apply `006_social_study_rooms.sql` for avatar storage and authenticated shared rooms.

New projects: run `schema.sql`, `002_connected_app.sql`, `003_reel_uploads.sql`, then `004_learning_workspace.sql` `005_learning_validation.sql`, then `006_social_study_rooms.sql` in that order.

## Account deletion

Deploy `supabase/functions/delete-account/index.ts` as **delete-account**. It validates the user's bearer token with `auth.getUser`, removes their uploaded videos using the Storage API, then deletes only that authenticated user through the admin API. Database cascades remove their data. Do not test it on an account you want to keep.

With the Supabase CLI, from this app directory:

```sh
supabase login
supabase functions deploy delete-account --project-ref mmbyzepmtxcrzwjbaloe
```

The config uses `verify_jwt = false` because the function performs its own server-verified `getUser(token)` check, compatible with asymmetric auth tokens. Never remove that check. The built-in `SUPABASE_SERVICE_ROLE_KEY` stays on the server; do not put it in Vite variables.

## Optional AI setup (disabled until configured)

Manual quiz authoring, publishing, matching blocks and flashcards work without AI. The AI flow accepts source notes, generates a draft, and requires review before publishing. Generated games use a validated matching-block or flashcard configuration, not arbitrary executable code.

1. Deploy **generate-learning** and **review-post** from their matching folders under `supabase/functions/`. Both authenticate the user server-side with `getUser(token)`; keep legacy JWT verification off, as specified in `config.toml`.
2. In Supabase **Edge Functions → Secrets**, add `GEMINI_API_KEY` with a key created at [Google AI Studio](https://aistudio.google.com/apikey). The default model is `gemini-3.5-flash-lite`; `GEMINI_MODEL` is an optional override. `GEMINI_REVIEW_MODEL` can separately override the post-review model, which must support Google Search grounding only when that optional feature is enabled. No key belongs in `.env.local` or in GitHub. Configure provider spending/quota controls before enabling it; this app does not assume a paid or free plan.
3. Each authenticated user can request up to 10 AI requests (drafts and reviews combined) per database day. Failed provider calls also count, to prevent repeated expensive calls.
4. Test using non-sensitive study notes. The UI discloses that notes are sent to the configured AI provider. AI-generated answers should always be reviewed.

```sh
supabase functions deploy generate-learning --project-ref mmbyzepmtxcrzwjbaloe
supabase functions deploy review-post --project-ref mmbyzepmtxcrzwjbaloe
```

References: [Gemini JSON generation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [Supabase user validation](https://supabase.com/docs/reference/javascript/auth-getuser), [Supabase account deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).

## Reminders

Reminders are in-app only. The bell shows a notebook check-in 96 hours after creation and exam reminders during the selected lead window. They refresh every minute, on window focus and when opening the app. Dismissals sync to the account. No emails or notifications are sent when the app is closed.

## Collaboration

Each developer needs their own `.env.local` copied from `.env.example`, with the same project URL and **publishable** key, then restarts Vite. The file is intentionally ignored by Git. Run `npm install` after pulling dependency changes, then `npm run dev` and open the URL printed by that terminal.

Deployment on 2026-09-28: migrations 004–005 and both Edge Functions installed on the connected project; AI provider secrets intentionally not configured.

## September 29 upgrade

Migration 006 and the updated generator plus new review-post function are installed on the connected project. Post review sends only the selected post caption/topic and explicitly does not verify attached media. Source links and Google Search suggestions are included only when optional search grounding is enabled. AI generation rejects non-educational requests and validates returned quiz/game data before showing an editable draft.

If Google rejects a request, the app distinguishes quota exhaustion, unavailable models, and key/project access errors. Provider quota and account eligibility remain external prerequisites. Do not place Gemini or service-role secrets in Vite variables.

Shared room membership and game writes are enforced by RLS. The application polls active rooms; no realtime publication setup is needed. Calls use peer-to-peer WebRTC with STUN only. A production TURN relay and a two-device media test remain necessary for reliable use across restrictive networks. No video/audio is stored.

Gemini 2.5 is restricted for new projects; the default is now `gemini-3.5-flash-lite`, which offers a free text-generation tier subject to Google quota. Post reviews default to an unverified knowledge-based assessment. Set `GEMINI_SEARCH_GROUNDING=true` only if the Google project supports paid Google Search grounding; this enables web citations and search suggestions. The app does not enable billing. See [current pricing](https://ai.google.dev/gemini-api/docs/pricing).

Live verification on September 29: Gemini post review returned a knowledge-based assessment, and generate-learning returned a valid three-question cell-biology quiz into the editable review screen. The test draft was not published. Quiz output uses bounded question and text lengths to prevent oversized incomplete responses. AI game generation shares this endpoint but was not separately exercised live.
