import http from 'node:http';

import 'dotenv/config';

import { createApp } from './app.js';
import { env } from './src/config/env.js';
import { initSocket } from './src/realtime/socket.js';
import { startOrderExpiryJob } from './src/jobs/orderExpiry.job.js';

const app = createApp();
const server = http.createServer(app);

initSocket(server);
startOrderExpiryJob();

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = (signal) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
