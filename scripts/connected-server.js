import { PrivateStore } from '../src/connected/store.js';
import { privateSurface } from '../src/connected/http.js';
import { createSandbox } from '../src/public-sandbox.js';
import { GoogleSensor } from '../src/connected/google.js';
import { ConnectedObserver } from '../src/connected/observer.js';
import { mkdirSync } from 'node:fs';

// Local harness of the SAME product router, with the private surface explicitly composed.
// Production keeps that surface disabled pending durable storage and live release gates.
if (process.env.RENDER || process.env.RENDER_SERVICE_ID)
  throw Error('Connected deployment requires reviewed durable storage; disabled on Render');
const key = Buffer.from(process.env.CONNECTION_ENCRYPTION_KEY || '', 'base64');
if (key.length !== 32) throw Error('CONNECTION_ENCRYPTION_KEY must be configured');
mkdirSync('.data', { recursive: true });
const store = new PrivateStore({ filename: '.data/connected.sqlite', encryptionKey: key });
const port = Number(process.env.CONNECTED_PORT || 3406);
const origin = process.env.CONNECTED_ORIGIN || `http://localhost:${port}`;
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? new GoogleSensor({
        store,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        origin,
      })
    : null;
const observer = google ? new ConnectedObserver({ store, google }) : null;
const { server } = createSandbox({
  publicBaseUrl: origin,
  privateSurface: privateSurface({ store, google, observer, origin }),
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '127.0.0.1', () =>
  console.log('STEWARD private development server ready; public deployment unchanged'),
);
const timer = setInterval(async () => {
  if (!observer) return;
  const users = store.db.prepare('SELECT DISTINCT owner FROM connections').all();
  for (const { owner } of users)
    for (const provider of ['calendar', 'gmail'])
      if (store.connection(owner, provider)) {
        try {
          await observer.sync(owner, provider);
        } catch {
          /* Private UI exposes degraded status, never provider content. */
        }
      }
}, 120000);
timer.unref();
function stop() {
  clearInterval(timer);
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
