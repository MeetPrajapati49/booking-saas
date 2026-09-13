import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';
import { checkSlotAvailable } from '../availability.js';

const router = Router();
router.use(requireAuth);

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
});

const rescheduleSchema = z.object({
  startsAt: z.string().refine(v => !isNaN(new Date(v).getTime()), { message: 'Invalid ISO date string' })
});

async function recordBookingEvent(bookingId, businessId, eventType, metadata = {}) {
  await supabase.from('booking_events').insert({
    booking_id: bookingId,
    business_id: businessId,
    event_type: eventType,
    metadata
  });
}

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('bookings')
    .select(`
      *,
      services (name),
      clients (name, phone)
    `)
    .eq('business_id', req.businessId)
    .order('starts_at', { ascending: false });
    
  if (error) throw error;
  
  const formatted = data.map(b => ({
    ...b,
    service_name: b.services.name,
    client_name: b.clients.name,
    client_phone: b.clients.phone
  }));
  res.json(formatted);
});

router.patch('/:id', async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  const { data, error } = await supabase.from('bookings').update({ status }).eq('id', booking.id).select().single();
  if (error) throw error;
  
  await recordBookingEvent(booking.id, req.businessId, `status:${status}`, { previousStatus: booking.status, newStatus: status });
  res.json(data);
});

router.post('/:id/reschedule', async (req, res) => {
  const { startsAt } = rescheduleSchema.parse(req.body);
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!booking) return res.status(404).json({ error: 'Not found' });

  const { data: service } = await supabase.from('services').select('id, duration_minutes, price').eq('id', booking.service_id).eq('business_id', req.businessId).single();
  if (!service) return res.status(404).json({ error: 'Service not found' });

  try {
    const candidate = await checkSlotAvailable({
      businessId: req.businessId,
      serviceId: booking.service_id,
      startsAtISO: startsAt,
      ignoreBookingId: booking.id,
    });
    const { data, error } = await supabase.from('bookings').update({
      starts_at: candidate.start.toISOString(),
      ends_at: candidate.end.toISOString(),
      status: 'confirmed'
    }).eq('id', booking.id).select().single();
    
    if (error) throw error;
    
    await recordBookingEvent(booking.id, req.businessId, 'rescheduled', { previousStartsAt: booking.starts_at, newStartsAt: candidate.start.toISOString() });
    res.json(data);
  } catch (err) {
    if (err.message === 'SLOT_TAKEN') {
      return res.status(409).json({ error: 'That slot is no longer available.' });
    }
    throw err;
  }
});

export default router;
