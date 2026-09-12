import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api.billingStatus();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function activate(plan) {
    const result = await api.billingCheckout(plan);
    setStatus(result);
  }

  if (loading) return <div>Loading billing…</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '1.4rem' }}>Billing</h1>
      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontWeight: 600 }}>Current plan</div>
            <div style={{ fontSize: '1.5rem', marginTop: '0.15rem' }}>{status?.plan || 'starter'}</div>
          </div>
          <span className="badge badge-confirmed">{status?.status || 'active'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <PlanCard
          title="Starter"
          price="$0"
          features={['Basic services', 'Single business page', 'Booking management']}
          active={(status?.plan || 'starter') === 'starter'}
          onSelect={() => activate('starter')}
        />
        <PlanCard
          title="Growth"
          price="$29/mo"
          features={['Advanced booking automation', 'Priority reminders', 'CRM insights']}
          active={(status?.plan || 'starter') === 'growth'}
          onSelect={() => activate('growth')}
        />
      </div>
    </div>
  );
}

function PlanCard({ title, price, features, active, onSelect }) {
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: '1.6rem', marginTop: '0.3rem' }}>{price}</div>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--ink-soft)' }}>
        {features.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <button className="btn btn-primary" onClick={onSelect} disabled={active}>
        {active ? 'Active plan' : `Choose ${title}`}
      </button>
    </div>
  );
}
