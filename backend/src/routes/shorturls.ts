import { Router } from 'express';
import { nanoid } from 'nanoid';
import { ShortUrl } from '../models/ShortUrl';
import { log as logClient } from '../utils/logClient';

export function createShortUrlRouter(_log: any) {
  const router = Router();

  router.post('/', async (req, res) => {
    await logClient('backend', 'info', 'route', 'POST /shorturls');
    try {
      const { url, validity, shortcode } = req.body || {};
      if (typeof url !== 'string') {
        await logClient('backend', 'error', 'handler', 'invalid url');
        return res.status(400).json({ message: 'url required' });
      }
      const minutes = Number.isInteger(validity) ? validity : 30;
      const code = typeof shortcode === 'string' && shortcode.length > 0 ? shortcode : nanoid(6);
      const existing = await ShortUrl.findOne({ shortCode: code }).lean();
      if (existing) {
        await logClient('backend', 'warn', 'repository', 'shortcode collision');
        return res.status(409).json({ message: 'shortcode already exists' });
      }
      const now = new Date();
      const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);
      const doc = await ShortUrl.create({ shortCode: code, longUrl: url, createdAt: now, expiresAt });
      await logClient('backend', 'info', 'service', 'short url created');
      const host = `${req.protocol}://${req.get('host')}`;
      return res.status(201).json({ shortLink: `${host}/${code}`, expiry: expiresAt.toISOString() });
    } catch (e: any) {
      await logClient('backend', 'error', 'handler', `error creating short url: ${e.message}`);
      return res.status(500).json({ message: 'internal error' });
    }
  });

  router.get('/:code', async (req, res) => {
    const code = req.params.code;
    const doc = await ShortUrl.findOne({ shortCode: code });
    if (!doc) return res.status(404).json({ message: 'not found' });
    const stats = {
      clicks: doc.clicks,
      url: doc.longUrl,
      createdAt: doc.createdAt,
      expiry: doc.expiresAt,
      clicksDetail: doc.clicksDetail,
    };
    return res.json(stats);
  });

  // Redirect endpoint: GET /code -> 302 to long URL and increment click
  router.get('/r/:code', async (req, res) => {
    const code = req.params.code;
    const doc = await ShortUrl.findOne({ shortCode: code });
    if (!doc) return res.status(404).send('Not found');
    if (doc.expiresAt.getTime() < Date.now()) return res.status(410).send('Link expired');
    doc.clicks += 1;
    const detail: { ts: Date; referer?: string; ip?: string } = { ts: new Date() };
    const ref = req.get('referer');
    if (ref) detail.referer = ref;
    const ipAddr = (req.ip as string | undefined) || (req.headers['x-forwarded-for'] as string | undefined);
    if (ipAddr) detail.ip = ipAddr;
    doc.clicksDetail.push(detail);
    await doc.save();
    await logClient('backend', 'info', 'handler', `redirect ${code}`);
    return res.redirect(302, doc.longUrl);
  });

  // Dashboard: list URLs with pagination
  router.get('/', async (req, res) => {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '10'), 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ShortUrl.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ShortUrl.countDocuments({})
    ]);
    return res.json({ page, limit, total, items });
  });

  // Dashboard: summary stats
  router.get('/stats/summary', async (_req, res) => {
    const now = new Date();
    const total = await ShortUrl.countDocuments({});
    const active = await ShortUrl.countDocuments({ expiresAt: { $gt: now } });
    const expired = total - active;
    const clicksAgg = await ShortUrl.aggregate([
      { $group: { _id: null, clicks: { $sum: '$clicks' } } }
    ]);
    const clicks = clicksAgg[0]?.clicks || 0;
    return res.json({ total, active, expired, clicks });
  });

  return router;
}


