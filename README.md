# MCQ Study App

A modular SvelteKit multiple-choice study app for FBLA-style practice. Built with a "Static-First" architecture that is architecturally prepared for future MongoDB Atlas and secure member integration.

## Key Features

- **Focused Quiz Workflow**: One question at a time with A/B/C/D labels, immediate feedback, and detailed explanations.
- **Topic Filtering**: Canonical 44-topic taxonomy with category grouping and search.
- **Practice Modes**: Normal practice, mistake-focused review, and bookmarked questions.
- **Deterministic Sessions**: One stable, resumable question order per session (shuffled or sequential).
- **Architecture v3**: Decoupled UI components and an adapter-based storage layer for future-proof persistence.

## Tech Stack

- **SvelteKit 2 / Svelte 4**
- **Vite 5**
- **@sveltejs/adapter-static**: For high-performance static hosting (GitHub Pages).
- **JSON Schema**: Strict validation for question data integrity.

## Local Development

```bash
# Install dependencies
npm install

# Validate question data
npm run validate

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Project Structure

```text
src/
  lib/
    components/      # Atomic UI views (Filter, Quiz, Summary)
    data/            # Questions, taxonomy, and validation logic
    storage/         # Persistence adapters (LocalStorage, future Cloud)
    stores/          # Svelte stores for session and preferences
  routes/
    +page.svelte      # Main entry point (View orchestrator)
scripts/
  validate-questions.mjs # Data integrity check
docs/
  new-project-requirements.md # Full product specification
```

## Question Data

Add or update questions in `src/lib/data/questions.json`. Each record must follow the schema in `src/lib/data/question.schema.json`. Run `npm run validate` after any changes to ensure the build remains stable.

## Roadmap

The app is currently in **Phase 2** of the architectural roadmap:
1. [x] **Phase 1**: Modularize UI (Split God-component).
2. [x] **Phase 2**: Storage Abstraction (Adapter Pattern).
3. [ ] **Phase 3**: Member Authentication & MongoDB Atlas Sync.
4. [ ] **Phase 4**: Subscription Gating & Payment Integration.
