import { createSandbox } from './src/public-sandbox.js';
const { server } = createSandbox({ pace: Number(process.env.SANDBOX_PACE || 1.5) });
server.listen(Number(process.env.SANDBOX_PORT || 3003), '127.0.0.1', () =>
  console.log('Anonymous Steward sandbox ready. No email adapter. No persistent visitor data.'),
);
