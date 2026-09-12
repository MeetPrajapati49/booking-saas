// Seeds two demo tenants so a reviewer can immediately see tenant isolation
// and a populated booking page without manual setup.
// Run: npm run seed  (server does not need to be running)

import bcrypt from 'bcryptjs';
import db from './db.js';

const uuid = () => crypto.randomUUID();

function seedBusiness(name, slug, email, services) {
  const existing = db.prepare('SELECT id FROM businesses WHERE slug = ?').get(slug);
  if (existing) { console.log(`Skipping ${slug} (already exists)`); return existing.id; }

  const id = uuid();
  const hash = bcrypt.hashSync('demo1234', 10);
  db.prepare('INSERT INTO businesses (id, owner_email, password_hash, name, slug) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, hash, name, slug);

  const insertHours = db.prepare(
    'INSERT INTO business_hours (id, business_id, day_of_week, start_time, end_time, enabled) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (let dow = 0; dow <= 6; dow++) {
    insertHours.run(uuid(), id, dow, '10:00', '18:00', dow === 0 ? 0 : 1);
  }

  const insertService = db.prepare(
    'INSERT INTO services (id, business_id, name, duration_minutes, price) VALUES (?, ?, ?, ?, ?)'
  );
  for (const s of services) insertService.run(uuid(), id, s.name, s.duration, s.price);

  console.log(`Seeded ${name} -> /booking/${slug} (login: ${email} / demo1234)`);
  return id;
}

seedBusiness('Glow Hair Studio', 'glow-hair-studio', 'owner@glowhair.demo', [
  { name: 'Haircut', duration: 30, price: 300 },
  { name: 'Hair Coloring', duration: 90, price: 1500 },
  { name: "Men's Trim", duration: 20, price: 150 },
]);

seedBusiness('Bright Smile Dental', 'bright-smile-dental', 'owner@brightsmile.demo', [
  { name: 'Consultation', duration: 20, price: 200 },
  { name: 'Cleaning', duration: 45, price: 800 },
]);

console.log('\nSeed complete.');
