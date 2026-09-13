import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db.js';
import { getAvailableSlots, checkSlotAvailable, createBookingSafely } from '../availability.js';

const router = Router();

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  startsAt: z.string().refine(v => !isNaN(new Date(v).getTime())),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional()
});

async function recordBookingEvent(bookingId, businessId, eventType, metadata = {}) {
  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    business_id: businessId,
    event_type: eventType,
    metadata
  });
}

router.get('/businesses', async (req, res) => {
  const { data, error } = await supabase.from('businesses').select('id, name, slug').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
});

router.get('/businesses/:slug', async (req, res) => {
  const { data: b, error } = await supabase.from('businesses').select('id, name, slug, timezone').eq('slug', req.params.slug).maybeSingle();
  if (error) throw error;
  if (!b) return res.status(404).json({ error: 'Business not found' });
  res.json(b);
});

router.get('/businesses/:slug/services', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });
  const { data, error } = await supabase.from('services').select('id, name, duration_minutes, price').eq('business_id', b.id).eq('active', 1);
  if (error) throw error;
  res.json(data);
});

router.get('/businesses/:slug/availability', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });
  const { serviceId, date } = req.query;
  if (!serviceId || !date) return res.status(400).json({ error: 'serviceId and date required' });
  const result = await getAvailableSlots(b.id, serviceId, date);
  res.json(result);
});

router.post('/businesses/:slug/bookings', async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id').eq('slug', req.params.slug).maybeSingle();
  if (!b) return res.status(404).json({ error: 'Business not found' });

  const { serviceId, startsAt, name, email, phone, notes } = bookingSchema.parse(req.body);

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
    const { data, error } = await supabase.from('clients').insert({
      business_id: b.id, name, email: email || null, phone: phone || null, notes: notes || null
    }).select('id').single();
    if (error) throw error;
    client = data;
  }

  try {
    const bookingId = await createBookingSafely({ businessId: b.id, serviceId, clientId: client.id, startsAtISO: startsAt });
    const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (error) throw error;
    await recordBookingEvent(bookingId, b.id, 'created', { serviceId, clientId: client.id, startsAt });
    res.json(booking);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') return res.status(409).json({ error: 'That slot was just booked by someone else. Please pick another time.' });
    throw err;
  }
});

export default router;
