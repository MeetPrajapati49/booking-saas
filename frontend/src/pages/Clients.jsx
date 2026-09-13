import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function Clients() {
  const { business } = useAuth();
  const [clients, setClients] = useState([]);
  const [emailModal, setEmailModal] = useState(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate API call delay
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setEmailModal(null);
    setToast(`Sent booking link to ${emailModal.email}!`);
    setTimeout(() => setToast(''), 3000);
  };

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
                  <button 
                    onClick={() => setEmailModal(client)}
                    className="btn btn-primary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: 'none' }}
                  >
                    Send Booking Link ✉️
                  </button>
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

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', 
          background: 'var(--ink)', color: 'white', 
          padding: '1rem 1.5rem', borderRadius: '12px', 
          boxShadow: 'var(--shadow-lg)', fontWeight: 500,
          animation: 'slideUp 0.3s ease'
        }}>
          {toast}
        </div>
      )}

      {/* Send Email Modal */}
      {emailModal && (
        <div className="modal-backdrop" onClick={() => !sending && setEmailModal(null)}>
          <form 
            className="panel modal-content" 
            onClick={e => e.stopPropagation()} 
            onSubmit={handleSendEmail}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.2rem' }}>Send Booking Link</h2>
            <div className="field">
              <label>To</label>
              <input type="email" value={emailModal.email} readOnly disabled style={{ background: 'rgba(0,0,0,0.02)' }} />
            </div>
            <div className="field">
              <label>Subject</label>
              <input value={`Book your next appointment with ${business?.name}`} readOnly disabled style={{ background: 'rgba(0,0,0,0.02)' }} />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea 
                rows={4} 
                value={`Hi ${emailModal.name},\n\nYou can book your next appointment directly through my booking page here:\n${window.location.origin}/booking/${business?.slug}\n\nThanks!`}
                readOnly 
                disabled 
                style={{ background: 'rgba(0,0,0,0.02)' }} 
              />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEmailModal(null)} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={sending} style={{ minWidth: 100 }}>
                {sending ? <div className="spinner" /> : 'Send Email'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
