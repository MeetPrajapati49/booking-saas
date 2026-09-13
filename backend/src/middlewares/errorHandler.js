export function errorHandler(err, req, res, next) {
  console.error(err);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  // Handle custom application errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Handle Supabase/DB errors
  if (err.code && err.message && err.details !== undefined) {
    return res.status(500).json({ error: 'Database error occurred' });
  }

  res.status(500).json({ error: 'Internal server error' });
}
