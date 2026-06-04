import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const BUILD_DIR = 'build';
const REQUIRED_FILES = ['index.html', 'favicon.svg'];
const REQUIRED_SNIPPETS = [
  '_app/immutable',
  'data-sveltekit-preload-data'
];
const SECRET_PATTERNS = [
  /mongodb(?:\+srv)?:\/\//i,
  /sk_live_[a-z0-9]/i,
  /pk_live_[a-z0-9]/i,
  /stripe_secret/i,
  /password\s*=/i
];

const failures = [];

async function assertFile(path) {
  try {
    const info = await stat(path);
    if (!info.isFile()) failures.push(`${path} exists but is not a file.`);
  } catch {
    failures.push(`${path} is missing. Run npm run build before the production smoke check.`);
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

for (const file of REQUIRED_FILES) {
  await assertFile(join(BUILD_DIR, file));
}

const indexPath = join(BUILD_DIR, 'index.html');
let index = '';
try {
  index = await readFile(indexPath, 'utf8');
} catch {
  // Missing file is reported above.
}

for (const snippet of REQUIRED_SNIPPETS) {
  if (!index.includes(snippet)) failures.push(`${indexPath} does not contain expected production snippet: ${snippet}`);
}

let buildFiles = [];
try {
  buildFiles = await walk(BUILD_DIR);
} catch {
  failures.push(`${BUILD_DIR}/ cannot be read.`);
}

const assetFiles = buildFiles.filter((file) => file.includes('/_app/immutable/') || file.includes('\\_app\\immutable\\'));
if (assetFiles.length === 0) failures.push('No immutable SvelteKit assets were generated.');

const generatedText = await Promise.all(
  buildFiles
    .filter((path) => /\.(html|js|json|css)$/i.test(path))
    .map(async (file) => [file, await readFile(file, 'utf8')])
);

if (!generatedText.some(([, contents]) => contents.includes('Build a focused study session'))) {
  failures.push('Built assets do not contain the setup-screen hero copy.');
}

if (!generatedText.some(([, contents]) => contents.includes('mcq'))) {
  failures.push('Built assets do not contain the app identifier text.');
}


for (const [file, contents] of generatedText) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(contents)) failures.push(`${file} appears to contain a forbidden production secret pattern (${pattern}).`);
  }
}

if (failures.length) {
  console.error('Production smoke check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production smoke check passed for ${buildFiles.length} files (${assetFiles.length} immutable assets).`);
