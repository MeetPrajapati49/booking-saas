import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const links = [
  { to: '/dashboard', label: 'Overview', end: true, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg> },
  { to: '/dashboard/calendar', label: 'Calendar', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  { to: '/dashboard/bookings', label: 'Bookings', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> },
  { to: '/dashboard/clients', label: 'Clients', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { to: '/dashboard/services', label: 'Services', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
  { to: '/dashboard/hours', label: 'Hours', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { to: '/dashboard/billing', label: 'Billing', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M1 10h22"/></svg> },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {l.icon}
                {l.label}
              </div>
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
