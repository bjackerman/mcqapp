export const CANONICAL_TOPICS = [
  { label: 'Management and Operations', expectedCount: 4135, category: 'Management' },
  { label: 'Economics', expectedCount: 1975, category: 'Economics' },
  { label: 'Data, Databases, and Information Management', expectedCount: 1941, category: 'Technology' },
  { label: 'Decision Making and Problem Solving', expectedCount: 1699, category: 'Management' },
  { label: 'Accounting Foundations', expectedCount: 1533, category: 'Accounting' },
  { label: 'Corporate Finance and Budgeting', expectedCount: 1444, category: 'Finance' },
  { label: 'Business Communication', expectedCount: 1423, category: 'Communication' },
  { label: 'Computer Hardware and Systems', expectedCount: 1408, category: 'Technology' },
  { label: 'Organizational Behavior and Culture', expectedCount: 1403, category: 'Management' },
  { label: 'Business Law and Contracts', expectedCount: 1306, category: 'Business' },
  { label: 'Public Policy and Government', expectedCount: 1297, category: 'Business' },
  { label: 'Marketing Foundations', expectedCount: 1197, category: 'Marketing' },
  { label: 'Human Resource Management', expectedCount: 1177, category: 'Management' },
  { label: 'Network Infrastructure', expectedCount: 1143, category: 'Technology' },
  { label: 'Personal Finance and Banking', expectedCount: 1128, category: 'Finance' },
  { label: 'Programming and Software', expectedCount: 1050, category: 'Technology' },
  { label: 'Ethics and Social Responsibility', expectedCount: 1003, category: 'Business' },
  { label: 'Global Business and International Trade', expectedCount: 845, category: 'Business' },
  { label: 'Accounting Reports and Financial Statements', expectedCount: 828, category: 'Accounting' },
  { label: 'Leadership Theory and Practice', expectedCount: 828, category: 'Leadership' },
  { label: 'Cybersecurity', expectedCount: 827, category: 'Technology' },
  { label: 'Marketing Research and Planning', expectedCount: 660, category: 'Marketing' },
  { label: 'Investments and Securities', expectedCount: 629, category: 'Finance' },
  { label: 'Consumer Behavior', expectedCount: 611, category: 'Marketing' },
  { label: 'Business Ownership and Structures', expectedCount: 600, category: 'Business' },
  { label: 'Project Management', expectedCount: 596, category: 'Management' },
  { label: 'Insurance and Risk Management', expectedCount: 585, category: 'Finance' },
  { label: 'Sales and Customer Service', expectedCount: 519, category: 'Marketing' },
  { label: 'Sports and Entertainment Management', expectedCount: 493, category: 'Marketing' },
  { label: 'Retail Management', expectedCount: 488, category: 'Marketing' },
  { label: 'Product and Service Management', expectedCount: 465, category: 'Marketing' },
  { label: 'Advertising and Media', expectedCount: 388, category: 'Marketing' },
  { label: 'Grammar, Editing, and Language', expectedCount: 378, category: 'Communication' },
  { label: 'Visual Design and Merchandising', expectedCount: 358, category: 'Marketing' },
  { label: 'Team Dynamics', expectedCount: 356, category: 'Leadership' },
  { label: 'Supply Chain and Distribution', expectedCount: 354, category: 'Operations' },
  { label: 'Asset and Payroll Management', expectedCount: 302, category: 'Accounting' },
  { label: 'Career Development and Planning', expectedCount: 273, category: 'Personal Development' },
  { label: 'Taxation', expectedCount: 272, category: 'Accounting' },
  { label: 'Journalism and Media Business', expectedCount: 191, category: 'Communication' },
  { label: 'Inventory, Warehousing, and Logistics', expectedCount: 176, category: 'Operations' },
  { label: 'Real Estate', expectedCount: 122, category: 'Business' },
  { label: 'Healthcare and Medical Administration', expectedCount: 46, category: 'Business' },
  { label: 'AI and Machine Learning', expectedCount: 33, category: 'Technology' }
].map((topic) => ({ ...topic, id: toTopicId(topic.label) }));

const LEGACY_ALIASES = {
  ACCOUNTING_ANALYSIS_AND_DECISION_MAKING: 'Accounting Reports and Financial Statements',
  ACCOUNTING_FOR_PROFESSIONALS: 'Accounting Foundations',
  ACCOUNTING_PRINCIPLES: 'Accounting Foundations',
  BUSINESS_COMMUNICATION: 'Business Communication',
  BUSINESS_DECISION_MAKING: 'Decision Making and Problem Solving',
  COMPUTER_APPLICATIONS: 'Computer Hardware and Systems',
  COMPUTER_CONCEPTS: 'Computer Hardware and Systems',
  COST_ACCOUNTING: 'Asset and Payroll Management',
  CYBER_SECURITY: 'Cybersecurity',
  ECONOMIC_ANALYSIS_AND_DECISION_MAKING: 'Economics',
  ENTREPRENEURSHIP_CONCEPTS: 'Business Ownership and Structures',
  FINANCIAL_ANALYSIS_AND_DECISION_MAKING: 'Corporate Finance and Budgeting',
  FINANCIAL_CONCEPTS: 'Corporate Finance and Budgeting',
  FINANCIAL_SERVICES: 'Personal Finance and Banking',
  INSURANCE_CONCEPTS: 'Insurance and Risk Management',
  MACROECONOMICS: 'Economics',
  MANAGEMENT_ANALYSIS_AND_DECISION_MAKING: 'Management and Operations',
  MANAGEMENT_CONCEPTS: 'Management and Operations',
  MARKETING_ANALYSIS_AND_DECISION_MAKING: 'Marketing Research and Planning',
  MARKETING_CONCEPTS: 'Marketing Foundations',
  MICROECONOMICS: 'Economics',
  NETWORK_DESIGN: 'Network Infrastructure',
  NETWORKING_CONCEPTS: 'Network Infrastructure',
  ORGANIZATIONAL_BEHAVIOR_AND_LEADERSHIP: 'Organizational Behavior and Culture',
  PERSONAL_FINANCE: 'Personal Finance and Banking',
  PROGRAMMING_CONCEPTS: 'Programming and Software',
  PROJECT_MANAGEMENT: 'Project Management'
};

const TOPIC_BY_ID = new Map(CANONICAL_TOPICS.map((topic) => [topic.id, topic]));
const TOPIC_ID_BY_NORMALIZED_KEY = new Map(CANONICAL_TOPICS.map((topic) => [normalizeTopicKey(topic.label), topic.id]));

for (const [legacyKey, canonicalLabel] of Object.entries(LEGACY_ALIASES)) {
  TOPIC_ID_BY_NORMALIZED_KEY.set(legacyKey, toTopicId(canonicalLabel));
}

export function toTopicId(value) {
  return normalizeTopicKey(value);
}

export function normalizeTopicKey(value) {
  return String(value)
    .trim()
    .replace(/_?(19|20)\d{2}$/i, '')
    .replace(/&/g, ' AND ')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
}

export function getTopicById(id) {
  return TOPIC_BY_ID.get(id) || null;
}

export function getTopicLabel(id) {
  return getTopicById(id)?.label || id;
}

export function getCanonicalTopicId(tag) {
  return TOPIC_ID_BY_NORMALIZED_KEY.get(normalizeTopicKey(tag)) || null;
}

export function getCanonicalTopicIds(tags = []) {
  return [...new Set(tags.map(getCanonicalTopicId).filter(Boolean))];
}

export function isKnownTopicTag(tag) {
  return Boolean(getCanonicalTopicId(tag));
}
