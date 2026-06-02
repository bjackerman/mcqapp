import rawQuestions from '$lib/data/questions.json';
import questionRecordSchema from './question.schema.json';
import {
  CANONICAL_TOPICS,
  getCanonicalTopicIds,
  getTopicLabel,
  isKnownTopicTag,
  normalizeTopicKey
} from './taxonomy.js';

export const DATASET_VERSION = '2026.06.static-seed';
export const OPTION_LABELS = ['A', 'B', 'C', 'D'];
export const QUESTION_RECORD_SCHEMA = questionRecordSchema;
export const QUESTION_SCHEMA_DESCRIPTION = questionRecordSchema.description;

const VALIDATION_ERRORS = validateQuestions(rawQuestions);

if (VALIDATION_ERRORS.length) {
  throw new Error(`Invalid question data (${QUESTION_SCHEMA_DESCRIPTION}):\n${VALIDATION_ERRORS.join('\n')}`);
}

export const allQuestions = rawQuestions.map((question) => {
  const baseTags = getCanonicalTopicIds(question.tags);

  return {
    ...question,
    id: String(question.id),
    baseTags,
    topicLabels: baseTags.map(getTopicLabel)
  };
});

export const questionById = new Map(allQuestions.map((question) => [question.id, question]));

export function normalizeTag(tag) {
  return normalizeTopicKey(tag);
}

export function formatTopicName(tag) {
  return getTopicLabel(tag);
}

export function getGroupedTags() {
  const availableCounts = new Map();

  for (const question of allQuestions) {
    for (const topicId of question.baseTags) {
      availableCounts.set(topicId, (availableCounts.get(topicId) || 0) + 1);
    }
  }

  const groups = new Map();

  for (const topic of CANONICAL_TOPICS) {
    const item = {
      base: topic.id,
      label: topic.label,
      category: topic.category,
      count: availableCounts.get(topic.id) || 0,
      expectedCount: topic.expectedCount
    };

    if (!groups.has(topic.category)) groups.set(topic.category, []);
    groups.get(topic.category).push(item);
  }

  return [...groups.entries()].map(([name, items]) => ({
    name,
    items: items.sort((a, b) => a.label.localeCompare(b.label))
  }));
}

export function filterQuestions({ tags = [], mistakesOnly = false, stats = {} } = {}) {
  const selected = new Set(tags);

  return allQuestions.filter((question) => {
    const matchesTopic = selected.size > 0 && question.baseTags.some((tag) => selected.has(tag));
    if (!matchesTopic) return false;

    if (!mistakesOnly) return true;

    const stat = stats[question.id];
    return Boolean(stat && Number(stat.incorrect || 0) > 0);
  });
}

export function getQuestionsByIds(ids = []) {
  return ids.map((id) => questionById.get(String(id))).filter(Boolean);
}

export function buildQuestionOrder(pool, { shuffle = false, cap = 'all', customCap = 10 } = {}) {
  const ordered = shuffle ? shuffleQuestions(pool) : [...pool];
  const limit = resolveQuestionLimit(cap, customCap, ordered.length);
  return ordered.slice(0, limit).map((question) => question.id);
}

export function resolveQuestionLimit(cap, customCap, poolSize) {
  if (cap === 'all') return poolSize;

  const parsed = cap === 'custom' ? Number(customCap) : Number(cap);
  if (!Number.isFinite(parsed) || parsed < 1) return poolSize;

  return Math.min(Math.floor(parsed), poolSize);
}

function shuffleQuestions(questions) {
  const shuffled = [...questions];
  const random = seededRandom(`${Date.now()}-${questions.map((q) => q.id).join('|')}`);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function seededRandom(seed) {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function validateQuestions(questions) {
  const errors = [];
  const ids = new Set();
  const allowedFields = new Set(Object.keys(QUESTION_RECORD_SCHEMA.properties));

  if (!Array.isArray(questions)) {
    return ['Question data must be an array.'];
  }

  questions.forEach((question, index) => {
    const prefix = `Question at index ${index}`;

    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      errors.push(`${prefix} must be an object record.`);
      return;
    }

    for (const key of Object.keys(question)) {
      if (!allowedFields.has(key)) {
        errors.push(`${prefix} has unsupported field "${key}".`);
      }
    }

    for (const key of QUESTION_RECORD_SCHEMA.required) {
      if (!(key in question)) {
        errors.push(`${prefix} is missing required field "${key}".`);
      }
    }

    if (question?.id == null || String(question.id).trim() === '') {
      errors.push(`${prefix} is missing a stable id.`);
    } else if (typeof question.id !== 'string' && !Number.isInteger(question.id)) {
      errors.push(`${prefix} id must be a non-empty string or integer.`);
    } else if (ids.has(String(question.id))) {
      errors.push(`${prefix} has duplicate id ${question.id}.`);
    } else {
      ids.add(String(question.id));
    }

    if (!question?.question || typeof question.question !== 'string' || question.question.trim() === '') {
      errors.push(`${prefix} has empty question text.`);
    }

    if (!Array.isArray(question?.options) || question.options.length !== 4 || question.options.some((option) => !option || typeof option !== 'string' || option.trim() === '')) {
      errors.push(`${prefix} must have exactly four non-empty options.`);
    }

    if (!Number.isInteger(question?.correct) || question.correct < 0 || question.correct > 3) {
      errors.push(`${prefix} has an invalid zero-based correct answer index.`);
    }

    if (!question?.explanation || typeof question.explanation !== 'string' || question.explanation.trim() === '') {
      errors.push(`${prefix} has empty explanation text.`);
    }

    if (!Array.isArray(question?.tags) || question.tags.length === 0 || question.tags.some((tag) => !tag || typeof tag !== 'string' || tag.trim() === '')) {
      errors.push(`${prefix} must have one or more non-empty tags.`);
    } else {
      const uniqueTags = new Set(question.tags);
      if (uniqueTags.size !== question.tags.length) {
        errors.push(`${prefix} has duplicate tags.`);
      }

      for (const tag of question.tags) {
        if (!isKnownTopicTag(tag)) {
          errors.push(`${prefix} has unknown topic tag "${tag}". Add it to the canonical taxonomy before using it.`);
        }
      }
    }
  });

  return errors;
}
