// scripts/check-content.mjs
// Validates translated content files in src/i18n/content/<code>.json against en.json.
// Follows docs/agent-tasks/translate-content.md § 1e.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'src', 'i18n', 'content');
const enPath = path.join(contentDir, 'en.json');

if (!fs.existsSync(enPath)) {
  console.error(`Error: ${enPath} does not exist. Run npm run content:extract first.`);
  process.exit(1);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const targetArg = process.argv[2];
let filesToCheck = [];

if (targetArg) {
  const code = targetArg.replace(/\.json$/, '');
  const filePath = path.join(contentDir, `${code}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} not found.`);
    process.exit(1);
  }
  filesToCheck = [`${code}.json`];
} else {
  if (fs.existsSync(contentDir)) {
    filesToCheck = fs
      .readdirSync(contentDir)
      .filter((f) => f.endsWith('.json') && f !== 'en.json');
  }
}

if (filesToCheck.length === 0) {
  console.log('No translated content files to check against en.json.');
  process.exit(0);
}

const placeholderRegex = /\{+[^{}]+\}+/g;
const emojiRegex = /[\p{Extended_Pictographic}\uFE0F]/gu;

function extractPlaceholders(str) {
  // Strip valid {g:female|male} tokens before extracting placeholders
  const stripped = str.replace(/\{g:[^|}]*\|[^}]*\}/g, '');
  const m = stripped.match(placeholderRegex);
  return m ? m.sort() : [];
}

function extractEmojis(str) {
  const m = str.match(emojiRegex);
  return m ? m.sort() : [];
}

let totalErrors = 0;

for (const file of filesToCheck) {
  const locale = file.replace(/\.json$/, '');
  const filePath = path.join(contentDir, file);
  let local;
  try {
    local = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[FAIL] ${locale}: Failed to parse JSON: ${err.message}`);
    totalErrors++;
    continue;
  }

  const errors = [];
  let totalStrings = 0;
  let identicalStrings = 0;

  function walk(enNode, localNode, currentPath) {
    if (typeof enNode === 'string') {
      totalStrings++;
      if (typeof localNode !== 'string') {
        errors.push(`${currentPath}: expected string, got ${typeof localNode}`);
        return;
      }
      if (localNode.trim().length === 0) {
        errors.push(`${currentPath}: empty string leaf`);
        return;
      }
      if (localNode === enNode) {
        identicalStrings++;
      }

      // Check {g:...} token validity
      if (localNode.includes('{g:')) {
        const opens = (localNode.match(/\{g:/g) || []).length;
        const valid = (localNode.match(/\{g:[^|}]*\|[^}]*\}/g) || []).length;
        if (opens !== valid) {
          errors.push(`${currentPath}: malformed {g:...} token (must be {g:female|male})`);
        }
      }

      // Check placeholders
      const enPh = extractPlaceholders(enNode);
      const localPh = extractPlaceholders(localNode);
      if (JSON.stringify(enPh) !== JSON.stringify(localPh)) {
        errors.push(
          `${currentPath}: placeholder mismatch. Expected [${enPh.join(', ')}], got [${localPh.join(', ')}]`
        );
      }

      // Check asterisks count
      const enAst = (enNode.match(/\*/g) || []).length;
      const localAst = (localNode.match(/\*/g) || []).length;
      if (enAst !== localAst) {
        errors.push(
          `${currentPath}: asterisk count mismatch. Expected ${enAst}, got ${localAst}`
        );
      }

      // Check emoji
      const enEmoji = extractEmojis(enNode);
      const localEmoji = extractEmojis(localNode);
      if (JSON.stringify(enEmoji) !== JSON.stringify(localEmoji)) {
        errors.push(
          `${currentPath}: emoji mismatch. Expected [${enEmoji.join(', ')}], got [${localEmoji.join(', ')}]`
        );
      }
      return;
    }

    if (Array.isArray(enNode)) {
      if (!Array.isArray(localNode)) {
        errors.push(`${currentPath}: expected array, got ${typeof localNode}`);
        return;
      }
      if (enNode.length !== localNode.length) {
        errors.push(
          `${currentPath}: array length mismatch. Expected ${enNode.length}, got ${localNode.length}`
        );
        return;
      }
      for (let i = 0; i < enNode.length; i++) {
        walk(enNode[i], localNode[i], `${currentPath}[${i}]`);
      }
      return;
    }

    if (enNode && typeof enNode === 'object') {
      if (!localNode || typeof localNode !== 'object' || Array.isArray(localNode)) {
        errors.push(`${currentPath}: expected object, got ${Array.isArray(localNode) ? 'array' : typeof localNode}`);
        return;
      }
      const enKeys = Object.keys(enNode);
      const localKeys = Object.keys(localNode);

      const missing = enKeys.filter((k) => !(k in localNode));
      const extra = localKeys.filter((k) => !(k in enNode));

      if (currentPath === '') {
        for (const k of missing) {
          console.warn(`[WARN] ${locale}: section '${k}' not translated yet.`);
        }
      } else if (missing.length > 0) {
        errors.push(`${currentPath}: missing keys: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
      }
      if (extra.length > 0) {
        errors.push(`${currentPath}: extra keys: ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? '...' : ''}`);
      }

      for (const k of enKeys) {
        if (k in localNode) {
          walk(enNode[k], localNode[k], currentPath ? `${currentPath}.${k}` : k);
        }
      }
      return;
    }
  }

  walk(en, local, '');

  if (errors.length > 0) {
    console.error(`[FAIL] ${locale}: ${errors.length} error(s) found:`);
    for (const err of errors.slice(0, 20)) {
      console.error(`  - ${err}`);
    }
    if (errors.length > 20) {
      console.error(`  ... and ${errors.length - 20} more errors`);
    }
    totalErrors += errors.length;
  } else {
    const identicalPercent = totalStrings > 0 ? (identicalStrings / totalStrings) * 100 : 0;
    if (identicalPercent > 5) {
      console.warn(
        `[WARN] ${locale}: ${identicalStrings}/${totalStrings} (${identicalPercent.toFixed(1)}%) strings are identical to English.`
      );
    }
    console.log(`[PASS] ${locale}: all keys, array lengths, placeholders, asterisks, and emojis valid`);
  }
}

if (totalErrors > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
