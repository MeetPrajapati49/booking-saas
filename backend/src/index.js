import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import supabase from './db.js';
import { signToken, requireAuth } from './auth.js';
import { getAvailableSlots, createBookingSafely, checkSlotAvailable } from './availability.js';

const app = express();
app.use(cors());
app.use(express.json());

const uuid = () => crypto.randomUUID();
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function recordBookingEvent(bookingId, businessId, eventType, metadata = {}) {
  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    business_id: businessId,
    event_type: eventType,
    metadata
  });
}

// ---------- AUTH ----------
app.post('/api/auth/signup', async (req, res) => {
  const { businessName, email, password } = req.body;
  if (!businessName || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const { data: existing } = await supabase.from('businesses').select('id').eq('owner_email', email).single();
  if (existing) return res.status(409).json({ error: 'Account already exists' });

  let slug = slugify(businessName);
  let suffix = 0;
  while (true) {
    const checkSlug = suffix ? `${slug}-${suffix}` : slug;
    const { data: s } = await supabase.from('businesses').select('id').eq('slug', checkSlug).maybeSingle();
    if (!s) {
      slug = checkSlug;
      break;
    }
    suffix++;
  }

  const hash = bcrypt.hashSync(password, 10);
  const { data: newBusiness, error: bErr } = await supabase.from('businesses').insert({
    owner_email: email,
    password_hash: hash,
    name: businessName,
    slug,
    subscription_status: 'active',
    plan: 'starter'
  }).select().single();

  if (bErr) return res.status(500).json({ error: bErr.message });

  await supabase.from('subscriptions').insert({
    business_id: newBusiness.id,
    plan: 'starter',
    status: 'active'
  });

  const hours = [];
  for (let dow = 0; dow <= 6; dow++) {
    hours.push({
      business_id: newBusiness.id,
      day_of_week: dow,
      start_time: '10:00',
      end_time: '18:00',
      enabled: dow === 0 ? 0 : 1
    });
  }
  await supabase.from('business_hours').insert(hours);

  res.json({ token: signToken(newBusiness), business: { id: newBusiness.id, name: businessName, slug, subscription_status: 'active', plan: 'starter' } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: business } = await supabase.from('businesses').select('*').eq('owner_email', email).maybeSingle();
  if (!business || !bcrypt.compareSync(password, business.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ token: signToken(business), business: { id: business.id, name: business.name, slug: business.slug, subscription_status: business.subscription_status, plan: business.plan } });
});

// ---------- TENANT-SCOPED (dashboard) ----------
app.get('/api/me', requireAuth, async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id, name, slug, timezone, subscription_status, plan').eq('id', req.businessId).single();
  res.json(b);
});

app.get('/api/services', requireAuth, async (req, res) => {
  const { data } = await supabase.from('services').select('*').eq('business_id', req.businessId).order('created_at');
  res.json(data);
});

app.post('/api/services', requireAuth, async (req, res) => {
  const { name, durationMinutes, price } = req.body;
  if (!name || !durationMinutes) return res.status(400).json({ error: 'Missing fields' });
  const { data } = await supabase.from('services').insert({
    business_id: req.businessId,
    name,
    duration_minutes: durationMinutes,
    price: price || 0
  }).select().single();
  res.json(data);
});

app.patch('/api/services/:id', requireAuth, async (req, res) => {
  const { name, durationMinutes, price, active } = req.body;
  const { data: svc } = await supabase.from('services').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!svc) return res.status(404).json({ error: 'Not found' });
  
  const { data } = await supabase.from('services').update({
    name: name ?? svc.name,
    duration_minutes: durationMinutes ?? svc.duration_minutes,
    price: price ?? svc.price,
    active: active ?? svc.active
  }).eq('id', svc.id).select().single();
  res.json(data);
});

app.get('/api/hours', requireAuth, async (req, res) => {
  const { data } = await supabase.from('business_hours').select('*').eq('business_id', req.businessId).order('day_of_week');
  res.json(data);
});

app.patch('/api/hours/:id', requireAuth, async (req, res) => {
  const { startTime, endTime, enabled } = req.body;
  const { data: row } = await supabase.from('business_hours').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { data } = await supabase.from('business_hours').update({
    start_time: startTime ?? row.start_time,
    end_time: endTime ?? row.end_time,
    enabled: enabled ?? row.enabled
  }).eq('id', row.id).select().single();
  res.json(data);
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('bookings')
    .select(`
      *,
      services (name),
      clients (name, phone)
    `)
    .eq('business_id', req.businessId)
    .order('starts_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(b => ({
    ...b,
    service_name: b.services.name,
    client_name: b.clients.name,
    client_phone: b.clients.phone
  }));
  res.json(formatted);
});

app.patch('/api/bookings/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  const allowed = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  const { data } = await supabase.from('bookings').update({ status }).eq('id', booking.id).select().single();
  await recordBookingEvent(booking.id, req.businessId, `status:${status}`, { previousStatus: booking.status, newStatus: status });
  res.json(data);
});

app.post('/api/bookings/:id/reschedule', requireAuth, async (req, res) => {
  const { startsAt } = req.body;
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (!startsAt) return res.status(400).json({ error: 'startsAt is required' });

  const { data: service } = await supabase.from('services').select('id, duration_minutes, price').eq('id', booking.service_id).eq('business_id', req.businessId).single();
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startsAt' });

  try {
    const candidate = await checkSlotAvailable({
      businessId: req.businessId,
      serviceId: booking.service_id,
      startsAtISO: startsAt,
      ignoreBookingId: booking.id,
    });
    const { data } = await supabase.from('bookings').update({
      starts_at: candidate.start.toISOString(),
      ends_at: candidate.end.toISOString(),
      status: 'confirmed'
    }).eq('id', booking.id).select().single();
    
    await recordBookingEvent(booking.id, req.businessId, 'rescheduled', { previousStartsAt: booking.starts_at, newStartsAt: candidate.start.toISOString() });
    res.json(data);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') return res.status(409).json({ error: 'That slot is no longer available.' });
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/clients', requireAuth, async (req, res) => {
  const q = req.query.q;
  let query = supabase.from('clients').select('*').eq('business_id', req.businessId).order('created_at', { ascending: false });
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data } = await query;
  res.json(data);
});

app.get('/api/clients/:id', requireAuth, async (req, res) => {
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });
  
  const { data: bookings } = await supabase.from('bookings')
    .select('*, services(name)')
    .eq('client_id', client.id)
    .eq('business_id', req.businessId)
    .order('starts_at', { ascending: false });
    
  const formattedBookings = bookings.map(b => ({ ...b, service_name: b.services.name }));
  res.json({ ...client, bookings: formattedBookings });
});

app.patch('/api/clients/:id', requireAuth, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  const { data: client } = await supabase.from('clients').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!client) return res.status(404).json({ error: 'Not found' });
  
  const { data } = await supabase.from('clients').update({
    name: name ?? client.name,
    email: email ?? client.email,
    phone: phone ?? client.phone,
    notes: notes ?? client.notes
  }).eq('id', client.id).select().single();
  res.json(data);
});

app.get('/api/dashboard/summary', requireAuth, async (req, res) => {
  const businessId = req.businessId;
  const today = new Date().toISOString().slice(0, 10);
  
  const { count: todays } = await supabase.from('bookings').select('id', { count: 'exact' })
    .eq('business_id', businessId).gte('starts_at', `${today}T00:00:00Z`).lte('starts_at', `${today}T23:59:59Z`).neq('status', 'cancelled');
    
  const { count: upcoming } = await supabase.from('bookings').select('id', { count: 'exact' })
    .eq('business_id', businessId).gt('starts_at', new Date().toISOString()).in('status', ['pending', 'confirmed']);
    
  const { data: revData } = await supabase.from('bookings').select('price')
    .eq('business_id', businessId).in('status', ['confirmed', 'completed']);
  const revenue = revData ? revData.reduce((acc, b) => acc + (b.price || 0), 0) : 0;
  
  const { count: clients } = await supabase.from('clients').select('id', { count: 'exact' }).eq('business_id', businessId);
  
  const { data: subscription } = await supabase.from('subscriptions').select('status, plan').eq('business_id', businessId).maybeSingle();
  
  res.json({ todaysAppointments: todays || 0, upcomingBookings: upcoming || 0, revenue, clients: clients || 0, subscriptionStatus: subscription?.status || 'active', plan: subscription?.plan || 'starter' });
});

app.get('/api/billing/status', requireAuth, async (req, res) => {
  const { data: row } = await supabase.from('subscriptions').select('*').eq('business_id', req.businessId).maybeSingle();
  if (!row) return res.json({ status: 'active', plan: 'starter', provider_customer_id: null, provider_subscription_id: null });
  res.json(row);
});

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  const { plan = 'starter' } = req.body;
  const status = 'active';
  
  const { data: record } = await supabase.from('subscriptions').select('*').eq('business_id', req.businessId).maybeSingle();
  if (record) {
    await supabase.from('subscriptions').update({
      plan, status, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}`
    }).eq('business_id', req.businessId);
  } else {
    await supabase.from('subscriptions').insert({
      business_id: req.businessId, plan, status, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}`
    });
  }
  await supabase.from('businesses').update({ subscription_status: status, plan }).eq('id', req.businessId);
  res.json({ status, plan, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}` });
});

app.post('/api/billing/webhook', async (req, res) => {
  const { status, plan } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const id = req.body.businessId || req.headers['x-business-id'];
  if (!id) return res.status(400).json({ error: 'businessId required' });
  
  await supabase.from('businesses').update({ subscription_status: status, plan: plan || 'starter' }).eq('id', id);
  // Insert or update pattern
  const { data: sub } = await supabase.from('subscriptions').select('id').eq('business_id', id).maybeSingle();
  if (sub) {
    await supabase.from('subscriptions').update({ plan: plan || 'starter', status }).eq('business_id', id);
  } else {
    await supabase.from('subscriptions').insert({ business_id: id, plan: plan || 'starter', status });
  }
  res.json({ ok: true });
});

app.post('/api/jobs/reminders', async (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const { data: dueBookings } = await supabase.from('bookings')
    .select('id, business_id, starts_at, client_id, clients(email, phone), services(name)')
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', now.toISOString())
    .lte('starts_at', tomorrow.toISOString());
    
  if (!dueBookings) return res.json({ sent: 0, totalCandidates: 0 });

  let sent = 0;
  for (const booking of dueBookings) {
    const { data: reminder } = await supabase.from('reminders').select('id').eq('booking_id', booking.id).eq('status', 'sent').maybeSingle();
    if (!reminder) {
      await supabase.from('reminders').insert({
        business_id: booking.business_id,
        booking_id: booking.id,
        channel: 'email',
        scheduled_for: booking.starts_at,
        status: 'sent',
        message: `Reminder: ${booking.services.name} on ${booking.starts_at}`
      });
      sent += 1;
    }
  }
  res.json({ sent, totalCandidates: dueBookings.length });
});

// ---------- PUBLIC BOOKING ----------
app.get('/api/public/businesses', async (req, res) => {
  const { data } = await supabase.from('businesses').select('id, name, slug').order('created_at', { ascending: false });
  res.json(data);
});

app.get('/api/public/businesses/:slug', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id, name, slug, timezone').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });
  res.json(b);
});

app.get('/api/public/businesses/:slug/services', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });
  const { data } = await supabase.from('services').select('id, name, duration_minutes, price').eq('business_id', b.id).eq('active', 1);
  res.json(data);
});

app.get('/api/public/businesses/:slug/availability', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });
  const { serviceId, date } = req.query;
  if (!serviceId || !date) return res.status(400).json({ error: 'serviceId and date required' });
  const result = await getAvailableSlots(b.id, serviceId, date);
  res.json(result);
});

app.post('/api/public/businesses/:slug/bookings', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });

  const { serviceId, startsAt, name, email, phone, notes } = req.body;
  if (!serviceId || !startsAt || !name) return res.status(400).json({ error: 'Missing required fields' });

  let client = null;
  if (phone) {
    const { data } = await supabase.from('clients').select('*').eq('business_id', b.id).eq('phone', phone).maybeSingle();
    if (data) client = data;
  }
  if (!client && email) {
    const { data } = await supabase.from('clients').select('*').eq('business_id', b.id).eq('email', email).maybeSingle();
    if (data) client = data;
  }
  if (!client) {
    const { data } = await supabase.from('clients').insert({
      business_id: b.id, name, email: email || null, phone: phone || null, notes: notes || null
    }).select('id').single();
    client = data;
  }

  try {
    const bookingId = await createBookingSafely({ businessId: b.id, serviceId, clientId: client.id, startsAtISO: startsAt });
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    await recordBookingEvent(bookingId, b.id, 'created', { serviceId, clientId: client.id, startsAt });
    res.json(booking);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') return res.status(409).json({ error: 'That slot was just booked by someone else. Please pick another time.' });
    res.status(400).json({ error: err.message });
  }
});

// Export for Vercel Serverless Functions
export default app;

// Fallback for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}
