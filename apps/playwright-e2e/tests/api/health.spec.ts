import { test, expect } from '@playwright/test';
import { DEPLOYED } from '../../support/env';

// Assumes DEPLOY_MODE=subdomain or DEPLOY_MODE=ports, where nginx proxies
// /api/ at the origin root — not true for DEPLOY_MODE=path.

test('API health endpoint reports healthy', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.service).toBe('careconnect-api');
});

test('the API build just deployed is the one serving', { tag: '@smoke' }, async ({ request }) => {
  test.skip(DEPLOYED.unit !== 'api', 'only checked when this run deployed the API');
  const body = await (await request.get('/api/health')).json();
  expect(body.version).toBe(DEPLOYED.version);
});

test('API rejects unauthenticated requests', async ({ request }) => {
  const response = await request.get('/api/patients');
  expect(response.status()).toBe(401);
});
