import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { log as logClient } from './utils/logClient';
import { createShortUrlRouter } from './routes/shorturls';

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const log = async (stack: any, level: any, pkg: any, message: any) => logClient(stack, level, pkg, message);

(async () => { await log('backend', 'info', 'config', 'server boot'); })();

// Mongo connection
const mongoUri = process.env.MONGODB_URI as string;
if (!mongoUri) {
  console.error('MONGODB_URI missing in env');
}

mongoose.connect(mongoUri).then(async () => {
  await log('backend', 'info', 'db', 'mongo connected');
}).catch(async (e) => {
  await log('backend', 'fatal', 'db', `mongo connect fail: ${e.message}`);
});

app.use('/shorturls', createShortUrlRouter(log));

app.get('/health', async (_req, res) => {
  await log('backend', 'debug', 'route', 'health');
  res.json({ ok: true });
});

app.listen(3000, async () => {
  await log('backend', 'info', 'config', 'listening 3000');
  console.log('server running on 3000');
});


