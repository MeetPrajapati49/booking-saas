import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import supabase from '../db.js';
import { signToken } from '../auth.js';

const router = Router();

const signupSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

router.post('/signup', async (req, res) => {
  const { businessName, email, password } = signupSchema.parse(req.body);

  const { data: existing } = await supabase.from('businesses').select('id').eq('owner_email', email).single();
  if (existing) return res.status(409).json({ error: 'Account already exists' });

  let slug = slugify(businessName);
  let suffix = 0;
  while (true) {
    const checkSlug = suffix ? `${slug}-${suffix}` : slug;
    const { data: s } = await supabase.from('businesses').select('id').eq('slug', checkSlug).maybeSingle();
    if (!s) {
      slug = checkSlug;
      break;
    }
    suffix++;
  }

  const hash = bcrypt.hashSync(password, 10);
  const { data: newBusiness, error: bErr } = await supabase.from('businesses').insert({
    owner_email: email,
    password_hash: hash,
    name: businessName,
    slug,
    subscription_status: 'active',
    plan: 'starter'
  }).select().single();

  if (bErr) throw bErr;

  await supabase.from('subscriptions').insert({
    business_id: newBusiness.id,
    plan: 'starter',
    status: 'active'
  });

  const hours = [];
  for (let dow = 0; dow <= 6; dow++) {
    hours.push({
      business_id: newBusiness.id,
      day_of_week: dow,
      start_time: '10:00',
      end_time: '18:00',
      enabled: dow === 0 ? 0 : 1
    });
  }
  await supabase.from('business_hours').insert(hours);

  res.json({ 
    token: signToken(newBusiness), 
    business: { id: newBusiness.id, name: businessName, slug, subscription_status: 'active', plan: 'starter' } 
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { data: business } = await supabase.from('businesses').select('*').eq('owner_email', email).maybeSingle();
  if (!business || !bcrypt.compareSync(password, business.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ 
    token: signToken(business), 
    business: { id: business.id, name: business.name, slug: business.slug, subscription_status: business.subscription_status, plan: business.plan } 
  });
});

export default router;
