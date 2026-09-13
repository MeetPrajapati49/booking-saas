import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const NEXT_ACTIONS = {
  pending: [['confirmed', 'Confirm'], ['cancelled', 'Cancel']],
  confirmed: [['completed', 'Mark completed'], ['no_show', 'No-show'], ['cancelled', 'Cancel']],
  completed: [],
  cancelled: [],
  no_show: [],
};

export default function Bookings() {
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ['bookings'], queryFn: api.bookings });
  
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleAt, setRescheduleAt] = useState('');

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateBooking(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startsAt }) => api.rescheduleBooking(id, { startsAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setRescheduleId(null);
      setRescheduleAt('');
    }
  });

  if (isLoading) return <p style={{ color: 'var(--ink-soft)' }}>Loading bookings...</p>;

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Bookings</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {bookings.map((b) => (
          <div key={b.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <strong>{b.client_name}</strong>{b.client_phone ? ` · ${b.client_phone}` : ''}
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                {b.service_name} · {new Date(b.starts_at).toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span>
              {NEXT_ACTIONS[b.status]?.map(([status, label]) => (
                <button key={status} className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ id: b.id, status })}>
                  {label}
                </button>
              ))}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                onClick={() => { setRescheduleId(b.id); setRescheduleAt(new Date(b.starts_at).toISOString().slice(0, 16)); }}
              >
                Reschedule
              </button>
            </div>
            {rescheduleId === b.id && (
              <div style={{ width: '100%', display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-primary" disabled={rescheduleMutation.isPending} onClick={() => rescheduleMutation.mutate({ id: b.id, startsAt: rescheduleAt })}>Save</button>
              </div>
            )}
          </div>
        ))}
        {bookings.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No bookings yet.</p>}
      </div>
    </div>
  );
}
