import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export function Signup() {
  const [form, setForm] = useState({ businessName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.signup(form);
      login(res.token, res.business);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set up your business" subtitle="Create your booking page in under a minute.">
      <form onSubmit={submit}>
        <div className="field">
          <label>Business name</label>
          <input required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
      </p>
    </AuthShell>
  );
}

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(form);
      login(res.token, res.business);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your bookings.">
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
        New here? <Link to="/signup" style={{ color: 'var(--accent)' }}>Create an account</Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="panel" style={{ width: 380 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{title}</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
