import { readFileSync } from 'node:fs';
import { CANONICAL_TOPICS, getCanonicalTopicIds, isKnownTopicTag } from '../src/lib/data/taxonomy.js';

const questions = JSON.parse(readFileSync(new URL('../src/lib/data/questions.json', import.meta.url), 'utf8'));
const questionRecordSchema = JSON.parse(readFileSync(new URL('../src/lib/data/question.schema.json', import.meta.url), 'utf8'));
const errors = [];
const ids = new Set();
const availableTopicCounts = new Map(CANONICAL_TOPICS.map((topic) => [topic.id, 0]));
const allowedFields = new Set(Object.keys(questionRecordSchema.properties));

if (!Array.isArray(questions)) {
  errors.push('Question data must be an array.');
} else {
  questions.forEach((question, index) => {
    const prefix = `Question at index ${index}`;

    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      errors.push(`${prefix} must be an object record.`);
      return;
    }

    for (const key of Object.keys(question)) {
      if (!allowedFields.has(key)) errors.push(`${prefix} has unsupported field "${key}".`);
    }

    for (const key of questionRecordSchema.required) {
      if (!(key in question)) errors.push(`${prefix} is missing required field "${key}".`);
    }

    if (question?.id == null || String(question.id).trim() === '') {
      errors.push(`${prefix} is missing id.`);
    } else if (typeof question.id !== 'string' && !Number.isInteger(question.id)) {
      errors.push(`${prefix} id must be a non-empty string or integer.`);
    } else if (ids.has(String(question.id))) {
      errors.push(`${prefix} duplicates id ${question.id}.`);
    } else {
      ids.add(String(question.id));
    }

    if (!question?.question || typeof question.question !== 'string' || question.question.trim() === '') errors.push(`${prefix} has empty question text.`);
    if (!Array.isArray(question?.options) || question.options.length !== 4 || question.options.some((option) => !option || typeof option !== 'string' || option.trim() === '')) {
      errors.push(`${prefix} must have exactly four non-empty options.`);
    }
    if (!Number.isInteger(question?.correct) || question.correct < 0 || question.correct > 3) errors.push(`${prefix} has invalid correct index.`);
    if (!question?.explanation || typeof question.explanation !== 'string' || question.explanation.trim() === '') errors.push(`${prefix} has empty explanation.`);
    if (!Array.isArray(question?.tags) || question.tags.length === 0 || question.tags.some((tag) => !tag || typeof tag !== 'string' || tag.trim() === '')) {
      errors.push(`${prefix} must have one or more non-empty tags.`);
    } else {
      const uniqueTags = new Set(question.tags);
      if (uniqueTags.size !== question.tags.length) errors.push(`${prefix} has duplicate tags.`);

      for (const tag of question.tags) {
        if (!isKnownTopicTag(tag)) errors.push(`${prefix} has unknown topic tag "${tag}".`);
      }

      for (const topicId of getCanonicalTopicIds(question.tags)) {
        availableTopicCounts.set(topicId, (availableTopicCounts.get(topicId) || 0) + 1);
      }
    }
  });
}

if (errors.length) {
  console.error(`Question validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const populatedTopics = [...availableTopicCounts.values()].filter(Boolean).length;
console.log(`Validated ${questions.length} questions against ${questionRecordSchema.title} and ${CANONICAL_TOPICS.length} canonical topics.`);
console.log(`${populatedTopics} canonical topics currently have bundled seed questions.`);
