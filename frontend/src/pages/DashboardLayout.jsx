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

export default function DashboardLayout() {
  const { business, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, borderRight: '1px solid var(--line)', padding: '1.5rem 1.2rem',
        display: 'flex', flexDirection: 'column', gap: '1.6rem', background: 'var(--paper-raised)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{business?.name}</div>
          <a
            href={`/booking/${business?.slug}`}
            target="_blank" rel="noreferrer"
            style={{ fontSize: '0.78rem', color: 'var(--accent)' }}
          >
            View booking page ↗
          </a>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                padding: '0.5rem 0.6rem',
                borderRadius: 6,
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
                background: isActive ? '#f4ead9' : 'transparent',
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
