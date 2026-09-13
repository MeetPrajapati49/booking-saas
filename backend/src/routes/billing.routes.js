import { Router } from 'express';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/status', requireAuth, async (req, res) => {
  const { data: row } = await supabase.from('subscriptions').select('*').eq('business_id', req.businessId).maybeSingle();
  if (!row) return res.json({ status: 'active', plan: 'starter', provider_customer_id: null, provider_subscription_id: null });
  res.json(row);
});

router.post('/checkout', requireAuth, async (req, res) => {
  const { plan = 'starter' } = req.body;
  const status = 'active';
  
  const { data: record } = await supabase.from('subscriptions').select('*').eq('business_id', req.businessId).maybeSingle();
  if (record) {
    await supabase.from('subscriptions').update({
      plan, status, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}`
    }).eq('business_id', req.businessId);
  } else {
    await supabase.from('subscriptions').insert({
      business_id: req.businessId, plan, status, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}`
    });
  }
  await supabase.from('businesses').update({ subscription_status: status, plan }).eq('id', req.businessId);
  res.json({ status, plan, provider_customer_id: `cust_${req.businessId.slice(0, 10)}`, provider_subscription_id: `sub_${req.businessId.slice(0, 10)}` });
});

router.post('/webhook', async (req, res) => {
  const { status, plan } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const id = req.body.businessId || req.headers['x-business-id'];
  if (!id) return res.status(400).json({ error: 'businessId required' });
  
  await supabase.from('businesses').update({ subscription_status: status, plan: plan || 'starter' }).eq('id', id);
  // Insert or update pattern
  const { data: sub } = await supabase.from('subscriptions').select('id').eq('business_id', id).maybeSingle();
  if (sub) {
    await supabase.from('subscriptions').update({ plan: plan || 'starter', status }).eq('business_id', id);
  } else {
    await supabase.from('subscriptions').insert({ business_id: id, plan: plan || 'starter', status });
  }
  res.json({ ok: true });
});

export default router;
