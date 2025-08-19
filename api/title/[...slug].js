import { getDetails } from '../../lib/uaserial.js';

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const slugArr = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug];
    const slug = slugArr.filter(Boolean).join('/');
    const data = await getDetails(slug);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
}