import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isVersionOnlyRelease } from './version-only-release.mjs';

test('only verified release metadata skips captures', async (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'careconnect-release-diff-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const write = (path, data) => {
    mkdirSync(join(cwd, path, '..'), { recursive: true });
    writeFileSync(join(cwd, path), typeof data === 'string' ? data : JSON.stringify(data));
  };
  const manifest = (version) => ({ name: '@careconnect/portal', version, dependencies: { react: '^19.0.0' } });
  const lock = (version) => ({ lockfileVersion: 3, packages: {
    'apps/portal': manifest(version),
    'node_modules/react': { version: '19.0.0', integrity: 'original' },
  } });
  git('init', '-q');
  git('config', 'user.email', 'martin@chromatic.com');
  git('config', 'user.name', 'Release tests');
  write('apps/portal/package.json', manifest('1.0.0'));
  write('apps/portal/CHANGELOG.md', '# Changelog\n');
  write('package-lock.json', lock('1.0.0'));
  write('.changeset/release-note.md', '---\n"@careconnect/portal": patch\n---\nFix login.\n');
  write('.changeset/README.md', '# Changesets\n');
  git('add', '.');
  git('commit', '-qm', 'Initial fixture');
  const base = git('rev-parse', 'HEAD');

  const check = (overrides = {}) => isVersionOnlyRelease({
    cwd, event: 'pull_request', branch: 'changeset-release/main', base,
    head: git('rev-parse', 'HEAD'), ...overrides,
  });
  const scenario = async (name, mutate, expected) => t.test(name, () => {
    git('reset', '--hard', base);
    git('clean', '-fdq');
    write('apps/portal/package.json', manifest('1.0.1'));
    write('apps/portal/CHANGELOG.md', '# Changelog\n\n## 1.0.1\nFix login.\n');
    write('package-lock.json', lock('1.0.1'));
    rmSync(join(cwd, '.changeset/release-note.md'));
    mutate();
    git('add', '.');
    git('commit', '-qm', 'Release fixture');
    assert.equal(check(), expected);
  });

  await scenario('generated version, changelog, lockfile and consumed changeset', () => {}, true);
  assert.equal(check({ event: 'push' }), false, 'main always captures');
  assert.equal(check({ event: 'merge_group' }), false, 'merge queue always captures');
  assert.equal(check({ branch: 'feature/login' }), false);
  assert.equal(check({ base: '' }), false);
  assert.equal(check({ base: 'missing-ref' }), false);
  assert.equal(check({ head: base }), false, 'empty diff never skips');
  await scenario('source added on the release branch', () => write('apps/portal/src/login.ts', 'changed'), false);
  await scenario('workflow added on the release branch', () => write('.github/workflows/test.yml', 'changed'), false);
  await scenario('manifest dependency changed', () => write('apps/portal/package.json', {
    ...manifest('1.0.1'), dependencies: { react: '^19.1.0' },
  }), false);
  await scenario('manifest script changed', () => write('apps/portal/package.json', {
    ...manifest('1.0.1'), scripts: { build: 'different-command' },
  }), false);
  await scenario('resolved dependency changed', () => {
    const data = lock('1.0.1');
    data.packages['node_modules/react'].version = '19.1.0';
    write('package-lock.json', data);
  }, false);
  await scenario('unchanged lockfile from Changesets', () => write('package-lock.json', lock('1.0.0')), true);
  await scenario('changed lockfile does not match workspace version', () => write('package-lock.json', lock('1.0.2')), false);
  await scenario('new changeset added', () => write('.changeset/new.md', 'another change'), false);
  await scenario('changeset instructions deleted', () => rmSync(join(cwd, '.changeset/README.md')), false);
  await scenario('unrelated changelog changed', () => write('apps/ehr/CHANGELOG.md', 'changed'), false);
  await scenario('invalid manifest', () => write('apps/portal/package.json', '{'), false);
  await scenario('file mode changed', () => chmodSync(join(cwd, 'apps/portal/package.json'), 0o755), false);
  await scenario('no actual version bump', () => {
    write('apps/portal/package.json', manifest('1.0.0'));
    write('package-lock.json', lock('1.0.0'));
  }, false);
  await scenario('new workspace added', () => {
    write('packages/new/package.json', { name: '@careconnect/new', version: '1.0.0' });
  }, false); // Adding a package requires normal validation.
});
