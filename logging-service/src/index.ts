import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

const BASE_URL = 'http://20.244.56.144/evaluation-service';

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

type AuthBody = {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
};

let token: string | null = null;
let expiresAt: number | null = null;

async function getFetch(): Promise<typeof fetch> {
  // @ts-ignore
  if (typeof fetch !== 'undefined') return fetch as any;
  const mod = await import('node-fetch');
  return (mod.default as unknown) as typeof fetch;
}

function loadAuthFromEnv(): AuthBody {
  const required = ['EMAIL','NAME','ROLL_NO','ACCESS_CODE','CLIENT_ID','CLIENT_SECRET'] as const;
  const env: Record<string,string> = {};
  for (const key of required) {
    const v = process.env[key];
    if (!v) throw new Error(`Missing ${key} in env`);
    env[key] = v;
  }
  return {
    email: env.EMAIL,
    name: env.NAME,
    rollNo: env.ROLL_NO,
    accessCode: env.ACCESS_CODE,
    clientID: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
  };
}

async function ensureToken() {
  const now = Math.floor(Date.now() / 1000);
  if (token && expiresAt && expiresAt - now > 15) return token;
  const { data } = await axios.post(`${BASE_URL}/auth`, loadAuthFromEnv(), { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
  token = data.access_token;
  expiresAt = now + (data.expires_in ?? 300);
  return token!;
}

app.post('/token', async (_req, res) => {
  try {
    const t = await ensureToken();
    return res.json({ token: t, expiresAt });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/logs', async (req, res) => {
  try {
    const payload = req.body as { stack: string; level: string; package: string; message: string };
    const t = await ensureToken();
    const { status, data } = await axios.post(`${BASE_URL}/logs`, payload, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, timeout: 5000 });
    return res.status(status).json(data);
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

app.listen(3100, () => {
  console.log('logging-service on 3100');
});


