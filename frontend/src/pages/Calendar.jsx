import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Calendar() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.bookings().then(setBookings);
  }, []);

  // Group bookings by date string (YYYY-MM-DD)
  const grouped = bookings.reduce((acc, b) => {
    const dateObj = new Date(b.starts_at);
    const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(b);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>Calendar</h1>
      
      {sortedDates.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No bookings to display.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {sortedDates.map(date => (
            <div key={date} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--accent)', borderBottom: '1px solid var(--line)', paddingBottom: '0.6rem', marginBottom: '0.2rem' }}>
                {date}
              </h2>
              {grouped[date].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).map(b => (
                <div 
                  key={b.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.5)', 
                    padding: '0.8rem', 
                    borderRadius: '8px', 
                    borderLeft: `4px solid ${b.status === 'confirmed' ? 'var(--accent)' : b.status === 'completed' ? 'var(--teal)' : 'var(--line)'}`
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{new Date(b.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>{b.client_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.2rem' }}>{b.service_name}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
