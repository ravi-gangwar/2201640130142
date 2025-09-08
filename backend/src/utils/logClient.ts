import axios from 'axios';
const LOG_SERVICE = process.env.LOG_SERVICE_URL || 'http://localhost:3100';

export type Stack = 'backend' | 'frontend';
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export async function log(stack: Stack, level: Level, pkg: string, message: string): Promise<void> {
  try {
    await axios.post(`${LOG_SERVICE}/logs`, { stack, level, package: pkg, message }, { headers: { 'Content-Type': 'application/json' }, timeout: 3000 });
  } catch (e) {
    console.error('log failed');
  }
}


