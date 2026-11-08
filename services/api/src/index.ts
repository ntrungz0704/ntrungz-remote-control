import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app';

const app = buildApp();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`Ntrungz Remote Control API running at: ${address}`);
  console.log(`Healthcheck: ${address}/api/v1/health`);
});
