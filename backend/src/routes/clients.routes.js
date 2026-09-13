import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')), 
  phone: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal(''))
});

router.get('/', async (req, res) => {
  const q = req.query.q;
  let query = supabase.from('clients').select('*').eq('business_id', req.businessId).order('created_at', { ascending: false });
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data: client, error: cErr } = await supabase.from('clients').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (cErr) throw cErr;
  if (!client) return res.status(404).json({ error: 'Not found' });
  
  const { data: bookings, error: bErr } = await supabase.from('bookings')
    .select('*, services(name)')
    .eq('client_id', client.id)
    .eq('business_id', req.businessId)
    .order('starts_at', { ascending: false });
  if (bErr) throw bErr;
    
  const formattedBookings = bookings.map(b => ({ ...b, service_name: b.services.name }));
  res.json({ ...client, bookings: formattedBookings });
});

router.patch('/:id', async (req, res) => {
  const { name, email, phone, notes } = updateSchema.parse(req.body);
  const { data: client, error: cErr } = await supabase.from('clients').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (cErr) throw cErr;
  if (!client) return res.status(404).json({ error: 'Not found' });
  
  const { data, error } = await supabase.from('clients').update({
    name: name ?? client.name,
    email: email ?? client.email,
    phone: phone ?? client.phone,
    notes: notes ?? client.notes
  }).eq('id', client.id).select().single();
  if (error) throw error;
  
  res.json(data);
});

export default router;
