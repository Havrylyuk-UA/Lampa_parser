import { getDetails } from '../lib/uaserial.js';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const slug = typeof req.query.slug === 'string'
      ? req.query.slug
      : Array.isArray(req.query.slug) ? req.query.slug.join('/') : '';
    if (!slug) return res.status(400).json({ error: 'Missing slug. Use /api/title?slug=<path>' });
    const data = await getDetails(slug);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}