import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Services() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', durationMinutes: 30, price: 0 });
  const [error, setError] = useState('');

  function refresh() { api.services().then(setServices); }
  useEffect(refresh, []);

  async function addService(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createService(form);
      setForm({ name: '', durationMinutes: 30, price: 0 });
      refresh();
    } catch (err) { setError(err.message); }
  }

  async function toggleActive(s) {
    await api.updateService(s.id, { active: s.active ? 0 : 1 });
    refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Services</h1>

      <form onSubmit={addService} className="panel" style={{ marginBottom: '1.4rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ marginBottom: 0, flex: '1 1 160px' }}>
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0, width: 120 }}>
          <label>Duration (min)</label>
          <input type="number" min={5} required value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
        </div>
        <div className="field" style={{ marginBottom: 0, width: 120 }}>
          <label>Price (₹)</label>
          <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </div>
        <button className="btn btn-primary">Add service</button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {services.map((s) => (
          <div key={s.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{s.name}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{s.duration_minutes} min · ₹{s.price}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => toggleActive(s)}>
              {s.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
        {services.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No services yet — add your first one above.</p>}
      </div>
    </div>
  );
}
