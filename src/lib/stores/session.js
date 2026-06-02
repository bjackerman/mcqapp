let stored = {};
try { stored = JSON.parse(localStorage.getItem('mcq_session') || '{}'); } catch {}

export let session = {
  active: stored.active || false,
  selectedTags: stored.selectedTags || [],
  pool: stored.pool || [],
  currentIndex: stored.currentIndex || 0,
  scoreCorrect: stored.scoreCorrect || 0,
  scoreAnswered: stored.scoreAnswered || 0,
  stats: stored.stats || {},
  mistakeMode: stored.mistakeMode || false,
};

export function persistSession() {
  localStorage.setItem('mcq_session', JSON.stringify({
    active: session.active,
    selectedTags: session.selectedTags,
    pool: session.pool,
    currentIndex: session.currentIndex,
    scoreCorrect: session.scoreCorrect,
    scoreAnswered: session.scoreAnswered,
    stats: session.stats,
    mistakeMode: session.mistakeMode,
  }));
}
