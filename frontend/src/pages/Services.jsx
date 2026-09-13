import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Services() {
  const queryClient = useQueryClient();
  const { data: services = [], isLoading } = useQuery({ queryKey: ['services'], queryFn: api.services });
  const [form, setForm] = useState({ name: '', durationMinutes: 30, price: 0 });
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (payload) => api.createService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setForm({ name: '', durationMinutes: 30, price: 0 });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => api.updateService(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    saveMutation.mutate({ name: form.name, durationMinutes: Number(form.durationMinutes), price: Number(form.price) });
  }

  async function toggleActive(s) {
    toggleMutation.mutate({ id: s.id, active: s.active ? 0 : 1 });
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Services</h1>

      <form onSubmit={handleSave} className="panel" style={{ marginBottom: '1.4rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
