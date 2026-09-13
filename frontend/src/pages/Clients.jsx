import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function Clients() {
  const { business } = useAuth();
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');

  function refresh(search = '') {
    api.clients(search).then(setClients).catch(() => setClients([]));
  }

  useEffect(() => { refresh(); }, []);

  const onSearch = (e) => {
    const value = e.target.value;
    setQ(value);
    refresh(value);
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Clients</h1>
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Search customers</label>
          <input value={q} onChange={onSearch} placeholder="Name, email or phone" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {clients.map((client) => (
          <div key={client.id} className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong>{client.name}</strong>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                  {client.email || 'No email'} · {client.phone || 'No phone'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-confirmed">CRM</span>
                {client.email && business && (
                  <a 
                    href={`mailto:${client.email}?subject=Book your next appointment with ${encodeURIComponent(business.name)}&body=Hi ${encodeURIComponent(client.name)},%0D%0A%0D%0AYou can book your next appointment directly through my booking page here:%0D%0A${encodeURIComponent(window.location.origin + '/booking/' + business.slug)}%0D%0A%0D%0AThanks!`}
                    className="btn btn-primary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    Send Booking Link ✉️
                  </a>
                )}
              </div>
            </div>
            {client.notes && (
              <p style={{ margin: '0.8rem 0 0', fontSize: '0.86rem', color: 'var(--ink-soft)' }}>{client.notes}</p>
            )}
          </div>
        ))}
        {clients.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No clients found for this business yet.</p>}
      </div>
    </div>
  );
}
