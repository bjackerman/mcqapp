import questions from '$lib/data/questions.json';

export const allQuestions = questions;

const CATEGORY_MAP = {
  Accounting: ['ACCOUNTING_ANALYSIS_AND_DECISION_MAKING','ACCOUNTING_FOR_PROFESSIONALS','ACCOUNTING_PRINCIPLES','COST_ACCOUNTING'],
  Business: ['BUSINESS_COMMUNICATION','BUSINESS_DECISION_MAKING','ENTREPRENEURSHIP_CONCEPTS','MANAGEMENT_CONCEPTS','MANAGEMENT_ANALYSIS_AND_DECISION_MAKING'],
  Finance: ['FINANCIAL_CONCEPTS','FINANCIAL_SERVICES','FINANCIAL_ANALYSIS_AND_DECISION_MAKING','INSURANCE_CONCEPTS'],
  Marketing: ['MARKETING_CONCEPTS','MARKETING_ANALYSIS_AND_DECISION_MAKING'],
  Technology: ['COMPUTER_APPLICATIONS','COMPUTER_CONCEPTS','CYBER_SECURITY','NETWORKING_CONCEPTS','NETWORK_DESIGN','PROGRAMMING_CONCEPTS'],
  Economics: ['ECONOMIC_ANALYSIS_AND_DECISION_MAKING','MACROECONOMICS','MICROECONOMICS'],
  Leadership: ['ORGANIZATIONAL_BEHAVIOR_AND_LEADERSHIP'],
  Project: ['PROJECT_MANAGEMENT'],
  Personal: ['PERSONAL_FINANCE'],
};

function baseName(tag) {
  return tag.replace(/_?(2017|2019|2020)$/i, '');
}

export function getGroupedTags() {
  const tagCounts = {};
  for (const q of questions) {
    for (const t of q.tags || []) {
      const b = baseName(t);
      if (!tagCounts[b]) tagCounts[b] = { base: b, count: 0 };
      tagCounts[b].count += 1;
    }
  }

  const entries = Object.values(tagCounts).sort((a, b) => a.base.localeCompare(b.base));

  const groups = [];
  for (const [catName, catKeys] of Object.entries(CATEGORY_MAP)) {
    const items = entries.filter(e => catKeys.includes(e.base));
    if (items.length) {
      groups.push({ name: catName, items });
      for (const i of items) i._grouped = true;
    }
  }

  const ungrouped = entries.filter(e => !e._grouped);
  if (ungrouped.length) groups.push({ name: 'Other', items: ungrouped });

  return groups;
}

export function filterQuestions(tags, mistakesOnly, stats) {
  let pool = questions.filter(q => {
    return (q.tags || []).some(t => tags.includes(baseName(t)));
  });
  if (mistakesOnly) {
    pool = pool.filter(q => {
      const s = stats[q.id];
      return s && s.seen > 0 && s.correct === 0;
    });
  }
  return pool;
}
