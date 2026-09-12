import supabase from './db.js';

const SLOT_INTERVAL_MIN = 15;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToDate(dateStr, minutes) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(0, minutes, 0, 0);
  return d;
}

// Two intervals overlap iff existing_start < requested_end AND existing_end > requested_start
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export async function getAvailableSlots(businessId, serviceId, dateStr) {
  const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).eq('business_id', businessId).eq('active', 1).maybeSingle();
  if (!service) return { error: 'Service not found' };

  // Get Day of week. 0=Sun, 1=Mon, etc. (assuming dateStr is local, but doing UTC for simplicity)
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay();
  
  const { data: hours } = await supabase.from('business_hours').select('*').eq('business_id', businessId).eq('day_of_week', dow).eq('enabled', 1).maybeSingle();
  if (!hours) return { slots: [] }; // closed that day

  const dayStartMin = toMinutes(hours.start_time);
  const dayEndMin = toMinutes(hours.end_time);

  const { data: blocked } = await supabase.from('blocked_periods').select('*')
    .eq('business_id', businessId)
    .lte('starts_at', `${dateStr}T23:59:59Z`)
    .gte('ends_at', `${dateStr}T00:00:00Z`);

  const { data: existingBookings } = await supabase.from('bookings').select('*')
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .gte('starts_at', `${dateStr}T00:00:00Z`)
    .lte('starts_at', `${dateStr}T23:59:59Z`);

  const duration = service.duration_minutes;
  const slots = [];
  const now = new Date();

  for (let start = dayStartMin; start + duration <= dayEndMin; start += SLOT_INTERVAL_MIN) {
    const candidateStart = minutesToDate(dateStr, start);
    const candidateEnd = new Date(candidateStart.getTime() + duration * 60000);

    const blockedHit = (blocked || []).some(b =>
      overlaps(candidateStart, candidateEnd, new Date(b.starts_at), new Date(b.ends_at))
    );
    if (blockedHit) continue;

    const bookingHit = (existingBookings || []).some(bk =>
      overlaps(candidateStart, candidateEnd, new Date(bk.starts_at), new Date(bk.ends_at))
    );
    if (bookingHit) continue;

    if (candidateStart < now) continue;

    slots.push(candidateStart.toISOString());
  }

  return { slots, durationMinutes: duration };
}

export async function checkSlotAvailable({ businessId, serviceId, startsAtISO, ignoreBookingId = null }) {
  const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).eq('business_id', businessId).maybeSingle();
  if (!service) throw new Error('Service not found');

  const start = new Date(startsAtISO);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  let query = supabase.from('bookings').select('id')
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .lt('starts_at', end.toISOString())
    .gt('ends_at', start.toISOString());
    
  if (ignoreBookingId) {
    query = query.neq('id', ignoreBookingId);
  }

  const { data: conflict } = await query.maybeSingle();
  if (conflict) throw new Error('SLOT_TAKEN');
  return { start, end };
}

export async function createBookingSafely({ businessId, serviceId, clientId, startsAtISO, ignoreBookingId = null }) {
  const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).eq('business_id', businessId).maybeSingle();
  if (!service) throw new Error('Service not found');

  const start = new Date(startsAtISO);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  // NOTE: In a true concurrent environment with Postgres, you would use an exclusion constraint 
  // or an RPC with SELECT ... FOR UPDATE. Since we are using the REST API for an MVP, we do a fast read-then-write.
  let query = supabase.from('bookings').select('id')
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .lt('starts_at', end.toISOString())
    .gt('ends_at', start.toISOString());
    
  if (ignoreBookingId) query = query.neq('id', ignoreBookingId);

  const { data: conflict } = await query.maybeSingle();
  if (conflict) throw new Error('SLOT_TAKEN');

  const { data: newBooking, error } = await supabase.from('bookings').insert({
    business_id: businessId,
    service_id: serviceId,
    client_id: clientId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: 'confirmed',
    price: service.price
  }).select('id').single();

  if (error) throw new Error(error.message);
  return newBooking.id;
}
