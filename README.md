# MCQ Study App

A lightweight, web-based study platform built with SvelteKit for practicing multiple-choice questions. Filter questions by topic, track your performance, and focus on your weakest areas.

## Features

### v2 (Current)

#### Core Quiz Loop
- Single-question view (one question at a time)
- Four-option MCQ format with A/B/C/D labels
- Submit → Explanation → Next Question state machine
- Correct/incorrect highlighting (green/red with badges)
- Full explanation reveal after every answer
- Session score counter (Score: X / Y) with progress indicator
- "Quit" button returns to filter screen
- "Resume" in-progress sessions from filter screen
- Keyboard shortcuts: 1-4 select option, Enter submit/advance

#### Tag Filtering
- Search bar for filtering topics by name
- Topic grouping (Accounting, Finance, Technology, Management, etc.)
- Individual tag selection with question counts
- Group-level Toggle buttons (select/clear entire category)
- Select All / Clear All global controls
- Min-questions input to enforce minimum pool size
- Visual chip UI for tag selection (toggle pills)

#### Practice Modes
- **Normal Mode**: Sequential or random from filtered pool
- **Mistake Mode**: Practice only questions you've gotten wrong before
- **Resume**: Continue an interrupted session (localStorage persisted)

#### Session Persistence
- localStorage-based session resume (active quiz, score, position)
- Per-question statistics (seen count, correct count)
- "Practice Mistakes" button on summary screen
- "Reset Stats" button on filter screen (clears all history)

#### Data
- 7,392 FBLA quiz questions with explanations
- 50+ topics grouped by category
- Static JSON data (no backend required)

### Out of Scope (v1 Scope Boundaries Met)
- No user authentication
- No backend database (static JSON)
- No spaced repetition algorithms (random/sequential)

## Tech Stack

- **Framework**: SvelteKit v4 + Svelte v4
- **Adapter**: Static (adapter-static) — deployable to GitHub Pages
- **UI**: Material Design-inspired custom CSS (no heavy component lib)
- **Data**: 7.4K FBLA MCQs as bundled JSON
- **Deployment**: GitHub Pages (single-page app with index.html fallback)

## Local Development

```bash
cd /home/bjack/mcqapp-v2
npm install
npm run dev     # dev server
npm run build   # static build in build/
npm run preview # preview production build
```

## Deployment (GitHub Pages)

1. Push repo to GitHub
2. Go to Settings → Pages → Build from GitHub Actions
3. Add workflow file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/deploy-pages@v4
        with:
          path: build
```

Or manually: `git subtree push --prefix build origin gh-pages`

## File Structure

```
mcqapp-v2/
  src/
    app.html              # HTML shell
    routes/
      +layout.svelte      # Global styles
      +page.svelte        # All screens (filter/quiz/summary)
    lib/
      data/
        questions.json    # 7,392 FBLA questions
        tags.js           # Tag grouping & filtering logic
      stores/
        session.js        # localStorage-backed session state
  static/
    favicon.svg
    .nojekyll            # Disable Jekyll processing on GitHub Pages
  build/                  # Static output (deployable)
  svelte.config.js        # SvelteKit + adapter-static config
  vite.config.js
  package.json
```

## Recommendations for v2.5+

- **Shuffle mode**: Randomize question order
- **Question count cap**: Limit session to N questions (e.g., 10, 20, 50)
- **Bookmark/favorite questions**
- **Leaderboard** (local only or basic serverless)
- **Import custom question sets** (drag-drop JSON)
- **Dark mode toggle**
- **Accessibility**: ARIA labels, keyboard nav focus rings, reduced-motion
- **PWA**: Service worker + manifest for offline use

## License

MIT — Data sourced from FBLA competition materials.
