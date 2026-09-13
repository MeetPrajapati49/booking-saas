import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const updateSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format').optional(),
  enabled: z.number().min(0).max(1).optional()
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('business_hours').select('*').eq('business_id', req.businessId).order('day_of_week');
  if (error) throw error;
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const { startTime, endTime, enabled } = updateSchema.parse(req.body);
  const { data: row } = await supabase.from('business_hours').select('*').eq('id', req.params.id).eq('business_id', req.businessId).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { data, error } = await supabase.from('business_hours').update({
    start_time: startTime ?? row.start_time,
    end_time: endTime ?? row.end_time,
    enabled: enabled ?? row.enabled
  }).eq('id', row.id).select().single();
  if (error) throw error;
  res.json(data);
});

export default router;
