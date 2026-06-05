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
    hasResumeableSession,
    quitActiveSession,
    isBookmarked,
    recordAnswer,
    session,
    startSession,
    toggleBookmark
  } from '$lib/stores/session.js';
  import {
    initializeThemePreference,
    resolvedTheme,
    setThemePreference,
    themePreference
  } from '$lib/stores/preferences.js';

  import FilterView from '$lib/components/FilterView.svelte';
  import QuizView from '$lib/components/QuizView.svelte';
  import SummaryView from '$lib/components/SummaryView.svelte';

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
    <FilterView
      {allQuestions}
      {totalTopics}
      {totalAttempts}
      {bookmarkedIds}
      {hasResumeableSession}
      {session}
      bind:theme
      {resolvedThemeName}
      bind:mode
      {mistakeCount}
      {bookmarkCount}
      bind:shuffle
      bind:cap
      bind:customCap
      bind:minimumQuestions
      bind:search
      {visibleGroups}
      {selectedTags}
      {modeCount}
      {sessionLimit}
      {validationMessage}
      {emptyReason}
      {canStart}
      {CAP_OPTIONS}
      onResumeSession={resumeSession}
      onChangeThemePreference={changeThemePreference}
      onResetStats={resetStats}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onToggleGroup={toggleGroup}
      onToggleTag={toggleTag}
      onStartQuiz={startQuiz}
      {formatTopicCount}
    />
  {:else if screen === 'quiz' && currentQuestion}
    <QuizView
      {session}
      {currentQuestion}
      {selectedOption}
      {phase}
      {modeLabel}
      {isCurrentBookmarked}
      {progressPercent}
      onQuit={quit}
      onSelectOption={selectOption}
      onSubmitAnswer={submitAnswer}
      onNextQuestion={nextQuestion}
      onToggleBookmark={toggleCurrentBookmark}
    />
  {:else if screen === 'summary'}
    <SummaryView
      {session}
      {uniqueMistakes}
      {completedSummary}
      onNewQuiz={() => (screen = 'filter')}
      onPracticeMistakes={practiceMistakes}
      onReviewBookmarks={reviewBookmarks}
    />
  {/if}
</div>

<style>
  :global(*) { box-sizing: border-box; }
  .app-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 48px; color: var(--text); }
  
  /* Global styles moved from +page.svelte to app.html or a global CSS file would be better, but keeping them here for now to maintain behavior */
  :global(:root) {
    --shadow: 0 12px 40px rgba(0,0,0,.08);
  }
</style>
