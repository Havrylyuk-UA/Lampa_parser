import { getCatalog } from '../lib/uaserial.js';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const page = Number(req.query.page || 1);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const items = await getCatalog(page, q);
    res.status(200).json(items);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}