import { Router } from 'express';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const businessId = req.businessId;
  const today = new Date().toISOString().slice(0, 10);
  
  const { count: todays } = await supabase.from('bookings').select('id', { count: 'exact' })
    .eq('business_id', businessId).gte('starts_at', `${today}T00:00:00Z`).lte('starts_at', `${today}T23:59:59Z`).neq('status', 'cancelled');
    
  const { count: upcoming } = await supabase.from('bookings').select('id', { count: 'exact' })
    .eq('business_id', businessId).gt('starts_at', new Date().toISOString()).in('status', ['pending', 'confirmed']);
    
  const { data: revData } = await supabase.from('bookings').select('price')
    .eq('business_id', businessId).in('status', ['confirmed', 'completed']);
  const revenue = revData ? revData.reduce((acc, b) => acc + (b.price || 0), 0) : 0;
  
  const { count: clients } = await supabase.from('clients').select('id', { count: 'exact' }).eq('business_id', businessId);
  
  const { data: subscription } = await supabase.from('subscriptions').select('status, plan').eq('business_id', businessId).maybeSingle();
  
  res.json({ todaysAppointments: todays || 0, upcomingBookings: upcoming || 0, revenue, clients: clients || 0, subscriptionStatus: subscription?.status || 'active', plan: subscription?.plan || 'starter' });
});

export default router;
