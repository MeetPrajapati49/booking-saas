import express from 'express';
import cors from 'cors';
import 'express-async-errors';

import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import hoursRoutes from './routes/hours.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import billingRoutes from './routes/billing.routes.js';
import publicRoutes from './routes/public.routes.js';

import { errorHandler } from './middlewares/errorHandler.js';
import supabase from './db.js';
import { requireAuth } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/hours', hoursRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/public', publicRoutes);

// Single endpoint that didn't fit easily in other files
app.get('/api/me', requireAuth, async (req, res) => {
  const { data: b } = await supabase.from('businesses').select('id, name, slug, timezone, subscription_status, plan').eq('id', req.businessId).single();
  res.json(b);
});

app.post('/api/jobs/reminders', async (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const { data: dueBookings } = await supabase.from('bookings')
    .select('id, business_id, starts_at, client_id, clients(email, phone), services(name)')
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', now.toISOString())
    .lte('starts_at', tomorrow.toISOString());
    
  if (!dueBookings) return res.json({ sent: 0, totalCandidates: 0 });

  let sent = 0;
  for (const booking of dueBookings) {
    const { data: reminder } = await supabase.from('reminders').select('id').eq('booking_id', booking.id).eq('status', 'sent').maybeSingle();
    if (!reminder) {
      await supabase.from('reminders').insert({
        business_id: booking.business_id,
        booking_id: booking.id,
        channel: 'email',
        scheduled_for: booking.starts_at,
        status: 'sent',
        message: `Reminder: ${booking.services.name} on ${booking.starts_at}`
      });
      sent += 1;
    }
  }
  res.json({ sent, totalCandidates: dueBookings.length });
});

// Centralized Error Handler must be the last middleware
app.use(errorHandler);

// Export for Vercel Serverless Functions
export default app;

// Fallback for local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}
