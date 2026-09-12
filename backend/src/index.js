import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { signToken, requireAuth } from './auth.js';
import { getAvailableSlots, createBookingSafely, checkSlotAvailable } from './availability.js';

const app = express();
app.use(cors());
app.use(express.json());

const uuid = () => crypto.randomUUID();
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function recordBookingEvent(bookingId, businessId, eventType, metadata = {}) {
  db.prepare(
    'INSERT INTO booking_events (id, booking_id, business_id, event_type, metadata) VALUES (?, ?, ?, ?, ?)'
  ).run(uuid(), bookingId, businessId, eventType, JSON.stringify(metadata));
}

function getBookingDetail(id, businessId) {
  return db.prepare(`
    SELECT bookings.*, services.name as service_name, clients.name as client_name, clients.phone as client_phone, clients.email as client_email
    FROM bookings
    JOIN services ON services.id = bookings.service_id
    JOIN clients ON clients.id = bookings.client_id
    WHERE bookings.id = ? AND bookings.business_id = ?
  `).get(id, businessId);
}

// ---------- AUTH ----------
app.post('/api/auth/signup', (req, res) => {
  const { businessName, email, password } = req.body;
  if (!businessName || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = db.prepare('SELECT id FROM businesses WHERE owner_email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Account already exists' });

  let slug = slugify(businessName);
  let suffix = 0;
  while (db.prepare('SELECT id FROM businesses WHERE slug = ?').get(suffix ? `${slug}-${suffix}` : slug)) suffix++;
  if (suffix) slug = `${slug}-${suffix}`;

  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO businesses (id, owner_email, password_hash, name, slug, subscription_status, plan) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, email, hash, businessName, slug, 'active', 'starter');

  db.prepare('INSERT INTO subscriptions (id, business_id, plan, status) VALUES (?, ?, ?, ?)')
    .run(uuid(), id, 'starter', 'active');

  const insertHours = db.prepare(
    'INSERT INTO business_hours (id, business_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (let dow = 0; dow <= 6; dow++) {
    insertHours.run(uuid(), id, dow, '10:00', '18:00', dow === 0 ? 0 : 1);
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
  res.json({ token: signToken(business), business: { id, name: businessName, slug, subscription_status: 'active', plan: 'starter' } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const business = db.prepare('SELECT * FROM businesses WHERE owner_email = ?').get(email);
  if (!business || !bcrypt.compareSync(password, business.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: signToken(business), business: { id: business.id, name: business.name, slug: business.slug, subscription_status: business.subscription_status, plan: business.plan } });
});

// ---------- TENANT-SCOPED (dashboard) ----------
app.get('/api/me', requireAuth, (req, res) => {
  const b = db.prepare('SELECT id, name, slug, timezone, subscription_status, plan FROM businesses WHERE id = ?').get(req.businessId);
  res.json(b);
});

app.get('/api/services', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY created_at').all(req.businessId));
});

app.post('/api/services', requireAuth, (req, res) => {
  const { name, durationMinutes, price } = req.body;
  if (!name || !durationMinutes) return res.status(400).json({ error: 'Missing fields' });
  const id = uuid();
  db.prepare('INSERT INTO services (id, business_id, name, duration_minutes, price) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.businessId, name, durationMinutes, price || 0);
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
});

app.patch('/api/services/:id', requireAuth, (req, res) => {
  const svc = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!svc) return res.status(404).json({ error: 'Not found' });
  const { name, durationMinutes, price, active } = req.body;
  db.prepare('UPDATE services SET name=?, duration_minutes=?, price=?, active=? WHERE id=?')
    .run(name ?? svc.name, durationMinutes ?? svc.duration_minutes, price ?? svc.price, active ?? svc.active, svc.id);
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(svc.id));
});

app.get('/api/hours', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week').all(req.businessId));
});

app.patch('/api/hours/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM business_hours WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { startTime, endTime, enabled } = req.body;
  db.prepare('UPDATE business_hours SET start_time=?, end_time=?, enabled=? WHERE id=?')
    .run(startTime ?? row.start_time, endTime ?? row.end_time, enabled ?? row.enabled, row.id);
  res.json(db.prepare('SELECT * FROM business_hours WHERE id = ?').get(row.id));
});

app.get('/api/bookings', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT bookings.*, services.name as service_name, clients.name as client_name, clients.phone as client_phone
    FROM bookings
    JOIN services ON services.id = bookings.service_id
    JOIN clients ON clients.id = bookings.client_id
    WHERE bookings.business_id = ?
    ORDER BY bookings.starts_at DESC
  `).all(req.businessId);
  res.json(rows);
});

app.patch('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, booking.id);
  recordBookingEvent(booking.id, req.businessId, `status:${status}`, { previousStatus: booking.status, newStatus: status });
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id));
});

app.post('/api/bookings/:id/reschedule', requireAuth, (req, res) => {
  const { startsAt } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (!startsAt) return res.status(400).json({ error: 'startsAt is required' });

  const service = db.prepare('SELECT id, duration_minutes, price FROM services WHERE id = ? AND business_id = ?').get(booking.service_id, req.businessId);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startsAt' });
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  try {
    const candidate = checkSlotAvailable({
      businessId: req.businessId,
      serviceId: booking.service_id,
      startsAtISO: startsAt,
      ignoreBookingId: booking.id,
    });
    db.prepare('UPDATE bookings SET starts_at=?, ends_at=?, status=? WHERE id=?')
      .run(candidate.start.toISOString(), candidate.end.toISOString(), 'confirmed', booking.id);
    recordBookingEvent(booking.id, req.businessId, 'rescheduled', { previousStartsAt: booking.starts_at, newStartsAt: candidate.start.toISOString() });
    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id));
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'That slot is no longer available.' });
    }
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/clients', requireAuth, (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : null;
  const rows = q
    ? db.prepare('SELECT * FROM clients WHERE business_id = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ?) ORDER BY created_at DESC').all(req.businessId, q, q, q)
    : db.prepare('SELECT * FROM clients WHERE business_id = ? ORDER BY created_at DESC').all(req.businessId);
  res.json(rows);
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const bookings = db.prepare(`
    SELECT bookings.*, services.name as service_name
    FROM bookings
    JOIN services ON services.id = bookings.service_id
    WHERE bookings.client_id = ? AND bookings.business_id = ?
    ORDER BY bookings.starts_at DESC
  `).all(client.id, req.businessId);
  res.json({ ...client, bookings });
});

app.patch('/api/clients/:id', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND business_id = ?').get(req.params.id, req.businessId);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const { name, email, phone, notes } = req.body;
  db.prepare('UPDATE clients SET name=?, email=?, phone=?, notes=? WHERE id=?')
    .run(name ?? client.name, email ?? client.email, phone ?? client.phone, notes ?? client.notes, client.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(client.id));
});

app.get('/api/dashboard/summary', requireAuth, (req, res) => {
  const businessId = req.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const todays = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE business_id=? AND date(starts_at)=date(?) AND status != 'cancelled'`
  ).get(businessId, today).c;
  const upcoming = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE business_id=? AND starts_at > datetime('now') AND status IN ('pending','confirmed')`
  ).get(businessId).c;
  const revenue = db.prepare(
    `SELECT COALESCE(SUM(price),0) as s FROM bookings WHERE business_id=? AND status IN ('confirmed','completed')`
  ).get(businessId).s;
  const clients = db.prepare('SELECT COUNT(*) as c FROM clients WHERE business_id=?').get(businessId).c;
  const subscription = db.prepare('SELECT status, plan FROM subscriptions WHERE business_id = ?').get(businessId);
  res.json({ todaysAppointments: todays, upcomingBookings: upcoming, revenue, clients, subscriptionStatus: subscription?.status || 'active', plan: subscription?.plan || 'starter' });
});

app.get('/api/billing/status', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM subscriptions WHERE business_id = ?').get(req.businessId);
  if (!row) {
    return res.json({ status: 'active', plan: 'starter', provider_customer_id: null, provider_subscription_id: null });
  }
  res.json(row);
});

app.post('/api/billing/checkout', requireAuth, (req, res) => {
  const { plan = 'starter' } = req.body;
  const status = 'active';
  const record = db.prepare('SELECT * FROM subscriptions WHERE business_id = ?').get(req.businessId);
  if (record) {
    db.prepare('UPDATE subscriptions SET plan=?, status=?, provider_customer_id=?, provider_subscription_id=? WHERE business_id=?')
      .run(plan, status, `cust_${req.businessId.slice(0, 10)}`, `sub_${req.businessId.slice(0, 10)}`, req.businessId);
  } else {
    db.prepare('INSERT INTO subscriptions (id, business_id, plan, status, provider_customer_id, provider_subscription_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), req.businessId, plan, status, `cust_${req.businessId.slice(0, 10)}`, `sub_${req.businessId.slice(0, 10)}`);
  }
  db.prepare('UPDATE businesses SET subscription_status=?, plan=? WHERE id=?').run(status, plan, req.businessId);
  res.json({ status, plan, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}` });
});

app.post('/api/billing/webhook', (req, res) => {
  const { status, plan } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const id = req.body.businessId || req.headers['x-business-id'];
  if (!id) return res.status(400).json({ error: 'businessId required' });
  db.prepare('UPDATE businesses SET subscription_status=?, plan=? WHERE id=?').run(status, plan || 'starter', id);
  db.prepare('INSERT OR REPLACE INTO subscriptions (id, business_id, plan, status) VALUES (?, ?, ?, ?)')
    .run(uuid(), id, plan || 'starter', status);
  res.json({ ok: true });
});

app.post('/api/jobs/reminders', (req, res) => {
  const now = new Date();
  const due = db.prepare(`
    SELECT b.id, b.business_id, b.starts_at, b.client_id, c.email, c.phone, s.name as service_name
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    JOIN services s ON s.id = b.service_id
    WHERE b.status IN ('pending', 'confirmed')
      AND b.starts_at BETWEEN datetime(?) AND datetime(?, '+24 hours')
      AND NOT EXISTS (
        SELECT 1 FROM reminders r WHERE r.booking_id = b.id AND r.status = 'sent'
      )
  `).all(now.toISOString(), now.toISOString());

  let sent = 0;
  for (const booking of due) {
    const reminderId = uuid();
    db.prepare('INSERT INTO reminders (id, business_id, booking_id, channel, scheduled_for, status, message) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(reminderId, booking.business_id, booking.id, 'email', booking.starts_at, 'sent', `Reminder: ${booking.service_name} on ${booking.starts_at}`);
    sent += 1;
  }

  res.json({ sent, totalCandidates: due.length });
});

// ---------- PUBLIC BOOKING ----------
app.get('/api/public/businesses', (req, res) => {
  const rows = db.prepare('SELECT id, name, slug FROM businesses ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/public/businesses/:slug', (req, res) => {
  const b = db.prepare('SELECT id, name, slug, timezone FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Business not found' });
  res.json(b);
});

app.get('/api/public/businesses/:slug/services', (req, res) => {
  const b = db.prepare('SELECT id FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Business not found' });
  res.json(db.prepare('SELECT id, name, duration_minutes, price FROM services WHERE business_id = ? AND active = 1').all(b.id));
});

app.get('/api/public/businesses/:slug/availability', (req, res) => {
  const b = db.prepare('SELECT id FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Business not found' });
  const { serviceId, date } = req.query;
  if (!serviceId || !date) return res.status(400).json({ error: 'serviceId and date required' });
  const result = getAvailableSlots(b.id, serviceId, date);
  res.json(result);
});

app.post('/api/public/businesses/:slug/bookings', (req, res) => {
  const b = db.prepare('SELECT id FROM businesses WHERE slug = ?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'Business not found' });

  const { serviceId, startsAt, name, email, phone, notes } = req.body;
  if (!serviceId || !startsAt || !name) return res.status(400).json({ error: 'Missing required fields' });

  let client = null;
  if (phone) client = db.prepare('SELECT * FROM clients WHERE business_id = ? AND phone = ?').get(b.id, phone);
  if (!client && email) client = db.prepare('SELECT * FROM clients WHERE business_id = ? AND email = ?').get(b.id, email);
  if (!client) {
    const clientId = uuid();
    db.prepare('INSERT INTO clients (id, business_id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(clientId, b.id, name, email || null, phone || null, notes || null);
    client = { id: clientId };
  }

  try {
    const bookingId = createBookingSafely({ businessId: b.id, serviceId, clientId: client.id, startsAtISO: startsAt });
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    recordBookingEvent(bookingId, b.id, 'created', { serviceId, clientId: client.id, startsAt });
    res.json(booking);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'That slot was just booked by someone else. Please pick another time.' });
    }
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
