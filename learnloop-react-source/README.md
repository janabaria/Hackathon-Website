# LearnLoop · React workspace

A separate, editable React + TypeScript version of LearnLoop. It starts empty: no sample posts, accounts, reels, quizzes, pods, or activity. The existing HTML demo is separate.

## Run locally

Use Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. This is a React project, so run the development server instead of double-clicking index.html.

```sh
npm run build        # Type checking and production output in dist/
npm run preview      # Preview the production build
npm test             # Data integrity and state transition tests
npm run format       # Format source files
npm run format:check # Check formatting
```

## Add your content

1. Open Profile → Edit profile to add your name, bio, interests, and skills.
2. Use Create post for a learning and optional image (up to 1 MB).
3. Open Reels to add a title, caption, topic, and direct HTTP(S) video URL. Use an MP4/WebM resource, not a YouTube page URL; the host must permit playback.
4. Open Interact to create quizzes with four answers per question, a correct answer, and optional explanation.
5. Home → Focus pods lets you create personal learning goals and run focus timers.
6. Profile → Creator studio provides a draft editor and a local writing checklist. Save a draft explicitly before leaving the page.
7. Settings provides JSON export, validated import, and workspace reset. Import replaces the entire workspace after confirmation.

`data/empty-workspace.json` is an empty import template. For complete content shapes, see `src/domain/schema.ts`. Creating content through the forms and exporting it is the easiest way to build a valid data file. Additional accounts can be added through JSON import; author IDs must refer to the local profile or an account. IDs must be unique.

## Code map

```text
src/
  app/App.tsx          Routes and shared post composer
  components/          Layout, modal, cards, content actions, reusable UI
  pages/               One view per feature, plus focused editor components
  domain/schema.ts     Data types, validation, and empty initial state
  domain/actions.ts    Pure state transitions
  domain/actions.test.ts
  state/AppProvider.tsx Shared React state and persistence coordination
  services/storage.ts Browser storage and JSON download boundary
  hooks/               Focus timer logic
  lib/utils.ts         Small shared helpers
  styles/tokens.css    Colors, typography, spacing, theme tokens
  styles/app.css       Component styles and responsive layouts
```

To change the appearance, begin with the style tokens. To add a field, update the schema, relevant action, and its form. To connect a backend, replace the storage boundary and adapt the provider to asynchronous requests; keep the pure domain actions and validation reusable.

## What this version supports

Responsive sidebar/bottom navigation, feed filtering, posts, comments, like/save toggles, copying shared content, reel playback, quiz authoring and scoring, profile editing, live search, focus timers, draft publishing, dark mode, and JSON import/export. Empty states explain how to add content rather than showing fictional activity.

## Storage and scope

This is a front-end workspace, with no backend, authentication, live calls, or shared multi-user data. Focus pods are personal timers. The creator checklist is rule-based, not an AI service. Like counts represent this local user's toggle; sharing copies the content because local posts do not have public URLs.

Data is saved under `learnloop-react.workspace.v1` in this browser's localStorage, separate from the earlier demo. Use one active editing tab: there is no cross-tab synchronization. Other browsers/devices and different ports have separate data. Browser storage can be cleared and has a limited quota; export backups, and use hosted images rather than many uploads for larger datasets. Failed saves report an error. Invalid stored data is preserved for recovery rather than silently replaced.

The source archive includes no node_modules or generated build files. Production builds use hash routes and relative assets so dist/ can be served by a static web host. A localhost preview is only accessible on this computer; public hosting is a separate deployment step.
