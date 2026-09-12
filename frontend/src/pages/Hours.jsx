import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Hours() {
  const [hours, setHours] = useState([]);

  function refresh() { api.hours().then((h) => setHours(h.sort((a, b) => a.day_of_week - b.day_of_week))); }
  useEffect(refresh, []);

  async function update(h, patch) {
    await api.updateHours(h.id, patch);
    refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Working hours</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '1.4rem', fontSize: '0.9rem' }}>
        Availability shown to clients is generated from these hours, minus existing bookings and blocked time.
      </p>
      <div className="panel">
        {hours.map((h) => (
          <div key={h.id} style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0',
            borderBottom: '1px solid var(--line)',
          }}>
            <label style={{ width: 110, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <input type="checkbox" checked={!!h.enabled} onChange={(e) => update(h, { enabled: e.target.checked ? 1 : 0 })} />
              {DAYS[h.day_of_week]}
            </label>
            <input type="time" value={h.start_time} disabled={!h.enabled}
              onChange={(e) => update(h, { startTime: e.target.value })} />
            <span style={{ color: 'var(--ink-soft)' }}>to</span>
            <input type="time" value={h.end_time} disabled={!h.enabled}
              onChange={(e) => update(h, { endTime: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}
