import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

const patterns = [
  {
    name: 'private key',
    expression: new RegExp(`BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY`),
  },
  {
    name: 'GitHub token',
    expression: new RegExp(`ghp_[A-Za-z0-9]{36}`),
  },
  {
    name: 'GitHub fine-grained token',
    expression: new RegExp(`github_pat_[A-Za-z0-9_]{40,}`),
  },
  {
    name: 'OpenAI-style API key',
    expression: new RegExp(`sk-(?:proj-)?[A-Za-z0-9_-]{20,}`),
  },
  {
    name: 'AWS access key ID',
    expression: new RegExp(`AKIA[0-9A-Z]{16}`),
  },
  {
    name: 'Google API key',
    expression: new RegExp(`AIza[0-9A-Za-z_-]{35}`),
  },
];

const forbiddenTrackedNames = new Set(['.env', '.npmrc', '.pypirc', 'id_rsa', 'id_ed25519']);

function repositoryFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' },
  );
  return output.split('\0').filter(Boolean);
}

const findings = [];
let scanned = 0;
let skippedLarge = 0;

for (const path of repositoryFiles()) {
  const fileName = basename(path);
  if (forbiddenTrackedNames.has(fileName) && fileName !== '.env.example') {
    findings.push(`${path}: sensitive filename is not allowed in the repository`);
    continue;
  }

  const size = statSync(path).size;
  if (size > MAX_TEXT_FILE_BYTES) {
    skippedLarge++;
    continue;
  }

  const buffer = readFileSync(path);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');
  scanned++;

  for (const pattern of patterns) {
    const match = pattern.expression.exec(text);
    if (!match) continue;
    const line = text.slice(0, match.index).split('\n').length;
    findings.push(`${path}:${line}: possible ${pattern.name}`);
  }
}

if (findings.length) {
  console.error('Repository secret scan failed:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  console.error('Remove the secret from the working tree and rotate any exposed credential.');
  process.exit(1);
}

console.log(
  `Repository secret scan passed (${scanned} text files scanned${
    skippedLarge ? `, ${skippedLarge} files over 5 MB skipped` : ''
  }).`,
);
