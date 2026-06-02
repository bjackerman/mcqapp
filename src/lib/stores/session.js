import { DATASET_VERSION, getQuestionsByIds } from '$lib/data/questions.js';

export const STORAGE_KEY = 'mcq_session_v3';
export const LEGACY_STORAGE_KEY = 'mcq_session';
export const SESSION_SCHEMA_VERSION = 3;

const DEFAULT_SESSION = {
  schemaVersion: SESSION_SCHEMA_VERSION,
  datasetVersion: DATASET_VERSION,
  active: false,
  selectedTags: [],
  questionOrder: [],
  currentIndex: 0,
  scoreCorrect: 0,
  scoreAnswered: 0,
  stats: {},
  mode: 'practice',
  shuffle: false,
  cap: 'all',
  customCap: 10,
  lastAnsweredId: null,
  completedSessions: []
};

export let session = createInitialSession();

export function persistSession() {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPersistedSession() {
  Object.assign(session, createDefaultSession());
  persistSession();
}

export function hasResumeableSession(currentSession = session) {
  if (!currentSession.active || !Array.isArray(currentSession.questionOrder) || currentSession.questionOrder.length === 0) {
    return false;
  }

  if (currentSession.datasetVersion !== DATASET_VERSION) return false;
  if (currentSession.currentIndex < 0 || currentSession.currentIndex >= currentSession.questionOrder.length) return false;

  return getQuestionsByIds(currentSession.questionOrder).length === currentSession.questionOrder.length;
}

export function recordAnswer(question, selectedOption) {
  const isCorrect = selectedOption === question.correct;
  const previous = session.stats[question.id] || createEmptyStat();
  const updatedStat = {
    seen: previous.seen + 1,
    correct: previous.correct + (isCorrect ? 1 : 0),
    incorrect: previous.incorrect + (isCorrect ? 0 : 1),
    lastAnsweredAt: new Date().toISOString()
  };

  Object.assign(session, {
    scoreAnswered: session.scoreAnswered + 1,
    scoreCorrect: session.scoreCorrect + (isCorrect ? 1 : 0),
    lastAnsweredId: question.id,
    stats: {
      ...session.stats,
      [question.id]: updatedStat
    }
  });

  persistSession();
  return isCorrect;
}

export function completeSession() {
  const completed = {
    id: cryptoSafeId(),
    completedAt: new Date().toISOString(),
    mode: session.mode,
    selectedTags: [...session.selectedTags],
    questionCount: session.questionOrder.length,
    scoreCorrect: session.scoreCorrect,
    scoreAnswered: session.scoreAnswered,
    percentage: session.scoreAnswered ? Math.round((session.scoreCorrect / session.scoreAnswered) * 100) : 0
  };

  Object.assign(session, {
    active: false,
    completedSessions: [completed, ...session.completedSessions].slice(0, 20)
  });

  persistSession();
  return completed;
}

export function startSession({ selectedTags, questionOrder, mode, shuffle, cap, customCap }) {
  Object.assign(session, {
    schemaVersion: SESSION_SCHEMA_VERSION,
    datasetVersion: DATASET_VERSION,
    active: true,
    selectedTags: [...selectedTags],
    questionOrder: [...questionOrder],
    currentIndex: 0,
    scoreCorrect: 0,
    scoreAnswered: 0,
    mode,
    shuffle,
    cap,
    customCap,
    lastAnsweredId: null
  });

  persistSession();
}

export function quitActiveSession() {
  Object.assign(session, { active: false });
  persistSession();
}

export function advanceQuestion() {
  Object.assign(session, { currentIndex: session.currentIndex + 1 });
  persistSession();
}

function createInitialSession() {
  const stored = readStoredSession();
  const migrated = normalizeSession(stored);

  if (!migrated || migrated.datasetVersion !== DATASET_VERSION) {
    return createDefaultSession({ stats: migrated?.stats || {}, completedSessions: migrated?.completedSessions || [] });
  }

  return migrated;
}

function readStoredSession() {
  if (!isBrowser()) return null;

  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(key);
    }
  }

  return null;
}

function normalizeSession(value) {
  if (!value || typeof value !== 'object') return null;

  const questionOrder = Array.isArray(value.questionOrder)
    ? value.questionOrder.map(String)
    : Array.isArray(value.pool)
      ? value.pool.map(String)
      : [];

  const stats = normalizeStats(value.stats);
  const normalized = createDefaultSession({ stats, completedSessions: Array.isArray(value.completedSessions) ? value.completedSessions : [] });

  Object.assign(normalized, {
    schemaVersion: SESSION_SCHEMA_VERSION,
    datasetVersion: value.datasetVersion || DATASET_VERSION,
    active: Boolean(value.active),
    selectedTags: Array.isArray(value.selectedTags) ? value.selectedTags.filter(Boolean) : [],
    questionOrder,
    currentIndex: clampInteger(value.currentIndex, 0, Math.max(questionOrder.length - 1, 0)),
    scoreCorrect: clampInteger(value.scoreCorrect, 0, questionOrder.length),
    scoreAnswered: clampInteger(value.scoreAnswered, 0, questionOrder.length),
    mode: value.mode === 'mistakes' || value.mistakeMode ? 'mistakes' : 'practice',
    shuffle: Boolean(value.shuffle),
    cap: value.cap || 'all',
    customCap: clampInteger(value.customCap, 1, 500),
    lastAnsweredId: value.lastAnsweredId || null
  });

  if (!hasValidQuestionOrder(normalized)) {
    normalized.active = false;
    normalized.questionOrder = [];
    normalized.currentIndex = 0;
  }

  return normalized;
}

function normalizeStats(stats) {
  if (!stats || typeof stats !== 'object') return {};

  return Object.fromEntries(Object.entries(stats).map(([id, value]) => {
    const seen = clampInteger(value?.seen, 0, 1000000);
    const correct = clampInteger(value?.correct, 0, seen);
    const incorrect = clampInteger(value?.incorrect ?? seen - correct, 0, seen);

    return [String(id), {
      seen,
      correct,
      incorrect,
      lastAnsweredAt: typeof value?.lastAnsweredAt === 'string' ? value.lastAnsweredAt : null
    }];
  }));
}

function hasValidQuestionOrder(value) {
  return getQuestionsByIds(value.questionOrder).length === value.questionOrder.length;
}

function createDefaultSession(overrides = {}) {
  return {
    ...DEFAULT_SESSION,
    selectedTags: [],
    questionOrder: [],
    stats: {},
    completedSessions: [],
    ...overrides
  };
}

function createEmptyStat() {
  return { seen: 0, correct: 0, incorrect: 0, lastAnsweredAt: null };
}

function clampInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function cryptoSafeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isBrowser() {
  return typeof localStorage !== 'undefined';
}
