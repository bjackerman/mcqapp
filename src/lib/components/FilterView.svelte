<script>
  import { getThemeLabel } from '$lib/stores/preferences.js';

  export let allQuestions;
  export let totalTopics;
  export let totalAttempts;
  export let bookmarkedIds;
  export let hasResumeableSession;
  export let session;
  export let theme;
  export let resolvedThemeName;
  export let mode;
  export let mistakeCount;
  export let bookmarkCount;
  export let shuffle;
  export let cap;
  export let customCap;
  export let minimumQuestions;
  export let search;
  export let visibleGroups;
  export let selectedTags;
  export let modeCount;
  export let sessionLimit;
  export let validationMessage;
  export let emptyReason;
  export let canStart;
  export let CAP_OPTIONS;

  export let onResumeSession;
  export let onChangeThemePreference;
  export let onResetStats;
  export let onSelectAll;
  export let onClearAll;
  export let onToggleGroup;
  export let onToggleTag;
  export let onStartQuiz;
  export let formatTopicCount;
</script>

<section class="hero" aria-labelledby="page-title">
  <p class="eyebrow">FBLA-style MCQ practice</p>
  <h1 id="page-title">Build a focused study session</h1>
  <p class="hero-copy">
    Filter by topic, practice missed questions, preserve a deterministic session order, and keep local progress ready for a future MongoDB-backed member sync.
  </p>
  <div class="hero-stats" aria-label="Question bank summary">
    <span><strong>{allQuestions.length}</strong> questions</span>
    <span><strong>{totalTopics}</strong> topics</span>
    <span><strong>{totalAttempts}</strong> local attempts</span>
    <span><strong>{bookmarkedIds.length}</strong> bookmarks</span>
  </div>
</section>

{#if hasResumeableSession(session)}
  <section class="resume-banner" aria-label="Resume saved session">
    <div>
      <strong>Session in progress</strong>
      <p>{session.scoreCorrect} correct from {session.scoreAnswered} answered · Question {session.currentIndex + 1} of {session.questionOrder.length}</p>
    </div>
    <button class="button primary" type="button" on:click={onResumeSession}>Resume</button>
  </section>
{/if}

<section class="panel setup-panel" aria-labelledby="setup-title">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Setup</p>
      <h2 id="setup-title">Choose mode and length</h2>
    </div>
    <div class="actions compact">
      <label class="theme-picker">
        <span>Theme</span>
        <select bind:value={theme} on:change={(event) => onChangeThemePreference(event.currentTarget.value)} aria-label="Theme preference">
          <option value="system">System ({getThemeLabel(resolvedThemeName)})</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <button class="button ghost" type="button" on:click={onResetStats}>Reset local stats</button>
    </div>
  </div>

  <div class="controls-grid">
    <fieldset class="segmented">
      <legend>Practice mode</legend>
      <label class:active={mode === 'practice'}>
        <input type="radio" name="mode" value="practice" bind:group={mode} />
        Normal practice
      </label>
      <label class:active={mode === 'mistakes'}>
        <input type="radio" name="mode" value="mistakes" bind:group={mode} />
        Mistake practice ({mistakeCount})
      </label>
      <label class:active={mode === 'bookmarks'}>
        <input type="radio" name="mode" value="bookmarks" bind:group={mode} />
        Bookmarked review ({bookmarkCount})
      </label>
    </fieldset>

    <label class="control-card">
      <span>Question order</span>
      <select bind:value={shuffle}>
        <option value={true}>Shuffle once, then preserve</option>
        <option value={false}>Original dataset order</option>
      </select>
    </label>

    <label class="control-card">
      <span>Question cap</span>
      <select bind:value={cap}>
        {#each CAP_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>

    {#if cap === 'custom'}
      <label class="control-card">
        <span>Custom cap</span>
        <input type="number" min="1" max="500" bind:value={customCap} />
      </label>
    {/if}

    <label class="control-card">
      <span>Minimum pool size</span>
      <input type="number" min="1" max="500" bind:value={minimumQuestions} />
    </label>
  </div>
</section>

<section class="panel" aria-labelledby="topics-title">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Topics</p>
      <h2 id="topics-title">Select categories</h2>
    </div>
    <div class="actions compact">
      <button class="button ghost" type="button" on:click={onSelectAll}>Select all</button>
      <button class="button ghost" type="button" on:click={onClearAll}>Clear</button>
    </div>
  </div>

  <label class="search-field">
    <span class="sr-only">Search topics</span>
    <input type="search" placeholder="Search topics by name..." bind:value={search} />
  </label>

  {#if !visibleGroups.length}
    <div class="empty-state">No topics match “{search}”. Clear the search to see all categories.</div>
  {:else}
    <div class="tag-grid">
      {#each visibleGroups as group}
        <article class="tag-group">
          <div class="group-header">
            <div>
              <h3>{group.name}</h3>
              <p>{group.items.length} topics</p>
            </div>
            <button class="button small" type="button" on:click={() => onToggleGroup(group.items)}>Toggle group</button>
          </div>
          <div class="chips">
            {#each group.items as item}
              <button
                type="button"
                class="tag-chip"
                class:selected={selectedTags.includes(item.base)}
                aria-pressed={selectedTags.includes(item.base)}
                on:click={() => onToggleTag(item.base)}
                title={formatTopicCount(item)}
              >
                <span>{item.label}</span>
                <span class="count">{item.count}/{item.expectedCount.toLocaleString()}</span>
              </button>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<section class="start-bar" aria-live="polite">
  <div>
    <strong>{modeCount} matching questions</strong>
    <p>{sessionLimit} will be included in this session{shuffle ? ' in a preserved shuffled order' : ''}.</p>
    {#if validationMessage || emptyReason}
      <p class="form-message">{validationMessage || emptyReason}</p>
    {/if}
  </div>
  <button class="button primary large" type="button" disabled={!canStart} on:click={onStartQuiz}>Start quiz</button>
</section>

<section class="panel account-panel" aria-labelledby="account-title">
  <div>
    <p class="eyebrow">Member platform roadmap</p>
    <h2 id="account-title">Ready for secure accounts and subscriptions</h2>
    <p>
      The front end now treats localStorage as a guest cache and exposes the product areas that will connect to API-backed login, MongoDB Atlas progress sync, subscription checks, and payment-webhook entitlement updates.
    </p>
  </div>
  <div class="roadmap-grid">
    <span>Authentication</span>
    <span>MongoDB progress</span>
    <span>Subscription gates</span>
    <span>Payments webhook</span>
  </div>
</section>

<style>
  .hero, .panel, .start-bar { background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow); }
  .hero { padding: clamp(28px, 5vw, 56px); background: linear-gradient(135deg, #0f5bd7, #113a7a); color: #fff; overflow: hidden; position: relative; }
  .hero::after { content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%; right: -60px; top: -60px; background: rgba(255,255,255,.14); }
  .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; font-weight: 800; color: var(--primary-strong); }
  .hero .eyebrow { color: var(--hero-eyebrow); }
  h1 { font-size: clamp(2.1rem, 6vw, 4.8rem); line-height: .95; margin-bottom: 18px; margin-top: 0; }
  h2 { font-size: clamp(1.35rem, 3vw, 2rem); margin-bottom: 0; margin-top: 0; }
  h3 { margin-bottom: 3px; margin-top: 0; }
  .hero-copy { max-width: 720px; font-size: 1.12rem; color: var(--hero-copy); line-height: 1.7; }
  .hero-stats, .roadmap-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .hero-stats span, .roadmap-grid span { border-radius: 999px; padding: 10px 14px; background: rgba(255,255,255,.16); font-weight: 700; }
  .panel { padding: clamp(18px, 3vw, 28px); margin-top: 18px; }
  .section-heading, .group-header, .start-bar, .resume-banner { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .resume-banner, .start-bar { margin-top: 18px; padding: 18px 22px; }
  .resume-banner { background: var(--primary-soft); border: 1px solid var(--border-strong); border-radius: 18px; }
  .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-top: 18px; }
  .control-card, .segmented { border: 1px solid var(--border); border-radius: 16px; padding: 14px; background: var(--panel-soft); }
  .control-card span, .segmented legend { display: block; font-size: .78rem; font-weight: 800; color: var(--muted); margin-bottom: 8px; }
  input, select { width: 100%; border: 1px solid var(--border-strong); border-radius: 10px; padding: 10px 12px; font: inherit; color: var(--text); background: var(--surface); }
  .segmented { display: grid; gap: 8px; }
  .segmented label { display: flex; gap: 8px; align-items: center; border-radius: 12px; padding: 9px 10px; cursor: pointer; }
  .segmented label.active { background: var(--primary-soft); color: var(--primary); font-weight: 800; }
  .segmented input { width: auto; }
  .button { border: 1px solid var(--border-strong); border-radius: 999px; padding: 10px 16px; background: var(--surface); color: var(--primary-strong); font-weight: 800; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
  .button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(31,45,71,.12); }
  .button:disabled { opacity: .45; cursor: not-allowed; }
  .button.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
  .button.ghost { background: var(--surface-muted); }
  .button.small { padding: 7px 12px; font-size: .85rem; }
  .button.large { padding: 14px 22px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .theme-picker { display: grid; gap: 4px; min-width: 170px; }
  .theme-picker span { font-size: .72rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .search-field { display: block; margin: 18px 0; }
  .tag-grid { display: grid; gap: 16px; }
  .tag-group { border: 1px solid var(--border); background: var(--panel-soft); border-radius: 18px; padding: 16px; }
  .group-header p { margin: 0; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .tag-chip { display: inline-flex; gap: 8px; align-items: center; border: 1px solid var(--border-strong); background: var(--surface); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
  .tag-chip.selected { background: var(--primary-strong); border-color: var(--primary-strong); color: #fff; }
  .count { font-size: .75rem; border-radius: 999px; padding: 2px 7px; background: rgba(15,91,215,.1); white-space: nowrap; }
  .tag-chip.selected .count { background: rgba(255,255,255,.22); }
  .empty-state, .form-message { color: var(--warning-text); background: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: 14px; padding: 12px 14px; }
  .form-message { display: inline-block; margin: 8px 0 0; }
  .account-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; }
  .account-panel p:not(.eyebrow) { color: var(--muted-strong); line-height: 1.6; max-width: 720px; }
  .roadmap-grid { max-width: 330px; margin: 0; }
  .roadmap-grid span { background: var(--primary-tint); color: var(--primary-strong); }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (max-width: 760px) {
    .section-heading, .group-header, .start-bar, .resume-banner, .account-panel { align-items: stretch; flex-direction: column; }
    .account-panel { display: flex; }
    .compact { width: 100%; }
    .compact .button, .start-bar .button { width: 100%; }
  }
</style>
