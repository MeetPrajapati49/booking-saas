const seed = async () => {
  console.log('Seeding demo data...');

  // 1. Barber Shop
  let res = await fetch('http://localhost:4000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: "Joe's Barber Shop", email: 'joe@example.com', password: 'password123' })
  });
  let data = await res.json();
  if (data.token) {
    console.log("Created Joe's Barber Shop");
    await fetch('http://localhost:4000/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
      body: JSON.stringify({ name: 'Haircut', durationMinutes: 30, price: 2500 })
    });
    await fetch('http://localhost:4000/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
      body: JSON.stringify({ name: 'Beard Trim', durationMinutes: 15, price: 1500 })
    });
  }

  // 2. Yoga Studio
  res = await fetch('http://localhost:4000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: "Zen Yoga Studio", email: 'yoga@example.com', password: 'password123' })
  });
  data = await res.json();
  if (data.token) {
    console.log("Created Zen Yoga Studio");
    await fetch('http://localhost:4000/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
      body: JSON.stringify({ name: 'Private Session', durationMinutes: 60, price: 8000 })
    });
  }

  console.log('Done!');
};

seed().catch(console.error);
