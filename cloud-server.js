import { createSandbox } from './src/public-sandbox.js';

// Public cloud entry point imports no private LIVE server or communication adapter.
for (const name of ['AGENTMAIL_API_KEY', 'APPROVAL_EMAIL', 'APPROVAL_SECRET']) {
  if (process.env[name])
    throw Error('Private LIVE configuration is prohibited in the public service');
}
const port = Number(process.env.PORT || 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid public port');
const origin = process.env.RENDER_EXTERNAL_URL || process.env.SANDBOX_PUBLIC_URL;
if (!origin || new URL(origin).protocol !== 'https:') throw Error('Public HTTPS origin required');
const { server } = createSandbox({
  publicBaseUrl: new URL(origin).origin,
  rateLimitKey: () => 'public-global',
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.listen(port, '0.0.0.0', () => console.log('STEWARD public sandbox ready'));
const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
