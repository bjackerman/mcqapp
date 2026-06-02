<script>
  import { onMount } from 'svelte';
  import {
    OPTION_LABELS,
    allQuestions,
    buildQuestionOrder,
    filterQuestions,
    getGroupedTags,
    getQuestionsByIds,
    resolveQuestionLimit
  } from '$lib/data/questions.js';
  import {
    advanceQuestion,
    clearPersistedSession,
    completeSession,
    hasResumeableSession,
    persistSession,
    quitActiveSession,
    recordAnswer,
    session,
    startSession
  } from '$lib/stores/session.js';

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

  onMount(() => {
    tagGroups = getGroupedTags();
    selectedTags = session.selectedTags?.length ? [...session.selectedTags] : getAllTopicBases();
    mode = session.mode || 'practice';
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
  $: practicePool = selectedTags.length ? filterQuestions({ tags: selectedTags, mistakesOnly: false, stats: session.stats }) : [];
  $: mistakePool = selectedTags.length ? filterQuestions({ tags: selectedTags, mistakesOnly: true, stats: session.stats }) : [];
  $: activePool = mode === 'mistakes' ? mistakePool : practicePool;
  $: selectedCount = practicePool.length;
  $: mistakeCount = mistakePool.length;
  $: sessionLimit = resolveQuestionLimit(cap, customCap, activePool.length);
  $: canStart = activePool.length >= minimumQuestions && sessionLimit > 0;
  $: emptyReason = getEmptyReason();
  $: progressPercent = session.questionOrder?.length ? Math.round(((session.currentIndex + (phase === 'answered' ? 1 : 0)) / session.questionOrder.length) * 100) : 0;
  $: totalTopics = tagGroups.reduce((sum, group) => sum + group.items.length, 0);
  $: totalAttempts = Object.values(session.stats || {}).reduce((sum, stat) => sum + (stat.seen || 0), 0);
  $: uniqueMistakes = Object.values(session.stats || {}).filter((stat) => (stat.incorrect || 0) > 0).length;

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

  function formatTopicCount(item) {
    return `${item.count} bundled questions · ${item.expectedCount.toLocaleString()} catalog questions`;
  }

  function getEmptyReason() {
    if (!selectedTags.length) return 'Select at least one topic to build a question pool.';
    if (mode === 'mistakes' && mistakePool.length === 0) return 'No missed questions match the selected topics yet.';
    if (activePool.length === 0) return 'No usable questions match the current filters.';
    if (activePool.length < minimumQuestions) return `Only ${activePool.length} questions match; lower the minimum or broaden your topics.`;
    return '';
  }

  function onKey(event) {
    const target = event.target;
    if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
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
        <button class="button ghost" type="button" on:click={resetStats}>Reset local stats</button>
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
        <strong>{mode === 'mistakes' ? mistakeCount : selectedCount} matching questions</strong>
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
        <p class="question-meta">{session.mode === 'mistakes' ? 'Mistake practice' : 'Normal practice'} · {currentQuestion.topicLabels.join(', ')}</p>
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
              on:click={() => selectOption(index)}
            >
              <span class="option-letter">{OPTION_LABELS[index]}</span>
              <span>{option}</span>
            </button>
          {/each}
        </div>

        {#if phase === 'answered'}
          <aside class="explanation" class:correct={selectedOption === currentQuestion.correct}>
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
      </div>
    </section>
  {/if}
</div>

<style>
  :global(*) { box-sizing: border-box; }
  .app-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; color: #172033; }
  .hero, .panel, .quiz-shell, .summary-screen, .start-bar { background: rgba(255,255,255,.96); border: 1px solid #dbe3ef; border-radius: 24px; box-shadow: 0 18px 60px rgba(31,45,71,.08); }
  .hero { padding: clamp(28px, 5vw, 56px); background: linear-gradient(135deg, #0f5bd7, #113a7a); color: #fff; overflow: hidden; position: relative; }
  .hero::after { content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%; right: -60px; top: -60px; background: rgba(255,255,255,.14); }
  .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; font-weight: 800; color: #5d73a1; }
  .hero .eyebrow { color: #c8dcff; }
  h1, h2, h3, p { margin-top: 0; }
  h1 { font-size: clamp(2.1rem, 6vw, 4.8rem); line-height: .95; margin-bottom: 18px; }
  h2 { font-size: clamp(1.35rem, 3vw, 2rem); margin-bottom: 0; }
  h3 { margin-bottom: 3px; }
  .hero-copy { max-width: 720px; font-size: 1.12rem; color: #eaf2ff; line-height: 1.7; }
  .hero-stats, .roadmap-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .hero-stats span, .roadmap-grid span { border-radius: 999px; padding: 10px 14px; background: rgba(255,255,255,.16); font-weight: 700; }
  .panel, .quiz-shell, .summary-screen { padding: clamp(18px, 3vw, 28px); margin-top: 18px; }
  .section-heading, .group-header, .quiz-header, .start-bar, .question-actions, .resume-banner { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .resume-banner, .start-bar { margin-top: 18px; padding: 18px 22px; }
  .resume-banner { background: #eef6ff; border: 1px solid #bdd6ff; border-radius: 18px; }
  .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-top: 18px; }
  .control-card, .segmented { border: 1px solid #dbe3ef; border-radius: 16px; padding: 14px; background: #f8fbff; }
  .control-card span, .segmented legend { display: block; font-size: .78rem; font-weight: 800; color: #60708e; margin-bottom: 8px; }
  input, select { width: 100%; border: 1px solid #cbd6e6; border-radius: 10px; padding: 10px 12px; font: inherit; color: #172033; background: #fff; }
  .segmented { display: grid; gap: 8px; }
  .segmented label { display: flex; gap: 8px; align-items: center; border-radius: 12px; padding: 9px 10px; cursor: pointer; }
  .segmented label.active { background: #e7f0ff; color: #0f5bd7; font-weight: 800; }
  .segmented input { width: auto; }
  .button { border: 1px solid #cbd6e6; border-radius: 999px; padding: 10px 16px; background: #fff; color: #17345f; font-weight: 800; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
  .button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(31,45,71,.12); }
  .button:disabled { opacity: .45; cursor: not-allowed; }
  .button.primary { background: #0f5bd7; border-color: #0f5bd7; color: #fff; }
  .button.ghost { background: #f5f8fc; }
  .button.small { padding: 7px 12px; font-size: .85rem; }
  .button.large { padding: 14px 22px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .actions.center { justify-content: center; }
  .search-field { display: block; margin: 18px 0; }
  .tag-grid { display: grid; gap: 16px; }
  .tag-group { border: 1px solid #e1e8f3; background: #fbfdff; border-radius: 18px; padding: 16px; }
  .group-header p { margin: 0; color: #6a7892; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .tag-chip { display: inline-flex; gap: 8px; align-items: center; border: 1px solid #d4deec; background: #fff; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
  .tag-chip.selected { background: #113a7a; border-color: #113a7a; color: #fff; }
  .count { font-size: .75rem; border-radius: 999px; padding: 2px 7px; background: rgba(15,91,215,.1); white-space: nowrap; }
  .tag-chip.selected .count { background: rgba(255,255,255,.22); }
  .empty-state, .form-message { color: #9a3412; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 12px 14px; }
  .form-message { display: inline-block; margin: 8px 0 0; }
  .account-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; }
  .account-panel p:not(.eyebrow) { color: #52627d; line-height: 1.6; max-width: 720px; }
  .roadmap-grid { max-width: 330px; margin: 0; }
  .roadmap-grid span { background: #edf4ff; color: #17345f; }
  .score-card { background: #edf4ff; border-radius: 16px; padding: 10px 16px; text-align: right; }
  .score-card span { display: block; color: #667895; font-size: .8rem; }
  .score-card strong { font-size: 1.35rem; color: #0f5bd7; }
  .progress-row { display: flex; justify-content: space-between; margin: 20px 0 8px; color: #5f6f8a; font-weight: 700; }
  .progress-track { height: 10px; border-radius: 999px; background: #e7edf6; overflow: hidden; margin-bottom: 18px; }
  .progress-track span { display: block; height: 100%; background: linear-gradient(90deg, #0f5bd7, #39a0ff); }
  .question-card { border: 1px solid #e1e8f3; border-radius: 22px; padding: clamp(18px, 4vw, 34px); }
  .question-meta { color: #64748b; font-weight: 800; }
  .question-card h1 { color: #172033; font-size: clamp(1.5rem, 4vw, 2.35rem); line-height: 1.2; }
  .options { display: grid; gap: 12px; margin: 24px 0; }
  .option { width: 100%; display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; text-align: left; border: 2px solid #dbe3ef; border-radius: 16px; background: #fff; padding: 14px; cursor: pointer; font: inherit; }
  .option:hover:not(:disabled), .option.selected { border-color: #0f5bd7; background: #eef6ff; }
  .option.correct { border-color: #16803c; background: #ecfdf3; }
  .option.wrong { border-color: #c62828; background: #fff1f2; }
  .option-letter { width: 38px; height: 38px; border-radius: 50%; display: inline-grid; place-items: center; background: #edf2f7; font-weight: 900; }
  .option.correct .option-letter { background: #16803c; color: #fff; }
  .option.wrong .option-letter, .option.selected .option-letter { background: #0f5bd7; color: #fff; }
  .explanation { border-radius: 18px; padding: 16px 18px; background: #fff7ed; border: 1px solid #fed7aa; margin-bottom: 18px; }
  .explanation.correct { background: #ecfdf3; border-color: #bbf7d0; }
  .explanation p, .question-actions p { margin-bottom: 0; color: #56667f; line-height: 1.6; }
  .summary-screen { text-align: center; padding: clamp(28px, 8vw, 72px); }
  .big-score { display: grid; gap: 8px; margin: 24px auto; }
  .big-score span { font-size: clamp(3rem, 10vw, 6rem); font-weight: 900; color: #113a7a; }
  .big-score strong { color: #0f5bd7; font-size: 2rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (prefers-reduced-motion: reduce) {
    .button, .tag-chip, .option { transition: none; }
    .button:hover:not(:disabled) { transform: none; }
  }

  @media (max-width: 760px) {
    .section-heading, .group-header, .quiz-header, .start-bar, .question-actions, .resume-banner, .account-panel { align-items: stretch; flex-direction: column; }
    .account-panel { display: flex; }
    .compact { width: 100%; }
    .compact .button, .start-bar .button, .question-actions .button { width: 100%; }
  }
</style>
