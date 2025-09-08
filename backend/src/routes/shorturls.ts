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
      // Return simple top-level short link; '/r/:code' is also supported
      return res.status(201).json({ shortLink: `${host}/${code}`, expiry: expiresAt.toISOString() });
    } catch (e: any) {
      await logClient('backend', 'error', 'handler', `error creating short url: ${e.message}`);
      return res.status(500).json({ message: 'internal error' });
    }
  });

  return router;
}

