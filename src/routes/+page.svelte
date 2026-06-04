<script>
  import { onMount } from 'svelte';
  import {
    OPTION_LABELS,
    allQuestions,
    buildQuestionOrder,
    filterQuestions,
    getQuestionsByIds,
    getGroupedTags,
    resolveQuestionLimit
  } from '$lib/data/questions.js';
  import {
    advanceQuestion,
    clearPersistedSession,
    completeSession,
    createGuestDataExport,
    hasResumeableSession,
    quitActiveSession,
    isBookmarked,
    recordAnswer,
    session,
    startSession,
    toggleBookmark
  } from '$lib/stores/session.js';
  import {
    getThemeLabel,
    initializeThemePreference,
    resolvedTheme,
    setThemePreference,
    themePreference
  } from '$lib/stores/preferences.js';

  const CAP_OPTIONS = [
    { value: '10', label: '10 questions' },
    { value: '20', label: '20 questions' },
    { value: '50', label: '50 questions' },
    { value: 'all', label: 'All selected' },
    { value: 'custom', label: 'Custom' }
  ];

  let screen = 'filter';
  let selectedTags = [];
  let tagGroups = [];
  let currentQuestion = null;
  let selectedOption = null;
  let phase = 'selecting';
  let search = '';
  let mode = 'practice';
  let shuffle = true;
  let cap = '20';
  let customCap = 10;
  let minimumQuestions = 1;
  let validationMessage = '';
  let completedSummary = null;
  let theme = 'system';
  let resolvedThemeName = 'light';
  let bookmarkRevision = 0;

  onMount(() => {
    initializeThemePreference();
    theme = themePreference;
    resolvedThemeName = resolvedTheme;
    tagGroups = getGroupedTags();
    selectedTags = session.selectedTags?.length ? [...session.selectedTags] : getAllTopicBases();
    mode = ['practice', 'mistakes', 'bookmarks'].includes(session.mode) ? session.mode : 'practice';
    shuffle = session.shuffle ?? true;
    cap = session.cap || '20';
    customCap = session.customCap || 10;

    if (hasResumeableSession(session)) {
      screen = 'quiz';
      loadCurrentQuestion();
    } else if (session.active) {
      quitActiveSession();
    }
  });

  $: visibleGroups = getVisibleGroups(tagGroups, search);
  $: bookmarkedIds = bookmarkRevision >= 0 ? session.bookmarkedIds : [];
  $: practicePool = selectedTags.length ? filterQuestions({ tags: selectedTags, mistakesOnly: false, stats: session.stats }) : [];
  $: mistakePool = selectedTags.length ? filterQuestions({ tags: selectedTags, mistakesOnly: true, stats: session.stats }) : [];
  $: bookmarkPool = selectedTags.length ? filterQuestions({ tags: selectedTags, bookmarksOnly: true, stats: session.stats, bookmarkedIds }) : [];
  $: activePool = mode === 'mistakes' ? mistakePool : mode === 'bookmarks' ? bookmarkPool : practicePool;
  $: selectedCount = practicePool.length;
  $: mistakeCount = mistakePool.length;
  $: bookmarkCount = bookmarkPool.length;
  $: isCurrentBookmarked = bookmarkRevision >= 0 && currentQuestion ? isBookmarked(currentQuestion.id) : false;
  $: sessionLimit = resolveQuestionLimit(cap, customCap, activePool.length);
  $: canStart = activePool.length >= minimumQuestions && sessionLimit > 0;
  $: emptyReason = getEmptyReason();
  $: progressPercent = session.questionOrder?.length ? Math.round(((session.currentIndex + (phase === 'answered' ? 1 : 0)) / session.questionOrder.length) * 100) : 0;
  $: totalTopics = tagGroups.reduce((sum, group) => sum + group.items.length, 0);
  $: totalAttempts = Object.values(session.stats || {}).reduce((sum, stat) => sum + (stat.seen || 0), 0);
  $: uniqueMistakes = Object.values(session.stats || {}).filter((stat) => (stat.incorrect || 0) > 0).length;
  $: modeCount = mode === 'mistakes' ? mistakeCount : mode === 'bookmarks' ? bookmarkCount : selectedCount;
  $: modeLabel = mode === 'mistakes' ? 'Mistake practice' : mode === 'bookmarks' ? 'Bookmarked review' : 'Normal practice';

  function getVisibleGroups(groups, query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(needle) || item.category.toLowerCase().includes(needle) || item.base.toLowerCase().includes(needle))
      }))
      .filter((group) => group.items.length);
  }

  function getAllTopicBases() {
    return [...new Set(tagGroups.flatMap((group) => group.items.map((item) => item.base)))];
  }

  function toggleTag(tag) {
    selectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((selected) => selected !== tag)
      : [...selectedTags, tag];
  }

  function toggleGroup(items) {
    const bases = items.map((item) => item.base);
    const allSelected = bases.every((base) => selectedTags.includes(base));

    selectedTags = allSelected
      ? selectedTags.filter((selected) => !bases.includes(selected))
      : [...new Set([...selectedTags, ...bases])];
  }

  function clearAll() {
    selectedTags = [];
  }

  function selectAll() {
    selectedTags = getAllTopicBases();
  }

  function startQuiz() {
    validationMessage = emptyReason;
    if (!canStart) return;

    const questionOrder = buildQuestionOrder(activePool, { shuffle, cap, customCap });
    if (!questionOrder.length) return;

    startSession({ selectedTags, questionOrder, mode, shuffle, cap, customCap });
    screen = 'quiz';
    completedSummary = null;
    loadCurrentQuestion();
  }

  function loadCurrentQuestion() {
    const questions = getQuestionsByIds(session.questionOrder);
    currentQuestion = questions[session.currentIndex] || null;
    selectedOption = null;
    phase = 'selecting';

    if (!currentQuestion && session.questionOrder?.length) {
      quitActiveSession();
      screen = 'filter';
      validationMessage = 'That saved session no longer matches the available question set. Please start a new quiz.';
    }
  }

  function selectOption(index) {
    if (phase !== 'selecting') return;
    selectedOption = index;
  }

  function submitAnswer() {
    if (phase !== 'selecting' || selectedOption == null || !currentQuestion) return;
    recordAnswer(currentQuestion, selectedOption);
    phase = 'answered';
  }

  function nextQuestion() {
    if (session.currentIndex + 1 >= session.questionOrder.length) {
      completedSummary = completeSession();
      screen = 'summary';
      return;
    }

    advanceQuestion();
    loadCurrentQuestion();
  }

  function quit() {
    quitActiveSession();
    screen = 'filter';
  }

  function resumeSession() {
    if (!hasResumeableSession(session)) return;
    screen = 'quiz';
    loadCurrentQuestion();
  }

  function exportLocalData() {
    const payload = createGuestDataExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcq-guest-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    validationMessage = 'Downloaded a JSON export of local guest progress for this device.';
  }

  function resetStats() {
    if (!confirm('Clear local progress, active session, and recent summaries on this device?')) return;
    clearPersistedSession();
    selectedTags = getAllTopicBases();
    mode = 'practice';
    screen = 'filter';
    validationMessage = 'Local study history was reset. Member account export/delete controls will live in the backend account area.';
  }

  function practiceMistakes() {
    mode = 'mistakes';
    screen = 'filter';
    validationMessage = mistakeCount ? '' : 'Answer a few questions incorrectly before starting mistake practice.';
  }

  function reviewBookmarks() {
    mode = 'bookmarks';
    screen = 'filter';
    validationMessage = bookmarkCount ? '' : 'Bookmark questions during a quiz before starting bookmark review.';
  }

  function toggleCurrentBookmark() {
    if (!currentQuestion) return;
    toggleBookmark(currentQuestion.id);
    bookmarkRevision += 1;
  }

  function changeThemePreference(value) {
    resolvedThemeName = setThemePreference(value);
    theme = themePreference;
  }

  function formatTopicCount(item) {
    return `${item.count} bundled questions · ${item.expectedCount.toLocaleString()} catalog questions`;
  }

  function getEmptyReason() {
    if (!selectedTags.length) return 'Select at least one topic to build a question pool.';
    if (mode === 'mistakes' && mistakePool.length === 0) return 'No missed questions match the selected topics yet.';
    if (mode === 'bookmarks' && bookmarkPool.length === 0) return 'No bookmarked questions match the selected topics yet.';
    if (activePool.length === 0) return 'No usable questions match the current filters.';
    if (activePool.length < minimumQuestions) return `Only ${activePool.length} questions match; lower the minimum or broaden your topics.`;
    return '';
  }

  function isEditableShortcutTarget(target) {
    return target instanceof HTMLElement && Boolean(target.closest('input, select, textarea, [contenteditable="true"]'));
  }

  function onKey(event) {
    const target = event.target;
    if (isEditableShortcutTarget(target)) return;
    if (screen !== 'quiz') return;

    if (phase === 'selecting') {
      const numberKey = Number(event.key);
      if (numberKey >= 1 && numberKey <= OPTION_LABELS.length) {
        selectOption(numberKey - 1);
      } else if (event.key === 'Enter' && selectedOption != null) {
        submitAnswer();
      }
    } else if (phase === 'answered' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      nextQuestion();
    }
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="app-shell">
  {#if screen === 'filter'}
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
        <button class="button primary" type="button" on:click={resumeSession}>Resume</button>
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
            <select bind:value={theme} on:change={(event) => changeThemePreference(event.currentTarget.value)} aria-label="Theme preference">
              <option value="system">System ({getThemeLabel(resolvedThemeName)})</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button class="button ghost" type="button" on:click={exportLocalData}>Export local data</button>
          <button class="button ghost" type="button" on:click={resetStats}>Reset local stats</button>
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
          <button class="button ghost" type="button" on:click={selectAll}>Select all</button>
          <button class="button ghost" type="button" on:click={clearAll}>Clear</button>
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
                <button class="button small" type="button" on:click={() => toggleGroup(group.items)}>Toggle group</button>
              </div>
              <div class="chips">
                {#each group.items as item}
                  <button
                    type="button"
                    class="tag-chip"
                    class:selected={selectedTags.includes(item.base)}
                    aria-pressed={selectedTags.includes(item.base)}
                    on:click={() => toggleTag(item.base)}
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
      <button class="button primary large" type="button" disabled={!canStart} on:click={startQuiz}>Start quiz</button>
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
  {:else if screen === 'quiz' && currentQuestion}
    <section class="quiz-shell" aria-labelledby="question-title">
      <header class="quiz-header">
        <button class="button ghost" type="button" on:click={quit}>Quit</button>
        <div class="score-card">
          <span>Score</span>
          <strong>{session.scoreCorrect} / {session.scoreAnswered}</strong>
        </div>
      </header>

      <div class="progress-row">
        <span>Question {session.currentIndex + 1} of {session.questionOrder.length}</span>
        <span>{progressPercent}%</span>
      </div>
      <div class="progress-track" aria-hidden="true"><span style={`width: ${progressPercent}%`}></span></div>

      <article class="question-card">
        <div class="question-meta-row">
          <p class="question-meta">{modeLabel} · {currentQuestion.topicLabels.join(', ')}</p>
          <button
            class="button small bookmark-toggle"
            class:active={isCurrentBookmarked}
            type="button"
            aria-pressed={isCurrentBookmarked}
            on:click={toggleCurrentBookmark}
          >
            {isCurrentBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>
        <h1 id="question-title">{currentQuestion.question}</h1>

        <div class="options" role="list" aria-label="Answer options">
          {#each currentQuestion.options as option, index}
            <button
              type="button"
              class="option"
              class:selected={selectedOption === index && phase === 'selecting'}
              class:correct={phase === 'answered' && index === currentQuestion.correct}
              class:wrong={phase === 'answered' && selectedOption === index && index !== currentQuestion.correct}
              disabled={phase === 'answered'}
              aria-pressed={selectedOption === index}
              aria-describedby={phase === 'answered' ? 'answer-explanation' : undefined}
              on:click={() => selectOption(index)}
            >
              <span class="option-letter">{OPTION_LABELS[index]}</span>
              <span>{option}</span>
            </button>
          {/each}
        </div>

        {#if phase === 'answered'}
          <aside id="answer-explanation" class="explanation" class:correct={selectedOption === currentQuestion.correct} aria-live="polite">
            <strong>{selectedOption === currentQuestion.correct ? 'Correct' : 'Not quite'}</strong>
            <p>{currentQuestion.explanation}</p>
          </aside>
        {/if}

        <div class="question-actions">
          <p>Shortcuts: press 1–4 to choose, Enter to submit or continue.</p>
          <button class="button primary" type="button" disabled={phase === 'selecting' && selectedOption == null} on:click={phase === 'selecting' ? submitAnswer : nextQuestion}>
            {phase === 'selecting' ? 'Submit answer' : session.currentIndex + 1 >= session.questionOrder.length ? 'Finish session' : 'Next question'}
          </button>
        </div>
      </article>
    </section>
  {:else if screen === 'summary'}
    <section class="summary-screen" aria-labelledby="summary-title">
      <p class="eyebrow">Session complete</p>
      <h1 id="summary-title">Nice work</h1>
      <div class="big-score">
        <span>{completedSummary?.scoreCorrect ?? session.scoreCorrect} / {completedSummary?.scoreAnswered ?? session.scoreAnswered}</span>
        <strong>{completedSummary?.percentage ?? 0}%</strong>
      </div>
      <p>You have {uniqueMistakes} questions marked for mistake practice across local guest progress.</p>
      <div class="actions center">
        <button class="button primary" type="button" on:click={() => (screen = 'filter')}>New quiz</button>
        <button class="button ghost" type="button" on:click={practiceMistakes}>Practice mistakes</button>
        <button class="button ghost" type="button" on:click={reviewBookmarks}>Review bookmarks</button>
      </div>
    </section>
  {/if}
</div>

<style>
  :global(*) { box-sizing: border-box; }
  .app-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; color: var(--text); }
  .hero, .panel, .quiz-shell, .summary-screen, .start-bar { background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow); }
  .hero { padding: clamp(28px, 5vw, 56px); background: linear-gradient(135deg, #0f5bd7, #113a7a); color: #fff; overflow: hidden; position: relative; }
  .hero::after { content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%; right: -60px; top: -60px; background: rgba(255,255,255,.14); }
  .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; font-weight: 800; color: var(--primary-strong); }
  .hero .eyebrow { color: var(--hero-eyebrow); }
  h1, h2, h3, p { margin-top: 0; }
  h1 { font-size: clamp(2.1rem, 6vw, 4.8rem); line-height: .95; margin-bottom: 18px; }
  h2 { font-size: clamp(1.35rem, 3vw, 2rem); margin-bottom: 0; }
  h3 { margin-bottom: 3px; }
  .hero-copy { max-width: 720px; font-size: 1.12rem; color: var(--hero-copy); line-height: 1.7; }
  .hero-stats, .roadmap-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .hero-stats span, .roadmap-grid span { border-radius: 999px; padding: 10px 14px; background: rgba(255,255,255,.16); font-weight: 700; }
  .panel, .quiz-shell, .summary-screen { padding: clamp(18px, 3vw, 28px); margin-top: 18px; }
  .section-heading, .group-header, .quiz-header, .start-bar, .question-actions, .resume-banner { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
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
  .question-meta-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
  .bookmark-toggle.active { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }
  .actions.center { justify-content: center; }
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
  .score-card { background: var(--primary-tint); border-radius: 16px; padding: 10px 16px; text-align: right; }
  .score-card span { display: block; color: var(--muted); font-size: .8rem; }
  .score-card strong { font-size: 1.35rem; color: var(--primary); }
  .progress-row { display: flex; justify-content: space-between; margin: 20px 0 8px; color: var(--muted); font-weight: 700; }
  .progress-track { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; margin-bottom: 18px; }
  .progress-track span { display: block; height: 100%; background: linear-gradient(90deg, #0f5bd7, #39a0ff); }
  .question-card { border: 1px solid var(--border); border-radius: 22px; padding: clamp(18px, 4vw, 34px); }
  .question-meta { color: var(--muted); font-weight: 800; }
  .question-card h1 { color: var(--text); font-size: clamp(1.5rem, 4vw, 2.35rem); line-height: 1.2; }
  .options { display: grid; gap: 12px; margin: 24px 0; }
  .option { width: 100%; display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; text-align: left; border: 2px solid var(--border); border-radius: 16px; background: var(--surface); padding: 14px; cursor: pointer; font: inherit; }
  .option:hover:not(:disabled), .option.selected { border-color: var(--primary); background: var(--primary-soft); }
  .option.correct { border-color: var(--success); background: var(--success-bg); }
  .option.wrong { border-color: var(--danger); background: var(--danger-bg); }
  .option-letter { width: 38px; height: 38px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--primary-tint); font-weight: 900; }
  .option.correct .option-letter { background: var(--success); color: #fff; }
  .option.wrong .option-letter, .option.selected .option-letter { background: var(--primary); color: #fff; }
  .explanation { border-radius: 18px; padding: 16px 18px; background: var(--warning-bg); border: 1px solid var(--warning-border); margin-bottom: 18px; }
  .explanation.correct { background: var(--success-bg); border-color: var(--success-border); }
  .explanation p, .question-actions p { margin-bottom: 0; color: var(--muted); line-height: 1.6; }
  .summary-screen { text-align: center; padding: clamp(28px, 8vw, 72px); }
  .big-score { display: grid; gap: 8px; margin: 24px auto; }
  .big-score span { font-size: clamp(3rem, 10vw, 6rem); font-weight: 900; color: var(--primary-strong); }
  .big-score strong { color: var(--primary); font-size: 2rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (prefers-reduced-motion: reduce) {
    .button, .tag-chip, .option { transition: none; }
    .button:hover:not(:disabled) { transform: none; }
  }

  @media (max-width: 760px) {
    .section-heading, .group-header, .quiz-header, .start-bar, .question-actions, .resume-banner, .account-panel, .question-meta-row { align-items: stretch; flex-direction: column; }
    .account-panel { display: flex; }
    .compact { width: 100%; }
    .compact .button, .start-bar .button, .question-actions .button { width: 100%; }
  }
</style>
