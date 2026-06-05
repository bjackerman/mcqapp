<script>
  export let session;
  export let uniqueMistakes;
  export let completedSummary;
  export let onNewQuiz;
  export let onPracticeMistakes;
  export let onReviewBookmarks;
</script>

<section class="summary-screen" aria-labelledby="summary-title">
  <p class="eyebrow">Session complete</p>
  <h1 id="summary-title">Nice work</h1>
  <div class="big-score">
    <span>{completedSummary?.scoreCorrect ?? session.scoreCorrect} / {completedSummary?.scoreAnswered ?? session.scoreAnswered}</span>
    <strong>{completedSummary?.percentage ?? 0}%</strong>
  </div>
  <p>You have {uniqueMistakes} questions marked for mistake practice across local guest progress.</p>
  <div class="actions center">
    <button class="button primary" type="button" on:click={onNewQuiz}>New quiz</button>
    <button class="button ghost" type="button" on:click={onPracticeMistakes}>Practice mistakes</button>
    <button class="button ghost" type="button" on:click={onReviewBookmarks}>Review bookmarks</button>
  </div>
</section>

<style>
  .summary-screen { text-align: center; padding: clamp(28px, 8vw, 72px); background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow); margin-top: 18px; }
  .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; font-weight: 800; color: var(--primary-strong); }
  h1 { font-size: clamp(2.1rem, 6vw, 4.8rem); line-height: .95; margin-bottom: 18px; margin-top: 0; }
  .big-score { display: grid; gap: 8px; margin: 24px auto; }
  .big-score span { font-size: clamp(3rem, 10vw, 6rem); font-weight: 900; color: var(--primary-strong); }
  .big-score strong { color: var(--primary); font-size: 2rem; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .actions.center { justify-content: center; }
  .button { border: 1px solid var(--border-strong); border-radius: 999px; padding: 10px 16px; background: var(--surface); color: var(--primary-strong); font-weight: 800; cursor: pointer; transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
  .button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(31,45,71,.12); }
  .button.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
  .button.ghost { background: var(--surface-muted); }

  @media (max-width: 760px) {
    .actions { align-items: stretch; flex-direction: column; }
    .actions .button { width: 100%; }
  }
</style>
