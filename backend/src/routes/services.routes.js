import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  durationMinutes: z.number().positive(),
  price: z.number().nonnegative().optional().default(0)
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  durationMinutes: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
  active: z.number().optional()
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('services').select('*').eq('business_id', req.businessId).order('created_at');
  if (error) throw error;
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, durationMinutes, price } = createSchema.parse(req.body);
  const { data, error } = await supabase.from('services').insert({
    business_id: req.businessId,
    name,
    duration_minutes: durationMinutes,
    price
  }).select().single();
  if (error) throw error;
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { name, durationMinutes, price, active } = updateSchema.parse(req.body);
  const { data: svc } = await supabase.from('services').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!svc) return res.status(404).json({ error: 'Not found' });
  
  const { data, error } = await supabase.from('services').update({
    name: name ?? svc.name,
    duration_minutes: durationMinutes ?? svc.duration_minutes,
    price: price ?? svc.price,
    active: active ?? svc.active
  }).eq('id', svc.id).select().single();
  if (error) throw error;
  res.json(data);
});

export default router;
