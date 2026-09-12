const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/me', { auth: true }),

  services: () => request('/api/services', { auth: true }),
  createService: (payload) => request('/api/services', { method: 'POST', body: payload, auth: true }),
  updateService: (id, payload) => request(`/api/services/${id}`, { method: 'PATCH', body: payload, auth: true }),

  hours: () => request('/api/hours', { auth: true }),
  updateHours: (id, payload) => request(`/api/hours/${id}`, { method: 'PATCH', body: payload, auth: true }),

  bookings: () => request('/api/bookings', { auth: true }),
  updateBooking: (id, payload) => request(`/api/bookings/${id}`, { method: 'PATCH', body: payload, auth: true }),
  rescheduleBooking: (id, payload) => request(`/api/bookings/${id}/reschedule`, { method: 'POST', body: payload, auth: true }),

  clients: (q) => request(q ? `/api/clients?q=${encodeURIComponent(q)}` : '/api/clients', { auth: true }),
  clientById: (id) => request(`/api/clients/${id}`, { auth: true }),
  updateClient: (id, payload) => request(`/api/clients/${id}`, { method: 'PATCH', body: payload, auth: true }),

  summary: () => request('/api/dashboard/summary', { auth: true }),
  billingStatus: () => request('/api/billing/status', { auth: true }),
  billingCheckout: (plan) => request('/api/billing/checkout', { method: 'POST', body: { plan }, auth: true }),
  reminders: () => request('/api/jobs/reminders', { method: 'POST', auth: true }),

  publicBusinesses: () => request('/api/public/businesses'),
  publicBusiness: (slug) => request(`/api/public/businesses/${slug}`),
  publicServices: (slug) => request(`/api/public/businesses/${slug}/services`),
  publicAvailability: (slug, serviceId, date) =>
    request(`/api/public/businesses/${slug}/availability?serviceId=${serviceId}&date=${date}`),
  publicCreateBooking: (slug, payload) =>
    request(`/api/public/businesses/${slug}/bookings`, { method: 'POST', body: payload }),
};
