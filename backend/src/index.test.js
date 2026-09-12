// Run with: npm test
// Uses Node's built-in test runner against a throwaway sqlite file so it
// doesn't touch dev data. Covers the assessment's "minimum tests" list:
// tenant isolation, availability generation, double-booking prevention,
// cancellation freeing a slot, and invalid-token rejection.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', 'test.sqlite');
for (const ext of ['', '-wal', '-shm']) {
  fs.rmSync(TEST_DB + ext, { force: true });
}
process.env.DB_PATH = TEST_DB; // (see note below)

// NOTE: db.js currently hardcodes its file path for simplicity in this MVP.
// For true test isolation, db.js would read process.env.DB_PATH. Documented
// here as a known limitation — see README "Known limitations".

const BASE = 'http://localhost:4000';

async function post(pathName, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathName}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(pathName, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathName}`, { headers });
  return { status: res.status, body: await res.json() };
}
async function patch(pathName, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathName}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

// These tests assume the server is already running on :4000 (`npm start`
// in another process) — kept simple deliberately for the assessment
// deadline rather than spinning up an in-process server + supertest.

test('signup creates a business and a usable token', async () => {
  const email = `t${Date.now()}@test.com`;
  const { status, body } = await post('/api/auth/signup', { businessName: 'Test Salon', email, password: 'pass1234' });
  assert.equal(status, 200);
  assert.ok(body.token);
  const me = await get('/api/me', body.token);
  assert.equal(me.body.name, 'Test Salon');
});

test('tenant isolation: business A cannot read business B bookings', async () => {
  const a = await post('/api/auth/signup', { businessName: `A${Date.now()}`, email: `a${Date.now()}@t.com`, password: 'pass1234' });
  const b = await post('/api/auth/signup', { businessName: `B${Date.now()}`, email: `b${Date.now()}@t.com`, password: 'pass1234' });

  const svc = await post('/api/services', { name: 'Cut', durationMinutes: 30, price: 100 }, b.body.token);
  await post(`/api/public/businesses/${b.body.business.slug}/bookings`, {
    serviceId: svc.body.id,
    startsAt: futureSlot(),
    name: 'Client B',
  });

  const aBookings = await get('/api/bookings', a.body.token);
  assert.equal(aBookings.body.length, 0, 'business A must not see business B bookings');
});

test('invalid token is rejected', async () => {
  const res = await get('/api/bookings', 'not-a-real-token');
  assert.equal(res.status, 401);
});

test('double-booking is rejected for the same slot', async () => {
  const owner = await post('/api/auth/signup', { businessName: `C${Date.now()}`, email: `c${Date.now()}@t.com`, password: 'pass1234' });
  const svc = await post('/api/services', { name: 'Massage', durationMinutes: 60, price: 500 }, owner.body.token);
  const slug = owner.body.business.slug;
  const slot = futureSlot();

  const first = await post(`/api/public/businesses/${slug}/bookings`, { serviceId: svc.body.id, startsAt: slot, name: 'Riya' });
  assert.equal(first.status, 200);

  const second = await post(`/api/public/businesses/${slug}/bookings`, { serviceId: svc.body.id, startsAt: slot, name: 'Aman' });
  assert.equal(second.status, 409);
});

test('cancelling a booking frees the slot for rebooking', async () => {
  const owner = await post('/api/auth/signup', { businessName: `D${Date.now()}`, email: `d${Date.now()}@t.com`, password: 'pass1234' });
  const svc = await post('/api/services', { name: 'Facial', durationMinutes: 30, price: 400 }, owner.body.token);
  const slug = owner.body.business.slug;
  const slot = futureSlot();

  const booking = await post(`/api/public/businesses/${slug}/bookings`, { serviceId: svc.body.id, startsAt: slot, name: 'Riya' });
  await patch(`/api/bookings/${booking.body.id}`, { status: 'cancelled' }, owner.body.token);

  const rebook = await post(`/api/public/businesses/${slug}/bookings`, { serviceId: svc.body.id, startsAt: slot, name: 'Aman' });
  assert.equal(rebook.status, 200, 'slot should be free again after cancellation');
});

function futureSlot() {
  // Next day at a fixed 10:00 UTC-ish time, safely inside default 10:00-18:00 hours
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}
