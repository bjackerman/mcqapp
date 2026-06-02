<script>
  import { session, persistSession } from '$lib/stores/session.js';
  import { allQuestions, getGroupedTags, filterQuestions } from '$lib/data/tags.js';
  import { onMount } from 'svelte';

  let screen = 'filter';
  let selectedTags = [];
  let tagGroups = [];
  let filteredCount = 0;
  let mistakeMode = false;
  let question = null;
  let selectedOption = null;
  let phase = 'idle';
  let search = '';
  let questionMin = 1;

  onMount(() => {
    tagGroups = getGroupedTags();
    if (session.active) {
      screen = 'quiz';
      loadCurrentQuestion();
    }
  });

  $: {
    filteredCount = selectedTags.length ? filterQuestions(selectedTags, false, session.stats || {}).length : 0;
  }

  $: visibleGroups = search.trim()
    ? tagGroups.map(g => ({ ...g, items: g.items.filter(i => i.base.toLowerCase().includes(search.toLowerCase())) })).filter(g => g.items.length)
    : tagGroups;

  function toggleTag(tag) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  function toggleGroup(groupItems) {
    const allSelected = groupItems.every(i => selectedTags.includes(i.base));
    if (allSelected) {
      selectedTags = selectedTags.filter(t => !groupItems.some(i => i.base === t));
    } else {
      const toAdd = groupItems.filter(i => !selectedTags.includes(i.base)).map(i => i.base);
      selectedTags = [...selectedTags, ...toAdd];
    }
  }

  function clearAll() { selectedTags = []; }
  function selectAll() {
    const next = new Set();
    for (const g of tagGroups) for (const i of g.items) next.add(i.base);
    selectedTags = [...next];
  }

  function startQuiz() {
    if (!selectedTags.length || filteredCount < questionMin) return;
    const pool = filterQuestions(selectedTags, mistakeMode, session.stats || {});
    if (!pool.length) return;
    Object.assign(session, {
      active: true,
      selectedTags: [...selectedTags],
      pool: pool.map(q => q.id),
      currentIndex: 0,
      scoreCorrect: 0,
      scoreAnswered: 0,
      mistakeMode,
    });
    persistSession();
    screen = 'quiz';
    loadCurrentQuestion();
  }

  function loadCurrentQuestion() {
    const pool = allQuestions.filter(q => session.pool.includes(q.id));
    const q = pool[session.currentIndex] || null;
    if (q) question = q;
    selectedOption = null;
    phase = 'idle';
  }

  function selectOption(idx) {
    if (phase !== 'idle') return;
    selectedOption = idx;
  }

  function submitAnswer() {
    if (phase !== 'idle' || selectedOption == null || !question) return;
    phase = 'answered';
    const isCorrect = selectedOption === question.correct;
    const newStats = { ...(session.stats || {}) };
    const prev = newStats[question.id] || { seen: 0, correct: 0 };
    newStats[question.id] = { seen: prev.seen + 1, correct: prev.correct + (isCorrect ? 1 : 0) };
    Object.assign(session, {
      scoreAnswered: session.scoreAnswered + 1,
      scoreCorrect: session.scoreCorrect + (isCorrect ? 1 : 0),
      stats: newStats,
    });
    persistSession();
  }

  function nextQuestion() {
    const pool = allQuestions.filter(q => session.pool.includes(q.id));
    let nextIdx = session.currentIndex + 1;
    if (nextIdx >= pool.length) {
      screen = 'summary';
      Object.assign(session, { active: false });
      persistSession();
      return;
    }
    Object.assign(session, { currentIndex: nextIdx });
    persistSession();
    loadCurrentQuestion();
  }

  function quit() {
    screen = 'filter';
    Object.assign(session, { active: false });
    persistSession();
  }

  function resumeSession() {
    if (!session.active || !session.pool?.length) return;
    screen = 'quiz';
    loadCurrentQuestion();
  }

  function resetStats() {
    if (!confirm('Clear all study stats and history?')) return;
    Object.assign(session, { stats: {}, active: false, pool: [], currentIndex: 0, scoreCorrect: 0, scoreAnswered: 0 });
    persistSession();
  }

  function onKey(e) {
    if (screen !== 'quiz') return;
    if (phase === 'idle') {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        if (idx < question?.options?.length) selectOption(idx);
      } else if (e.key === 'Enter') {
        if (selectedOption != null) submitAnswer();
      }
    } else if (phase === 'answered') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nextQuestion();
      }
    }
  }

  $: totalQuestions = tagGroups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.count, 0), 0);
</script>

<svelte:window on:keydown={onKey} />

<div class="app">
  {#if screen === 'filter'}
    <div class="filter-screen">
      <h1>MCQ Study</h1>

      {#if session.pool?.length && session.active}
        <div class="resume-banner">
          <span>Session in progress: {session.scoreCorrect} / {session.scoreAnswered} answered</span>
          <button class="mdc-button mdc-button--raised" on:click={resumeSession}>Resume</button>
        </div>
      {/if}

      <div class="search-bar">
        <input type="text" placeholder="Search topics..." bind:value={search} class="search-input" />
      </div>

      <div class="config-row">
        <div class="mode-toggle">
          <label>
            <input type="checkbox" bind:checked={mistakeMode} />
            Practice wrong answers only
          </label>
        </div>
        <div class="min-input">
          <label>Min questions: <input type="number" min="1" max="200" bind:value={questionMin} /></label>
        </div>
      </div>

      <div class="actions">
        <button class="mdc-button" on:click={selectAll}>Select All</button>
        <button class="mdc-button" on:click={clearAll}>Clear</button>
        <button class="mdc-button" on:click={resetStats}>Reset Stats</button>
      </div>

      <div class="tag-grid">
        {#each visibleGroups as group}
          <div class="tag-group">
            <div class="group-header">
              <span class="group-name">{group.name}</span>
              <button class="mdc-button mdc-button--dense" on:click={() => toggleGroup(group.items)}>Toggle</button>
            </div>
            <div class="group-items">
              {#each group.items as item}
                <button
                  class="tag-chip"
                  class:selected={selectedTags.includes(item.base)}
                  on:click={() => toggleTag(item.base)}
                  title="{item.base} ({item.count} questions)"
                >
                  {item.base} <span class="count">{item.count}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="footer">
        <span class="preview">{filteredCount} questions selected</span>
        <button
          class="mdc-button mdc-button--raised primary"
          disabled={filteredCount === 0 || filteredCount < questionMin}
          on:click={startQuiz}
        >
          Start Quiz
        </button>
      </div>
    </div>

  {:else if screen === 'quiz' && question}
    <div class="quiz-screen">
      <div class="header">
        <button class="mdc-button" on:click={quit}>Quit</button>
        <span class="score">Score: {session.scoreCorrect} / {session.scoreAnswered}</span>
      </div>

      <div class="progress">Question {session.currentIndex + 1} of {session.pool.length}</div>

      <div class="card">
        <div class="question-text">{question.question}</div>

        <div class="options">
          {#each question.options as opt, idx}
            <button
              class="option"
              class:selected={selectedOption === idx && phase === 'idle'}
              class:correct={phase === 'answered' && idx === question.correct}
              class:wrong={phase === 'answered' && selectedOption === idx && idx !== question.correct}
              class:disabled={phase === 'answered'}
              on:click={() => selectOption(idx)}
            >
              <span class="opt-letter">{String.fromCharCode(65 + idx)}</span>
              <span class="opt-text">{opt}</span>
            </button>
          {/each}
        </div>

        {#if phase === 'answered'}
          <div class="explanation">
            <div class="badge" class:correct={selectedOption === question.correct} class:wrong={selectedOption !== question.correct}>
              {selectedOption === question.correct ? 'Correct' : 'Incorrect'}
            </div>
            <p>{question.explanation}</p>
          </div>
        {/if}

        <button
          class="mdc-button mdc-button--raised primary"
          disabled={phase === 'idle' && selectedOption == null}
          on:click={phase === 'idle' ? submitAnswer : nextQuestion}
        >
          {phase === 'idle' ? 'Submit' : 'Next Question'}
        </button>
      </div>
    </div>

  {:else if screen === 'summary'}
    <div class="summary-screen">
      <h1>Session Complete</h1>
      <div class="big-score">
        <span class="fraction">{session.scoreCorrect} / {session.scoreAnswered}</span>
        <span class="percent">{session.scoreAnswered > 0 ? Math.round((session.scoreCorrect / session.scoreAnswered) * 100) : 0}%</span>
      </div>

      <div class="actions">
        <button class="mdc-button mdc-button--raised" on:click={() => { screen = 'filter'; Object.assign(session, { active: false }); persistSession(); }}>New Quiz</button>
        <button class="mdc-button" on:click={() => { mistakeMode = true; startQuiz(); }}>Practice Mistakes</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .app { max-width: 800px; margin: 0 auto; padding: 16px; font-family: 'Roboto', sans-serif; }
  h1 { text-align: center; margin-bottom: 16px; }
  .resume-banner { background: #e3f2fd; border: 1px solid #90caf9; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .config-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
  .mode-toggle label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .search-bar { margin-bottom: 12px; }
  .search-input { width: 100%; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; }
  .actions { display: flex; gap: 8px; margin-bottom: 12px; }
  .tag-grid { display: flex; flex-direction: column; gap: 16px; }
  .tag-group { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 12px; }
  .group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .group-name { font-weight: 700; font-size: 1.1rem; }
  .group-items { display: flex; flex-wrap: wrap; gap: 8px; }
  .tag-chip { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 6px; transition: .15s; }
  .tag-chip:hover { border-color: #1976d2; }
  .tag-chip.selected { background: #1976d2; color: #fff; border-color: #1976d2; }
  .tag-chip .count { font-size: 0.75rem; opacity: 0.7; }
  .tag-chip.selected .count { opacity: 0.9; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e0e0e0; }
  .preview { font-weight: 500; color: #555; }
  .mdc-button { text-transform: none; font-weight: 500; padding: 0 16px; height: 36px; border-radius: 8px; border: 1px solid transparent; background: #e0e0e0; cursor: pointer; font-size: 0.9rem; }
  .mdc-button--raised { background: #1976d2; color: #fff; border-color: #1976d2; }
  .mdc-button--raised.primary { background: #1565c0; }
  .mdc-button:disabled { opacity: 0.5; cursor: not-allowed; }
  .mdc-button--dense { padding: 0 8px; height: 28px; font-size: 0.8rem; }

  /* Quiz */
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .score { font-weight: 700; color: #1976d2; }
  .progress { text-align: center; color: #666; font-size: 0.85rem; margin-bottom: 12px; }
  .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 16px; padding: 20px; }
  .question-text { font-size: 1.1rem; line-height: 1.5; font-weight: 500; margin-bottom: 16px; }
  .options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .option { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 2px solid #e0e0e0; border-radius: 10px; background: #fff; cursor: pointer; text-align: left; transition: .12s; }
  .option:hover:not(.disabled) { border-color: #1976d2; }
  .option.selected { border-color: #1976d2; background: #e3f2fd; }
  .option.correct { border-color: #2e7d32; background: #e8f5e9; }
  .option.wrong { border-color: #c62828; background: #ffebee; }
  .option.disabled { pointer-events: none; opacity: 0.95; }
  .opt-letter { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; border: 1px solid #bdbdbd; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; color: #555; }
  .option.selected .opt-letter { background: #1976d2; color: #fff; border-color: #1976d2; }
  .option.correct .opt-letter { background: #2e7d32; color: #fff; border-color: #2e7d32; }
  .option.wrong .opt-letter { background: #c62828; color: #fff; border-color: #c62828; }
  .explanation { border-top: 1px solid #e0e0e0; padding-top: 14px; margin-bottom: 16px; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; margin-bottom: 8px; }
  .badge.correct { background: #e8f5e9; color: #2e7d32; }
  .badge.wrong { background: #ffebee; color: #c62828; }

  /* Summary */
  .summary-screen { text-align: center; padding-top: 40px; }
  .big-score { margin: 24px 0; }
  .fraction { font-size: 2.5rem; font-weight: 700; display: block; }
  .percent { font-size: 1.5rem; color: #1976d2; font-weight: 500; }
</style>
