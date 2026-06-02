# Improved MCQ Study App Requirements

This document extracts the current product requirements from the existing README and implementation, then turns them into a cleaner specification for a new project that should preserve the useful v2 behavior while fixing the largest maintainability, reliability, accessibility, and product gaps.

## Source summary

The current app is a static SvelteKit multiple-choice study app focused on topic filtering, per-session scoring, local progress tracking, and mistake practice. The README describes a single-page study workflow with no authentication or backend database, static JSON questions, GitHub Pages deployment, and future feature ideas such as shuffle mode, question caps, bookmarks, dark mode, accessibility improvements, and PWA support. The replacement project should intentionally move beyond those v2 boundaries by supporting MongoDB Atlas, secure member accounts, subscription-gated areas, login, and an eventual payment gateway that may be supplied by Hostinger or another provider.

## Product goals

1. Help students practice FBLA-style multiple-choice questions efficiently by topic, category, and personal weakness.
2. Support secure member accounts, subscription-gated study features, and a paid-access path without exposing privileged content or account data on the client.
3. Use MongoDB Atlas as the primary database for users, subscriptions, question metadata, attempts, and progress history.
4. Keep a static-friendly front end where practical, but assume the new product has a backend/API layer for authentication, authorization, payments, and member data.
5. Make progress and review behavior resilient across reloads, data updates, and interrupted sessions.
6. Improve trust in the app by validating question data and aligning documentation with the actual bundled or database-backed dataset.
7. Provide an architecture that can grow beyond one monolithic page without making the first release complicated.

## Target users

- Students preparing for FBLA or similar business/technology competitions.
- Teachers or coaches who want managed classes, curated content, or paid member access without manually distributing files.
- Self-study users who need local progress, mistake review, quick topic filtering, and cloud-synced history across devices.
- Site administrators who need to manage users, subscriptions, question sets, and payment/support workflows.

## In-scope requirements

### Quiz workflow

- Show one question at a time.
- Support four-option multiple-choice questions with A/B/C/D labels.
- Allow option selection by click/tap and keyboard shortcuts.
- Use a clear state machine: select answer, submit answer, show explanation, continue to next question.
- Highlight the correct answer and the selected incorrect answer after submission.
- Show score as answered count and correct count during the session.
- Show current position within the active quiz.
- Let users quit a session and return to the filter/setup screen.
- Let users resume an interrupted active session if the stored session is still valid.
- End with a summary screen showing raw score and percentage.

### Topic filtering

- Load topics from question tags rather than duplicating counts manually.
- Normalize year/version suffixes in tags when grouping topics.
- Group topics into user-friendly categories such as Accounting, Business, Finance, Marketing, Technology, Economics, Leadership, Project, Personal, and Other.
- Show per-topic question counts.
- Search/filter topics by name.
- Select or clear individual topics.
- Select all topics and clear all selected topics.
- Toggle all topics within a category.
- Prevent quiz start when the chosen pool is empty or below the configured minimum question count.
- Display an explicit empty-state message when filters produce no usable questions.

### Practice modes

- Support normal practice from the selected topic pool.
- Support mistake practice from questions the user has answered incorrectly before.
- Add shuffle/randomized order as a first-class option instead of implying it without implementation.
- Add a question-count cap option, such as 10, 20, 50, all, or custom.
- Preserve the generated session order once a quiz starts so refresh/resume behavior stays deterministic.

### Persistence and progress tracking

- Persist active session state locally for guests or offline continuity, including selected tags, ordered question IDs, current index, current score, mode, and version metadata.
- Sync authenticated member progress to MongoDB Atlas, including seen count, correct count, incorrect count, last answered timestamp, optional streak metadata, bookmarks, and completed sessions.
- Treat localStorage as a cache, not the source of truth for authenticated members.
- Validate localStorage data before use.
- Recover gracefully from corrupt, stale, or incompatible localStorage data.
- Invalidate or migrate stored sessions when the question dataset version changes.
- Provide a reset-stats action with confirmation and separate account-level data deletion/export flows for members.

### Question data

- Define a required question schema:
  - `id`: stable unique string or number.
  - `question`: non-empty text.
  - `options`: exactly four non-empty strings for the initial release.
  - `correct`: zero-based index pointing to one option.
  - `explanation`: non-empty text.
  - `tags`: one or more non-empty strings.
- Validate question data during development and CI.
- Fail builds when duplicate IDs, missing fields, invalid answer indexes, empty options, or malformed tags are found.
- Keep documentation synchronized with actual dataset size.
- Treat client-side obfuscation as optional and explicitly non-security-sensitive.

### Member accounts and authentication

- Provide secure account registration, login, logout, password reset, and email-verification flows.
- Support role-based access control at minimum for guest, member, subscriber, and admin roles.
- Protect subscriber-only screens and API routes on the server; client-side route hiding is not sufficient.
- Store password credentials only through a trusted authentication provider or with industry-standard salted password hashing if implementing auth directly.
- Use secure, HTTP-only cookies or another server-validated session mechanism for authenticated requests.
- Add CSRF, XSS, and brute-force protections appropriate to the selected framework and host.
- Keep secrets such as MongoDB credentials, auth secrets, and payment keys in environment variables or managed secret storage, never in client bundles.

### Subscriptions and payments

- Include a subscription model with clear plan definitions, active/canceled/past-due states, renewal dates, and entitlement rules.
- Gate premium question sets, progress analytics, or advanced study modes based on server-verified subscription entitlements.
- Integrate with the payment gateway chosen for launch. Hostinger-provided payment tooling may be used if it supports secure checkout, webhook/event notifications, subscription status updates, and test mode.
- If Hostinger does not provide all required payment features, design the payment integration behind an adapter so Stripe, PayPal, or another gateway can be substituted.
- Never trust client-reported payment success. Subscription state must be updated from trusted gateway callbacks/webhooks or verified server-side API checks.
- Record payment provider customer IDs, subscription IDs, plan IDs, status, and renewal/cancellation timestamps in MongoDB Atlas.
- Do not store raw card or bank details in the app database.

### MongoDB Atlas data model

- Use MongoDB Atlas as the primary hosted database for the production app.
- Define collections for users, subscriptions, question sets, questions, attempts, sessions, bookmarks, and audit/security events.
- Add indexes for user email, provider customer ID, subscription status, question tags, question-set visibility, and user attempt history.
- Enforce tenant/member isolation in every query that reads or writes user-specific progress.
- Store question sets with visibility levels such as public, members-only, subscribers-only, and admin-only draft.
- Include created/updated timestamps and schema version fields on persisted documents.
- Plan backup, restore, and migration processes before launch.

### Accessibility and usability

- Use semantic buttons, headings, labels, and status messages.
- Add ARIA labels or descriptions where visual context is not enough.
- Maintain visible keyboard focus rings.
- Ensure keyboard shortcuts do not interfere with text inputs.
- Support reduced-motion preferences.
- Meet WCAG-friendly color contrast for answer states and buttons.
- Provide responsive layouts for mobile, tablet, and desktop.
- Avoid requiring external fonts/icons for core usability.

### Deployment and hosting

- Support a hosted full-stack deployment that can run a secure backend/API layer for authentication, MongoDB Atlas access, subscription checks, and payment callbacks.
- Use Hostinger if it can provide the required Node/server runtime, environment-variable management, HTTPS, custom domains, and payment gateway integration.
- If Hostinger cannot run the required backend safely, split deployment between Hostinger-hosted front end and a serverless/API host that supports secure MongoDB Atlas connectivity and payment webhooks.
- Keep the front end static-friendly where practical, but do not put MongoDB Atlas credentials or payment secrets in browser code.
- Include an SPA fallback for direct navigation refreshes.
- Provide accurate local development and deployment commands for both front end and backend/API services.
- Include CI/CD deployment documentation or workflows for the selected hosting stack.

## Out-of-scope for the replacement MVP

- Multiplayer or shared leaderboards.
- Native mobile apps.
- Manually storing or processing raw card data.
- Strong DRM for client-delivered free/sample questions. Premium access should be protected by server authorization rather than client obfuscation.
- Full spaced repetition scheduling, unless added as a later enhancement.

## Recommended architecture for the new project

### Suggested file structure

```text
src/
  app.html
  routes/
    +layout.svelte
    +page.svelte
  lib/
    components/
      FilterPanel.svelte
      QuizCard.svelte
      SummaryPanel.svelte
      TopicChip.svelte
    data/
      categories.js
      schema.js
    server/
      auth/
      db/
      payments/
      repositories/
    services/
      questionService.js
      sessionService.js
      statsService.js
      subscriptionService.js
    stores/
      quizStore.js
      settingsStore.js
      memberStore.js
    utils/
      shuffle.js
      storage.js
scripts/
  validate-questions.js
  validate-env.js
docs/
  new-project-requirements.md
```

### State management

- Keep domain logic out of Svelte components where practical.
- Store ordered question IDs for active sessions instead of repeatedly filtering global question data.
- Use a `Map` from question ID to question object for fast lookup when questions are loaded into memory.
- Keep filter state, active session state, stats state, auth state, and subscription entitlement state separate.
- Persist only serializable state and validate it before hydrating the app.
- Fetch member/subscription entitlements from the server instead of deriving them from browser storage.

### Data and environment validation

- Add a validation script that runs before build or deployment.
- Add an npm script such as `npm run validate:data`.
- Add an environment validation script that checks required server-only variables such as MongoDB Atlas URI, auth/session secrets, payment provider keys, webhook secrets, and public site URL.
- Make CI run data validation, environment-shape validation, and build checks.
- Generate a summary of total questions and total normalized topics as validation output.

### UX improvements over the current app

- Add clear logged-out, free-member, active-subscriber, expired-subscriber, and admin states.
- Show plan and billing status in a secure member account area.
- Show actual mistake-mode counts before quiz start.
- Explain why the Start button is disabled.
- Add shuffle and question-cap controls.
- Add bookmark/favorite support with a review mode.
- Add an import flow for custom JSON question sets once the base schema is stable.
- Add dark mode using CSS custom properties.
- Add an offline-capable PWA manifest and service worker after core state recovery is reliable, but do not cache protected subscriber-only data in a way that bypasses authorization after subscription expiration.

## Known issues in the current project to avoid

1. The README describes thousands of questions, but the checked-in JSON currently contains a much smaller sample dataset.
2. The current session store reads `localStorage` at module initialization without robust validation.
3. Invalid or stale persisted sessions can lead to a quiz screen with no question to render.
4. The active question pool is reconstructed by filtering all questions with `includes`, which loses any future custom order and is inefficient.
5. Mistake mode uses the normal filtered count for Start button state, so it can appear startable even when there are no mistake questions.
6. The favicon path references a PNG while the static asset is an SVG.
7. The obfuscation script uses absolute local paths and should not be considered security.
8. The UI is contained in one large route component, making future feature additions harder to isolate and test.
9. The current static-only architecture has no secure way to support members, subscriptions, payment callbacks, or protected premium content.

## Acceptance criteria for the replacement MVP

- A guest can access allowed public/sample questions without logging in.
- A user can register, verify email if required, log in, log out, reset a password, and access a secure member area.
- A subscriber can access premium/subscriber-only question sets, and a non-subscriber cannot access them through direct URLs or API calls.
- Subscription status is derived from server-side payment/provider verification, not browser-only state.
- Member progress is stored in MongoDB Atlas and can be resumed across devices.
- A user can select one or more topics, start a quiz, answer questions, read explanations, and complete a summary.
- A user can refresh mid-quiz and resume from the same question order and score.
- A user can practice only previously missed questions and receives a clear message if no missed questions exist.
- A user can choose sequential or shuffled order before starting.
- A user can cap a session to a selected number of questions.
- Corrupt localStorage does not break rendering.
- Question data validation passes in CI before deployment.
- Documentation states the true dataset size, database assumptions, payment assumptions, and supported deployment path.
- The app can be deployed with a secure backend/API path compatible with MongoDB Atlas and the selected payment gateway.
