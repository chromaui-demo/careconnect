#!/usr/bin/env node
// Conservative fast path for the generated release PR. Never skip main or
// merge-queue builds: version strings appear in the published Storybook.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export function isVersionOnlyRelease({ event, branch, base, head, cwd = process.cwd() }) {
  if (event !== 'pull_request' || branch !== 'changeset-release/main' || !base || !head) return false;
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const ancestor = git('merge-base', base, head).trim();
    const read = (ref, path) => JSON.parse(git('show', `${ref}:${path}`));
    const entries = git('diff', '--raw', '--no-abbrev', '--no-renames', '-z', ancestor, head, '--').split('\0');
    entries.pop();
    const changes = [];
    for (let i = 0; i < entries.length; i += 2) {
      const [oldMode, newMode, , , status] = entries[i].slice(1).split(' ');
      // Reject executable-bit changes, symlinks, deletions of source files, etc.
      if (![oldMode, newMode].every((mode) => ['000000', '100644'].includes(mode))) return false;
      changes.push({ path: entries[i + 1], status });
    }

    const versions = new Map();
    for (const { path, status } of changes) {
      if (!/^(apps|packages)\/[^/]+\/package\.json$/.test(path)) continue;
      if (status !== 'M') return false;
      const before = read(ancestor, path);
      const after = read(head, path);
      const { version: oldVersion, ...oldRest } = before;
      const { version: newVersion, ...newRest } = after;
      const semver = /^\d+\.\d+\.\d+$/;
      if (!semver.test(oldVersion) || !semver.test(newVersion) || oldVersion === newVersion ||
          !isDeepStrictEqual(oldRest, newRest)) return false;
      versions.set(path.slice(0, -'/package.json'.length), [oldVersion, newVersion]);
    }
    if (versions.size === 0) return false;

    // Changesets can leave the lockfile untouched. If it changes, permit only
    // workspace version metadata matching the manifest bumps above.
    if (changes.some(({ path }) => path === 'package-lock.json')) {
      const oldLock = read(ancestor, 'package-lock.json');
      const newLock = read(head, 'package-lock.json');
      for (const [dir, [oldVersion, newVersion]] of versions) {
        if (oldLock.packages?.[dir]?.version !== oldVersion || newLock.packages?.[dir]?.version !== newVersion) return false;
        delete oldLock.packages[dir].version;
        delete newLock.packages[dir].version;
      }
      if (!isDeepStrictEqual(oldLock, newLock)) return false;
    }

    for (const { path, status } of changes) {
      if (/^(apps|packages)\/[^/]+\/package\.json$/.test(path)) continue;
      if (/^(apps|packages)\/[^/]+\/CHANGELOG\.md$/.test(path) &&
          versions.has(path.slice(0, -'/CHANGELOG.md'.length)) && ['A', 'M'].includes(status)) continue;
      if (/^\.changeset\/[^/]+\.md$/.test(path) && path !== '.changeset/README.md' && status === 'D') continue;
      if (path === 'package-lock.json' && status === 'M') continue;
      return false;
    }
    return true;
  } catch {
    // Missing history, invalid JSON, or an unexpected diff must run Chromatic.
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = isVersionOnlyRelease({
    event: process.env.EVENT,
    branch: process.env.HEAD_BRANCH,
    base: process.env.BASE_SHA,
    head: process.env.HEAD_SHA,
  });
  const output = `version_only=${result}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}
