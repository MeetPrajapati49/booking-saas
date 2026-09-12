import db from './db.js';

const SLOT_INTERVAL_MIN = 15;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToDate(dateStr, minutes) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMinutes(minutes);
  return d;
}

// Two intervals overlap iff existing_start < requested_end AND existing_end > requested_start
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Returns available start times (ISO strings) for a given business/service/date.
 * Mirrors the algorithm in the spec: hours -> blocked periods -> existing
 * bookings -> candidate generation -> rejection filters.
 */
export function getAvailableSlots(businessId, serviceId, dateStr) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ? AND active = 1')
    .get(serviceId, businessId);
  if (!service) return { error: 'Service not found' };

  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  const hours = db.prepare(
    'SELECT * FROM business_hours WHERE business_id = ? AND day_of_week = ? AND enabled = 1'
  ).get(businessId, dow);
  if (!hours) return { slots: [] }; // closed that day

  const dayStartMin = toMinutes(hours.start_time);
  const dayEndMin = toMinutes(hours.end_time);

  const blocked = db.prepare(
    `SELECT * FROM blocked_periods WHERE business_id = ? AND date(starts_at) <= date(?) AND date(ends_at) >= date(?)`
  ).all(businessId, dateStr, dateStr);

  const existingBookings = db.prepare(
    `SELECT * FROM bookings WHERE business_id = ? AND date(starts_at) = date(?) AND status NOT IN ('cancelled')`
  ).all(businessId, dateStr);

  const duration = service.duration_minutes;
  const slots = [];

  for (let start = dayStartMin; start + duration <= dayEndMin; start += SLOT_INTERVAL_MIN) {
    const candidateStart = minutesToDate(dateStr, start);
    const candidateEnd = minutesToDate(dateStr, start + duration);

    const blockedHit = blocked.some(b =>
      overlaps(candidateStart, candidateEnd, new Date(b.starts_at), new Date(b.ends_at))
    );
    if (blockedHit) continue;

    const bookingHit = existingBookings.some(bk =>
      overlaps(candidateStart, candidateEnd, new Date(bk.starts_at), new Date(bk.ends_at))
    );
    if (bookingHit) continue;

    // Don't offer slots in the past
    if (candidateStart < new Date()) continue;

    slots.push(candidateStart.toISOString());
  }

  return { slots, durationMinutes: duration };
}

export function checkSlotAvailable({ businessId, serviceId, startsAtISO, ignoreBookingId = null }) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ?').get(serviceId, businessId);
  if (!service) throw new Error('Service not found');

  const start = new Date(startsAtISO);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const conflict = db.prepare(
    `SELECT id FROM bookings
     WHERE business_id = ?
     AND status NOT IN ('cancelled')
     AND (? IS NULL OR id != ?)
     AND starts_at < ? AND ends_at > ?`
  ).get(businessId, ignoreBookingId, ignoreBookingId, end.toISOString(), start.toISOString());

  if (conflict) throw new Error('SLOT_TAKEN');
  return { start, end };
}

/**
 * Server-side re-check + atomic insert. Uses a SQLite transaction as the
 * concurrency-safe boundary (the spec's requirement for "transaction,
 * exclusion constraint, or advisory lock"). In Postgres/Supabase this would
 * be a transaction with a SELECT ... FOR UPDATE or an exclusion constraint
 * on (business_id, starts_at, ends_at).
 */
export function createBookingSafely({ businessId, serviceId, clientId, startsAtISO, ignoreBookingId = null }) {
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND business_id = ?').get(serviceId, businessId);
  if (!service) throw new Error('Service not found');

  const start = new Date(startsAtISO);
  const end = new Date(start.getTime() + service.duration_minutes * 60000);

  const run = db.transaction(() => {
    const conflict = db.prepare(
      `SELECT id FROM bookings
       WHERE business_id = ?
       AND status NOT IN ('cancelled')
       AND (? IS NULL OR id != ?)
       AND starts_at < ? AND ends_at > ?`
    ).get(businessId, ignoreBookingId, ignoreBookingId, end.toISOString(), start.toISOString());

    if (conflict) {
      throw new Error('SLOT_TAKEN');
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO bookings (id, business_id, service_id, client_id, starts_at, ends_at, status, price)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`
    ).run(id, businessId, serviceId, clientId, start.toISOString(), end.toISOString(), service.price);

    return id;
  });

  return run();
}
