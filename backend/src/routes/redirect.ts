import { Router } from 'express';
import { ShortUrl } from '../models/ShortUrl';

export function createRedirectRouter() {
  const router = Router();
  const reserved = new Set(['shorturls', 'health']);


  router.get('/:code', async (req, res) => {
    const code = req.params.code;
    if (reserved.has(code)) return res.status(404).send('Not found');
    const doc = await ShortUrl.findOne({ shortCode: code });
    if (!doc) return res.status(404).send('Not found');
    if (doc.expiresAt.getTime() < Date.now()) return res.status(410).send('Link expired');
    doc.clicks += 1;
    doc.clicksDetail.push({ ts: new Date() });
    await doc.save();
    return res.redirect(302, doc.longUrl);
  });

  return router;
}


