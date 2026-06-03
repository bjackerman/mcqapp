# MCQ Study App

A SvelteKit multiple-choice study app for FBLA-style practice. The current build is still deployable as a static front end, but the code and product surface have been refactored toward the new requirements in `docs/new-project-requirements.md`: validated question data, deterministic resumable sessions, guest/local progress as a cache, and clear future integration points for MongoDB Atlas, secure member accounts, subscriptions, and payments.

## Current Feature Set

### Quiz workflow

- One question at a time with A/B/C/D answer labels.
- Explicit state machine: select an answer, submit, review the explanation, continue.
- Correct and selected-incorrect answer highlighting after submission.
- Score, current position, progress bar, quit flow, and completion summary.
- Keyboard shortcuts: `1`-`4` choose an option, `Enter` submits/continues, and `Space` continues after review.

### Topic filtering and practice modes

- Topic filters use the canonical 44-topic taxonomy supplied for the production catalog.
- Question tags, including legacy year-suffixed tags, are normalized into canonical filter topics.
- Topics are grouped into taxonomy categories such as Accounting, Business, Communication, Economics, Finance, Leadership, Management, Marketing, Operations, Personal Development, and Technology.
- Search, individual topic toggles, group toggles, select-all, and clear-all controls.
- Normal practice, mistake practice, and locally bookmarked review modes.
- First-class shuffle option that generates and stores one stable question order per session.
- Question cap options: 10, 20, 50, all, or custom.
- Empty-state and minimum-pool validation before a quiz can start.

### Persistence and data quality

- Guest sessions persist locally under a versioned localStorage key.
- Saved sessions include selected tags, ordered question IDs, current index, score, mode, shuffle/cap settings, schema version, and dataset version.
- Local session data is validated and stale/corrupt sessions are discarded gracefully.
- Per-question local stats track seen, correct, incorrect, and last answered time.
- Bookmarked question IDs persist locally so guest users can build focused review sets.
- Recent completed session summaries are retained locally.
- Question data is validated in development/CI with `npm run validate`.

### Polish and preferences

- System, light, and dark theme preferences use CSS custom properties.
- Theme choice persists locally while the System option follows `prefers-color-scheme`.
- Motion-sensitive users keep the reduced-motion transition overrides.

### Member-platform readiness

The UI now explicitly separates guest local progress from future member capabilities. The intended backend layer should provide:

- Registration, login, logout, email verification, and password reset.
- MongoDB Atlas persistence for users, subscriptions, attempts, progress history, bookmarks, and completed sessions.
- Subscription-gated study areas enforced server-side.
- Payment-provider checkout and webhook handling for entitlement changes.
- Account-level export and deletion flows separate from local guest reset.

## Question data

The bundled seed dataset currently contains 50 validated sample questions in `src/lib/data/questions.json`. The app no longer claims a larger bundled bank than is actually present. Production imports should preserve this schema and use one of the canonical topics from `src/lib/data/taxonomy.js` for each tag:

```json
{
  "id": "stable unique string or number",
  "question": "non-empty prompt",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "explanation": "non-empty explanation",
  "tags": ["TOPIC_2026"]
}
```

## Tech stack

- SvelteKit 2 and Svelte 4
- Vite 5
- Static adapter for GitHub Pages/static hosting compatibility
- JSON seed data with a validation script

## Local development

```bash
npm install
npm run validate
npm run build
npm run dev
```

## Project structure

```text
src/
  app.html
  routes/
    +layout.svelte      # Global app shell styles
    +page.svelte        # Quiz setup, bookmark review, theme controls, quiz, summary, and roadmap UI
  lib/
    data/
      questions.json    # Bundled seed questions
      questions.js      # Validation, grouping, filtering, ordering helpers
      taxonomy.js       # Canonical production topic filters and catalog counts
      tags.js           # Compatibility re-export layer
    stores/
      session.js        # Versioned local session/progress/bookmark persistence
      preferences.js    # Persisted theme preference and system theme resolution
scripts/
  validate-questions.mjs
```

## Deployment

The app still builds to static output:

```bash
npm run build
```

The generated site is written to `build/` by `@sveltejs/adapter-static` and can be deployed to GitHub Pages or another static host. Backend-backed member features should be added as API/server integrations before privileged content, payment state, or account data is trusted.
