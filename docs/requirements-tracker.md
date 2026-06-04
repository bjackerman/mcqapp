# MCQ App Requirements Tracker

This tracker converts `docs/new-project-requirements.md` into implementation status, gaps, and suggested milestones. Status values are intentionally simple:

- **Done**: implemented in the current static app.
- **Partial**: some UX/domain groundwork exists, but production requirements are not fully satisfied.
- **Not started**: no meaningful implementation yet.
- **Blocked by decision**: depends on a product/hosting/provider choice before implementation.

## Snapshot

| Area | Status | Current coverage | Remaining gap | Suggested milestone |
| --- | --- | --- | --- | --- |
| Quiz workflow | Done | One-question flow, A/B/C/D options, click/keyboard selection, submit/review/continue states, answer highlighting, score, progress, quit, resume, and summary are present. | Needs automated interaction tests and component extraction for maintainability. | M1: stabilize guest quiz |
| Topic filtering | Done | Filters use the supplied 44-topic canonical taxonomy, legacy tags normalize into those topics, bundled counts are derived from data, catalog counts are retained as metadata, and search/group/select/empty-state controls are present. | Needs tests around edge cases and larger production datasets. | M1: stabilize guest quiz |
| Practice modes | Done | Normal practice, mistake practice, shuffle, caps, and persisted ordered question IDs are implemented. | Needs automated tests proving refresh/resume order is stable. | M1: stabilize guest quiz |
| Guest persistence | Partial | Versioned local cache stores ordered IDs, score, mode, cap/shuffle settings, dataset version, stats, and completed summaries. Corrupt/stale data is normalized or invalidated. | No dedicated storage unit tests; no account-level export/delete because member accounts do not exist yet. | M1: stabilize guest quiz |
| Question data validation | Partial | A machine-readable per-record JSON Schema exists, and runtime validation plus `npm run validate` check IDs, required fields, four options, answer index, explanations, unsupported fields, duplicate tags, and known canonical topic tags. README states actual seed size and validation reports canonical topic coverage. | Validation is not yet wired into CI/deploy and does not validate environment shape. | M1/M2: CI quality gate |
| Accessibility/usability | Partial | Semantic buttons/headings/labels, visible focus styles, responsive layout, no external icon dependency, and disabled-start explanations are present. | Keyboard shortcuts should ignore text inputs; reduced-motion preferences need explicit CSS; WCAG audit and screen-reader pass are still needed. | M1: accessibility pass |
| UI architecture | Partial | Domain/data/session logic moved out of the route. | The route is still large; requirements recommend components such as `FilterPanel`, `QuizCard`, `SummaryPanel`, and `TopicChip`, plus separate stores/services. | M2: componentization |
| Member accounts/auth | Not started | Roadmap messaging only. | Registration, login, logout, password reset, email verification, RBAC, secure cookies/session handling, CSRF/XSS/brute-force protections, and server-only secrets are not implemented. | M3: auth foundation |
| Subscription/payments | Not started | Roadmap messaging only. | Plan model, entitlement rules, checkout, provider adapter, webhooks, server verification, and subscription records are not implemented. | M4: paid access |
| MongoDB Atlas | Not started | README and roadmap identify intended backend role. | No database connection, collections, indexes, repositories, tenant isolation, backup/restore plan, migrations, or member progress sync. | M3/M4: backend data layer |
| Secure backend/API deployment | Not started | Static deployment still works and docs warn that privileged data cannot live in the browser. | Need hosting decision, server runtime, environment variables, HTTPS/domain setup, API deployment docs, payment callback support, and CI/CD. | M2/M3: platform decision |
| Bookmarks/favorites | Partial | Guest users can bookmark/unbookmark questions during a quiz, bookmarks persist in the versioned local cache, setup shows a bookmarked review mode, and bookmark pools still respect selected topics. | Member-account bookmark sync, export/delete integration, and automated interaction tests are still needed. | M5: study enhancements |
| Custom question imports | Not started | None. | Import UI, schema validation UX, duplicate handling, and storage/sync rules. | M5: study enhancements |
| Dark mode | Partial | Light/dark design tokens are defined with a System/Light/Dark selector, persisted local preference, system preference resolution, and reduced-motion CSS remains in place. | Needs formal contrast audit, screen-reader pass, and automated preference tests. | M5: polish |
| PWA/offline | Not started | None. | Manifest, service worker, offline strategy, and protected-content cache invalidation rules. | M5: polish |

## Recommended milestones

### M1: Stabilize guest quiz

Goal: make the current static/guest app reliable, testable, and accessible before adding privileged backend behavior.

Required completion checks:

- Add automated tests for topic filtering, mistake-mode eligibility, question caps, answer scoring, corrupt localStorage recovery, and refresh/resume order stability.
- Keep regression coverage for keyboard shortcuts not firing while focus is inside text inputs or selects.
- Run an accessibility audit for color contrast, headings, labels, status messages, and reduced-motion behavior.
- Add CI that runs `npm run validate`, `npm run check`, and `npm run build`.

### M2: Componentize and prepare platform

Goal: reduce the single-route maintenance burden and decide where backend services will run.

Required completion checks:

- Split `src/routes/+page.svelte` into route orchestration plus reusable components (`FilterPanel`, `QuizCard`, `SummaryPanel`, `TopicChip`, and setup controls).
- Separate quiz/session/settings/member state so auth/subscription state does not become entangled with guest quiz state.
- Choose hosting architecture: Hostinger full-stack if it safely supports Node/server runtime, environment variables, HTTPS, and webhooks; otherwise static front end plus serverless/API host.
- Add environment-shape validation for server-only variables before backend deployment.

### M3: Authentication and MongoDB foundation

Goal: support secure members without trusting browser storage.

Required completion checks:

- Implement auth provider or direct salted-password auth with registration, login, logout, password reset, and email verification.
- Use secure HTTP-only sessions/cookies or equivalent server-validated credentials.
- Define MongoDB Atlas collections for users, subscriptions, question sets, questions, attempts, sessions, bookmarks, and audit/security events.
- Add indexes for email, subscription status, provider IDs, question tags, question-set visibility, and attempt history.
- Implement tenant/member isolation in all member-progress queries.
- Sync authenticated progress to MongoDB while treating localStorage only as a cache.

### M4: Subscriptions, protected content, and payments

Goal: protect premium value server-side.

Required completion checks:

- Define plans, statuses, renewal/cancellation timestamps, and entitlement rules.
- Add subscriber-only question-set visibility and enforce access on API/server routes, not only in the UI.
- Integrate selected payment gateway with checkout/test mode and webhook verification.
- Store provider customer/subscription IDs and status metadata in MongoDB Atlas.
- Confirm direct URLs/API calls cannot access subscriber-only content without server-verified entitlement.

### M5: Study enhancements and polish

Goal: add lower-risk product improvements after core security and persistence are in place.

Required completion checks:

- Bookmark/favorite questions and add bookmark review mode. Guest/local support is implemented; member sync remains.
- Add custom JSON question-set import with schema validation UX.
- Add dark mode using CSS custom properties and persisted/system preference support. Initial guest preference support is implemented; audit/tests remain.
- Add PWA manifest/service worker only after confirming protected subscriber data cannot be cached past entitlement expiration.

## How to track to completion

1. Keep this file as the source-of-truth checklist until a project board exists.
2. Create one issue per table row or milestone bullet, using the milestone IDs above in issue titles, for example: `M1: add corrupt localStorage recovery tests`.
3. Add an acceptance checklist to every issue that maps directly to the requirement lines in `docs/new-project-requirements.md`.
4. Require each PR to update this tracker when it changes requirement coverage.
5. Do not mark backend/security/payment items complete until there is an automated test or deployment proof that verifies server-side enforcement.
