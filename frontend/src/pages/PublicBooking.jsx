import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function PublicBooking() {
  const { slug } = useParams();
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 service, 2 time, 3 details, 4 confirmed
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const b = await api.publicBusiness(slug);
        setBusiness(b);
        const svcs = await api.publicServices(slug);
        setServices(svcs);
      } catch (e) {
        setError('This booking page could not be found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!selectedService) return;
    setSlots([]);
    setSelectedSlot(null);
    setSlotsLoading(true);
    api.publicAvailability(slug, selectedService.id, date)
      .then((r) => setSlots(r.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedService, date, slug]);

  async function submitBooking(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const booking = await api.publicCreateBooking(slug, {
        serviceId: selectedService.id,
        startsAt: selectedSlot,
        ...form,
      });
      setConfirmedBooking(booking);
      setStep(4);
    } catch (err) {
      setError(err.message);
      // slot was taken by someone else — refresh availability
      if (err.message.includes('slot')) {
        const r = await api.publicAvailability(slug, selectedService.id, date);
        setSlots(r.slots || []);
        setSelectedSlot(null);
        setStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenteredMessage>Loading booking page…</CenteredMessage>;
  if (error && !business) return <CenteredMessage>{error}</CenteredMessage>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '4rem 1.5rem 2.5rem',
        maxWidth: 720,
        width: '100%',
        margin: '0 auto'
      }}>
        <h1 style={{ fontSize: '2.8rem', letterSpacing: '-0.02em', fontWeight: 500, lineHeight: 1.1 }}>{business.name}</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: '1rem', fontSize: '1.1rem' }}>Book an appointment in a couple of taps.</p>
      </header>

      <main style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '0 1.5rem 5rem' }}>
        <Steps step={step} />

        {step === 1 && (
          <div className="panel" style={{ marginTop: '1.4rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Choose a service</h2>
            {services.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>No services published yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {services.map((s) => (
                <button
                  key={s.id}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', padding: '0.9rem 1rem', textAlign: 'left' }}
                  onClick={() => { setSelectedService(s); setStep(2); }}
                >
                  <span>
                    <strong>{s.name}</strong>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                      {s.duration_minutes} min
                    </span>
                  </span>
                  <span>₹{s.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedService && (
          <div className="panel" style={{ marginTop: '1.4rem' }}>
            <button className="btn btn-ghost" style={{ padding: 0, marginBottom: '0.8rem' }} onClick={() => setStep(1)}>← Change service</button>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.9rem' }}>{selectedService.name} — pick a time</h2>
            <div className="field">
              <label>Date</label>
              <input type="date" min={todayISODate()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {slotsLoading ? (
              <p style={{ color: 'var(--ink-soft)' }}>Checking availability...</p>
            ) : slots.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)' }}>No slots available this day — try another date.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '0.5rem' }}>
                {slots.map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary"
                    style={selectedSlot === s ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
                    onClick={() => setSelectedSlot(s)}
                  >
                    {formatTime(s)}
                  </button>
                ))}
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: '1.2rem', width: '100%' }} disabled={!selectedSlot} onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <form className="panel" style={{ marginTop: '1.4rem' }} onSubmit={submitBooking}>
            <button type="button" className="btn btn-ghost" style={{ padding: 0, marginBottom: '0.8rem' }} onClick={() => setStep(2)}>← Change time</button>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.9rem' }}>Your details</h2>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginTop: '-0.4rem', marginBottom: '1rem' }}>
              {selectedService.name} · {new Date(selectedSlot).toLocaleDateString()} at {formatTime(selectedSlot)}
            </p>
            <div className="field">
              <label>Full name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </form>
        )}

        {step === 4 && confirmedBooking && (
          <div className="panel" style={{ marginTop: '1.4rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.6rem' }}>You're booked</h2>
            <p style={{ color: 'var(--ink-soft)' }}>
              {selectedService.name} on {new Date(confirmedBooking.starts_at).toLocaleDateString()} at {formatTime(confirmedBooking.starts_at)}
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              A confirmation would normally be sent to your phone or email.
            </p>
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedSlot(null);
                setConfirmedBooking(null);
                setForm({ name: '', email: '', phone: '', notes: '' });
              }}
            >
              Book another appointment
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Steps({ step }) {
  const labels = ['Service', 'Time', 'Details', 'Done'];
  return (
    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
      {labels.map((l, i) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.85rem', fontWeight: 600,
            color: step >= i + 1 ? 'var(--ink)' : 'var(--ink-soft)',
          }}>
            {i + 1}. {l}
          </span>
        </div>
      ))}
    </div>
  );
}

function CenteredMessage({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
      {children}
    </div>
  );
}
