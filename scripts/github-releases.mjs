#!/usr/bin/env node
/**
 * Create a GitHub Release for every release unit whose current version is
 * tagged but has no release yet. Idempotent — safe to run on every push to
 * main and by hand.
 *
 * Usage:
 *   node scripts/github-releases.mjs                # all release units
 *   node scripts/github-releases.mjs api portal     # only these units
 *   node scripts/github-releases.mjs --dry-run
 *
 * Release notes are the matching version section of the unit's CHANGELOG.md
 * (written by Changesets). Requires the GitHub CLI, authenticated.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RELEASE_UNITS, findUnit } from './release-units.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const selected = args.filter((a) => !a.startsWith('--'));

const units = selected.length
  ? selected.map((s) => findUnit(s) ?? fail(`Unknown release unit: ${s}`))
  : RELEASE_UNITS;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function sh(cmd, cmdArgs, opts = {}) {
  // Returns null (not a string) when stdout is inherited rather than piped.
  const out = execFileSync(cmd, cmdArgs, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  return out == null ? '' : out.trim();
}

function tagExists(tag) {
  try {
    sh('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function releaseExists(tag) {
  try {
    sh('gh', ['release', 'view', tag, '--json', 'tagName']);
    return true;
  } catch {
    return false;
  }
}

/** Extract the `## <version>` section from a Changesets-written changelog. */
function changelogSection(changelogPath, version) {
  if (!existsSync(changelogPath)) return '';
  const lines = readFileSync(changelogPath, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return rest.slice(0, end === -1 ? undefined : end).join('\n').trim();
}

let created = 0;
for (const unit of units) {
  const pkg = JSON.parse(readFileSync(join(rootDir, unit.dir, 'package.json'), 'utf8'));
  const tag = `${unit.name}@${pkg.version}`;

  if (!tagExists(tag)) {
    console.log(`skip  ${tag} — no git tag yet (run \`npm run release:tag\` first)`);
    continue;
  }
  if (releaseExists(tag)) {
    console.log(`ok    ${tag} — release already exists`);
    continue;
  }

  const notes = changelogSection(join(rootDir, unit.dir, 'CHANGELOG.md'), pkg.version) || `${unit.name} ${pkg.version}`;
  const title = `${unit.name}@${pkg.version}`;
  if (dryRun) {
    console.log(`would create ${tag}\n${notes}\n`);
    continue;
  }
  sh('gh', ['release', 'create', tag, '--title', title, '--notes', notes, ...(pkg.version.includes('-') ? ['--prerelease'] : [])], { stdio: 'inherit' });
  console.log(`created ${tag}`);
  created += 1;
}

console.log(dryRun ? 'Dry run complete.' : `Done — ${created} release(s) created.`);
