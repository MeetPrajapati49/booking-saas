import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Landing() {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    api.publicBusinesses().then(setBusinesses).catch(console.error);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
      <div style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.8rem' }}>Bookings, handled.</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.8rem' }}>
          A booking page and appointment dashboard for salons, clinics, and studios.
        </p>
        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginBottom: '4rem' }}>
          <Link to="/signup" className="btn btn-primary">Create your business</Link>
          <Link to="/login" className="btn btn-secondary">Log in</Link>
        </div>

        {businesses.length > 0 && (
          <div style={{ textAlign: 'left', marginTop: '2rem', padding: '2rem', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Demo Directory (Available Shops)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {businesses.map((b) => (
                <Link key={b.id} to={`/booking/${b.slug}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--ink)' }}>
                  <strong>{b.name}</strong>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>/booking/{b.slug} &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
