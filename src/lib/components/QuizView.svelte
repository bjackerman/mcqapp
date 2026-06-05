<script>
  import { OPTION_LABELS } from '$lib/data/questions.js';

  export let session;
  export let currentQuestion;
  export let selectedOption;
  export let phase;
  export let modeLabel;
  export let isCurrentBookmarked;
  export let progressPercent;

  export let onQuit;
  export let onSelectOption;
  export let onSubmitAnswer;
  export let onNextQuestion;
  export let onToggleBookmark;
</script>

<section class="quiz-shell" aria-labelledby="question-title">
  <header class="quiz-header">
    <button class="button ghost" type="button" on:click={onQuit}>Quit</button>
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
        on:click={onToggleBookmark}
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
          on:click={() => onSelectOption(index)}
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
      <button class="button primary" type="button" disabled={phase === 'selecting' && selectedOption == null} on:click={phase === 'selecting' ? onSubmitAnswer : onNextQuestion}>
        {phase === 'selecting' ? 'Submit answer' : session.currentIndex + 1 >= session.questionOrder.length ? 'Finish session' : 'Next question'}
      </button>
    </div>
  </article>
</section>

<style>
  .quiz-shell { background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow); padding: clamp(18px, 3vw, 28px); margin-top: 18px; }
  .quiz-header, .question-actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .score-card { background: var(--primary-tint); border-radius: 16px; padding: 10px 16px; text-align: right; }
  .score-card span { display: block; color: var(--muted); font-size: .8rem; }
  .score-card strong { font-size: 1.35rem; color: var(--primary); }
  .progress-row { display: flex; justify-content: space-between; margin: 20px 0 8px; color: var(--muted); font-weight: 700; }
  .progress-track { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; margin-bottom: 18px; }
  .progress-track span { display: block; height: 100%; background: linear-gradient(90deg, #0f5bd7, #39a0ff); }
  .question-card { border: 1px solid var(--border); border-radius: 22px; padding: clamp(18px, 4vw, 34px); }
  .question-meta { color: var(--muted); font-weight: 800; }
  .question-card h1 { color: var(--text); font-size: clamp(1.5rem, 4vw, 2.35rem); line-height: 1.2; margin-top: 0; }
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
  .question-meta-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
  .bookmark-toggle.active { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }

  .button { border: 1px solid var(--border-strong); border-radius: 999px; padding: 10px 16px; background: var(--surface); color: var(--primary-strong); font-weight: 800; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
  .button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(31,45,71,.12); }
  .button:disabled { opacity: .45; cursor: not-allowed; }
  .button.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
  .button.ghost { background: var(--surface-muted); }
  .button.small { padding: 7px 12px; font-size: .85rem; }

  @media (max-width: 760px) {
    .quiz-header, .question-actions, .question-meta-row { align-items: stretch; flex-direction: column; }
    .question-actions .button { width: 100%; }
  }
</style>
