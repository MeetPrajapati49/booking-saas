import supabase from './src/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const seed = async () => {
  console.log('Seeding directly to Supabase...');

  const hash = bcrypt.hashSync('password123', 10);
  
  const { data: b1, error: err1 } = await supabase.from('businesses').insert({
    owner_email: 'joe@example.com',
    password_hash: hash,
    name: "Joe's Barber Shop",
    slug: 'joes-barber-shop',
    subscription_status: 'active',
    plan: 'starter'
  }).select().single();

  if (err1) {
    console.error('Error creating Joe:', err1.message);
  } else {
    console.log("Created Joe's Barber Shop");
    await supabase.from('services').insert([
      { business_id: b1.id, name: 'Haircut', duration_minutes: 30, price: 2500 },
      { business_id: b1.id, name: 'Beard Trim', duration_minutes: 15, price: 1500 }
    ]);
    const hours = [];
    for (let dow = 0; dow <= 6; dow++) {
      hours.push({ business_id: b1.id, day_of_week: dow, start_time: '10:00', end_time: '18:00', enabled: dow === 0 ? 0 : 1 });
    }
    await supabase.from('business_hours').insert(hours);
  }

  const { data: b2, error: err2 } = await supabase.from('businesses').insert({
    owner_email: 'yoga@example.com',
    password_hash: hash,
    name: "Zen Yoga Studio",
    slug: 'zen-yoga-studio',
    subscription_status: 'active',
    plan: 'starter'
  }).select().single();

  if (err2) {
    console.error('Error creating Yoga:', err2.message);
  } else {
    console.log("Created Zen Yoga Studio");
    await supabase.from('services').insert([
      { business_id: b2.id, name: 'Private Session', duration_minutes: 60, price: 8000 }
    ]);
    const hours2 = [];
    for (let dow = 0; dow <= 6; dow++) {
      hours2.push({ business_id: b2.id, day_of_week: dow, start_time: '08:00', end_time: '20:00', enabled: 1 });
    }
    await supabase.from('business_hours').insert(hours2);
  }

  console.log('Done!');
};

seed().catch(console.error);
