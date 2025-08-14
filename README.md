# Burma Town Web App

This project is a React + Vite TypeScript app. It supports three environments and can connect to a backend via `VITE_API_URL`.

## Environments

- `.env.development` (local dev)
- `.env.staging` (staging)
- `.env.production` (production)

Set `VITE_API_URL` to your backend base URL, e.g.

```
VITE_API_URL=https://api.example.com
```

## Backend contract (current assumption)

- GET `/posts` -> `Array<{ id, title, body, media?, price?, author, authorEmail?, authorAvatar?, authorType?, createdAt }>`
- POST `/posts` -> same shape with `id` returned
- GET `/questions` -> `Array<{ id, title, details?, author, authorEmail?, authorAvatar?, createdAt }>`
- POST `/questions` -> same shape with `id` returned

If your API differs, update `lib/api.ts` and I can adjust the mapping.

## Local development

- `npm install`
- `npm run dev` (uses `.env.development`)

## Staging / Production builds

- `npm run build:staging` -> outputs to `dist/`
- `npm run build:prod` -> outputs to `dist/`

## Deploy (Netlify example)

- `netlify.toml` is configured for SPA routing.
- GitHub Actions workflow `.github/workflows/deploy-netlify.yml` builds and deploys on push to `main`.
- Add repository secrets:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

## Notes

- The app falls back to local in-memory data if `VITE_API_URL` is not set or API calls fail, so you can keep working offline.
- To extend backend integration (comments, reactions, follows), wire to your endpoints in `app/BurmaTown.tsx` and `lib/api.ts`.

## Persistence Adapter Layer (Milestone Completed)

Implemented an adapter abstraction (`lib/adapters.ts`) with:

- `localAdapter`: Builds entities client-side only (uses uid + timestamps).
- `remoteAdapter`: Calls real API endpoints when `VITE_API_URL` is set; falls back to local shape on failure for resilience.
- `recordUserAction(actionType, payload)`: Fire-and-forget logging endpoint (`POST /actions`) with up to 3 retry attempts (incremental backoff). On total failure it dispatches a `window` event `bt_user_action_log_failed` so UI can surface a toast.
- `AdapterProvider` (`lib/AdapterContext.tsx`): Supplies a single adapter instance; hooks (`usePosts`, `useQuestions`) resolve adapter from context or auto-select one.

Hook changes:
- All create operations (`createPost/addComment/addReply/askQuestion/answerQuestion`) now use the adapter.
- Stars / reports / useful toggles perform optimistic local state mutation and emit `recordUserAction` events (if remote and endpoint available).

Tests:
- Adapter context tests assert `recordUserAction` is invoked.
- Engagement persistence tests ensure `persistEngagement` is called.
- Total tests: 13 (optimistic update, nested replies, stars/reports/useful toggles, adapter context + engagement) – passing.

### Engagement Persistence & Hydration

Implemented optional enhancements:

- `sendEngagementApi` (`POST /engagement`) + `sendEngagementBatchApi` (`POST /engagement/batch`) with automatic batching (300ms window) and fallback to sequential.
- Queue flush on timer or `beforeunload`; manual flush uses the same logic.
- Events:
  - `bt_engagement_pending` (detail: `{ count }`) each enqueue.
  - `bt_engagement_flush` (detail: `{ count, manual? }`) after successful flush.
  - `bt_user_action_log_failed` on action log failure (already in earlier milestone).
- Server-side hydration for initial `stars`, `reports`, `useful` counts if backend includes them in `/posts` or `/questions` payloads.
- Follow/unfollow endpoints integrated (`/follow/:email` POST/DELETE).
- Toast surfaced on action log failures and engagement flush success (count).

Observation tips: enable `VITE_API_URL` and watch network calls to `/engagement`, `/engagement/batch`, and `/actions`.

Remaining nice-to-haves:
- Auth groundwork added: remote sign-in/sign-up when API_URL present (token stored in session); local fallback remains.
- Added global `AppErrorBoundary` component for catching unexpected runtime errors.
- E2E mock integration test hitting adapter with a fake fetch.
- Visual per-entity queued indicator (currently only global count / toast).
- Debounced batch for `recordUserAction` (still per-event fire-and-forget).
- Remove legacy placeholder test file if filesystem duplication no longer an issue.

## Step-by-step: Backend + Deploy

Use these steps to wire the backend, test locally, and deploy to Netlify using the existing GitHub Actions workflow.

### 1) Confirm backend URL for each environment

Update these files with your real API base URL (no trailing slash):

- `.env.development` → local dev
- `.env.staging` → staging
- `.env.production` → production (used by the GitHub Actions build)

Example values:

```
VITE_API_URL=https://api.your-backend.com
VITE_APP_ENV=production
```

Important: Because the current workflow builds on GitHub Actions and then deploys static files to Netlify, the production URL must be present in `.env.production` (or injected via workflow env vars). Netlify site env vars are only used if Netlify performs the build.

### 2) Smoke test your backend (PowerShell)

```powershell
# Replace with your real URL
$api = "https://api.your-backend.com"

# Check posts and questions endpoints
Invoke-WebRequest -UseBasicParsing "$api/posts" | Select-Object StatusCode, Content | Format-List
Invoke-WebRequest -UseBasicParsing "$api/questions" | Select-Object StatusCode, Content | Format-List
```

Expect HTTP 200 and JSON in Content. If unauthorized or CORS errors, fix backend config first.

### 3) Run locally against your backend

```powershell
cd "c:\VS Code\burmatown_app"
npm install
npm run dev
```

Open http://localhost:5173 and verify:
- Feed loads posts and questions from your backend
- Create a Business post works
- Ask the community (question) works
- Creator profile opens on author click

If errors occur, check the browser Network tab and align `lib/api.ts` with your API schema.

### 4) Build for production

Already available, but you can re-run locally if needed:

```powershell
cd "c:\VS Code\burmatown_app"
npm run build:prod
```

Optional preview:

```powershell
npx serve .\dist
```

### 5) Deploy via GitHub → Netlify (current workflow)

This repo deploys by building on GitHub Actions and uploading the `dist/` folder to Netlify.

1. Create a Netlify site (no need to enable Netlify builds for this path).
2. In GitHub repo Settings → Secrets and variables → Actions, add:
   - `NETLIFY_AUTH_TOKEN` = your Netlify personal access token
   - `NETLIFY_SITE_ID` = your Netlify site ID
3. Ensure `.env.production` contains your real `VITE_API_URL`.
4. Push to `main` and watch the Actions tab for the deploy job.

Netlify environment variables are NOT used in this path because the build happens in GitHub. To keep your API URL out of the repo, you can inject it via the workflow instead (see below).

Inject via workflow (optional): edit `.github/workflows/deploy-netlify.yml` and add an `env:` block to the build step:

```yaml
      - run: npm run build:prod
        env:
          VITE_API_URL: https://api.your-backend.com
          VITE_APP_ENV: production
```

### 6) Alternative: Build on Netlify

If you prefer Netlify to run the build (so Netlify env vars are used):

- Connect the GitHub repo in Netlify and enable builds.
- Set build command to `npm run build:prod` and publish dir to `dist` (already reflected in `netlify.toml`).
- Set site environment variables in Netlify UI:
  - `VITE_API_URL = https://api.your-backend.com`
  - `VITE_APP_ENV = production`
- Either remove or disable the GitHub Actions deploy step, or switch it to a “preview” flow.

### 7) Verify live site

After deployment, open your Netlify site URL and test:
- Feed shows backend posts/questions
- Creating post/question succeeds
- Creator view opens and follower count displays

Check the browser console/Network tab for any failing requests.

### 8) Fix common CORS/env issues

- CORS: Add your site origin (e.g., `https://<your-site>.netlify.app` and your custom domain) to the backend’s allowed origins.
  - Node/Express example: use `cors` with `origin: ["https://<your-site>.netlify.app"]`.
  - Server headers: include `Access-Control-Allow-Origin` with your site origin, and `Access-Control-Allow-Methods`/`Headers` as needed.
- Mixed content: Make sure your API is served over HTTPS when your site is HTTPS.
- Wrong URL at runtime: Confirm the built app used the intended API by checking the network request host. If wrong, update `.env.production` (or workflow env) and redeploy.

---

If you share your actual API schema, I can align `lib/api.ts` request/response mappings (including comments, reactions, follows) and add basic integration tests.

## Phase C: Observability & CI Enhancements
Summarized earlier (fetch timing events, unhandled handlers, smoke test, typecheck + lint in CI).

## Phase D: Performance & Accessibility Improvements

Implemented initial performance & a11y polish:

- Code splitting: `BurmaTown` lazily loaded with `<Suspense>` fallback (`main.tsx`).
- Performance marks: `app_start`, `first_render`, `hydrated` via `lib/perf.ts`.
- Hydration mark emitted after remote content fetch completes.
- `instrumentedFetch` already provides timing events; perf marks complement network metrics.
- Accessible loading fallback (`aria-live="polite"`).
- Global unhandled handlers previously added ensure runtime errors surfaced (indirect UX quality/perf impact by quick detection).

Next potential Phase D tasks:
-## Phase E: Offline Queue Persistence
## Phase E: Offline Queue Persistence

Added persistence for engagement & action log queues:
- Queues now saved to localStorage (`bt_engagement_queue`, `bt_action_log_queue`).
- On page load existing queued items are loaded and will flush automatically when back online.
- `online` event triggers flush attempts.
- Still uses existing batching windows; persistence ensures no data loss across reloads / temporary offline periods.

Future enhancements:
-## Phase F: Runtime Metrics Overlay

Added developer metrics panel (toggle with Ctrl+Alt+M):
- Displays perf marks & derived durations.
- Live list of recent fetch timings (instrumented via `instrumentedFetch`).
- Accessible close button; overlay is pointer-interactive while rest of app remains.
- Uses custom DOM events (`bt_fetch_timing`, `bt_perf_mark`).

Can be extended to include memory, React profiler snapshots, or custom domain counters.

- Add size cap / TTL eviction for very stale events.
- Service Worker for background sync (could register and move logic there).
- UI badge indicating number of persisted (offline) events.

- Preload critical above-the-fold assets (e.g., hero image, first icon sprite).
- Add dynamic import boundaries for seldom-used views (business profile editor etc.).
- Implement a metrics overlay (listening to `bt_perf_mark` & `bt_fetch_timing`).
- Lighthouse / axe automated accessibility scan in CI.
- Replace large icons with tree-shaken subset if bundle analysis shows wins.
- Image optimization: responsive `srcset` or query parameters if CDN present.


## Phase B: Validation & Moderation (Client-Side)

Added lightweight client validation + basic moderation heuristics:

- New module: `lib/validation.ts`
  - `validatePost / validateQuestion / validateComment / validateAnswer` enforce length + required fields.
  - Central `limits` object for easy policy tuning.
  - `moderateText` + banned word list (placeholder) and `attachModeration` to mark content `{ flagged, moderationReasons }`.
  - `firstError` helper surfaces primary error.
- Hooks integration:
  - `usePosts.createPost`, `addComment` now validate & attach moderation flags before optimistic insert.
  - `useQuestions.askQuestion`, `answerQuestion` similarly validate & flag.
  - Toast shown on validation failure; network call skipped.
- Report throttling (spam guard):
  - Simple in-memory 3s window per entity (post/comment/reply/question/answer) to reduce duplicate rapid report toggles.
  - Disabled automatically in test environment (`NODE_ENV=test`) to keep deterministic tests.
- Types updated (`PostModel`, `QuestionModel`) with `flagged` & `moderationReasons` fields for future UI surfacing (e.g., badge or admin review panel).
- New tests: `tests/validation.test.ts` covering validators + moderation function; overall test count increased.

Next (potential) moderation steps:
1. UI indicator for flagged content (e.g., subtle badge / collapsible warning).
2. Server-provided moderation API alignment (replace local banned list with server-sent policy).
3. Rate limiting & abuse detection events (emit analytic events when throttle triggers).
4. Admin review queue component (filter `flagged===true`).
5. Persist moderation flags remotely when backend supports returning canonical decision.

