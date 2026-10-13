// apps/api/src/db/seeded-password.test.ts
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_SEEDED_PASSWORD, seededPassword } from './seeded-password.js';

const saved = { SEEDED_PASSWORD: process.env.SEEDED_PASSWORD, NODE_ENV: process.env.NODE_ENV };

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('uses SEEDED_PASSWORD when it is set', () => {
  process.env.SEEDED_PASSWORD = 'a-deployed-password';
  process.env.NODE_ENV = 'production';
  assert.equal(seededPassword(), 'a-deployed-password');
});

test('falls back to the documented password outside production', () => {
  delete process.env.SEEDED_PASSWORD;
  delete process.env.NODE_ENV;
  assert.equal(seededPassword(), LOCAL_SEEDED_PASSWORD);
});

test('refuses the public default in production', () => {
  delete process.env.SEEDED_PASSWORD;
  process.env.NODE_ENV = 'production';
  assert.throws(() => seededPassword(), /SEEDED_PASSWORD is not set/);
});
