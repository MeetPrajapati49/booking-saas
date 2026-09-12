import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Overview() {
  const [summary, setSummary] = useState(null);

  useEffect(() => { api.summary().then(setSummary); }, []);

  const cards = summary ? [
    { label: "Today's appointments", value: summary.todaysAppointments },
    { label: 'Upcoming bookings', value: summary.upcomingBookings },
    { label: 'Revenue (confirmed+)', value: `₹${summary.revenue}` },
    { label: 'Clients', value: summary.clients },
  ] : [];

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {cards.map((c) => (
          <div key={c.label} className="panel">
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginTop: '0.3rem' }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
