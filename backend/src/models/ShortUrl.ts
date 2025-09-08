import mongoose, { Schema, Document } from 'mongoose';

export interface ShortUrlDoc extends Document {
  shortCode: string;
  longUrl: string;
  createdAt: Date;
  expiresAt: Date;
  clicks: number;
  clicksDetail: Array<{ ts: Date; referer?: string; ip?: string; country?: string }>
}

const ShortUrlSchema = new Schema<ShortUrlDoc>({
  shortCode: { type: String, required: true, unique: true, index: true },
  longUrl: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true },
  clicks: { type: Number, default: 0 },
  clicksDetail: [{ ts: Date, referer: String, ip: String, country: String }],
});

export const ShortUrl = mongoose.model<ShortUrlDoc>('ShortUrl', ShortUrlSchema);


