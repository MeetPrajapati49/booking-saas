import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const links = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/calendar', label: 'Calendar' },
  { to: '/dashboard/bookings', label: 'Bookings' },
  { to: '/dashboard/clients', label: 'Clients' },
  { to: '/dashboard/services', label: 'Services' },
  { to: '/dashboard/hours', label: 'Hours' },
  { to: '/dashboard/billing', label: 'Billing' },
];

import { useState } from 'react';

export default function DashboardLayout() {
  const { business, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/booking/${business?.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 250, borderRight: '1px solid var(--line)', padding: '2rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--paper-raised)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{business?.name}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
            <a
              href={`/booking/${business?.slug}`}
              target="_blank" rel="noreferrer"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
            >
              View ↗
            </a>
            <button 
              className="btn btn-primary" 
              onClick={handleCopyLink}
              style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: isActive ? 'var(--accent-hover)' : 'var(--ink-soft)',
                background: isActive ? 'var(--paper)' : 'transparent',
                transition: 'all 0.2s ease'
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-ghost" style={{ marginTop: 'auto', justifyContent: 'flex-start', padding: '0.4rem 0.6rem' }}
          onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </button>
      </aside>
      <main style={{ flex: 1, padding: '2rem 2.4rem', maxWidth: 900 }}>
        <Outlet />
      </main>
    </div>
  );
}
