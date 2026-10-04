import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';
const url = new URL('/sandbox', process.env.PUBLIC_BASE_URL);
if (url.protocol !== 'https:') throw new Error('A public HTTPS URL is required');
mkdirSync('.data', { recursive: true });
const options = {
  errorCorrectionLevel: 'H',
  margin: 4,
  color: { dark: '#161b27', light: '#ffffff' },
};
writeFileSync('.data/sandbox-qr.svg', await QRCode.toString(url.href, { ...options, type: 'svg' }));
await QRCode.toFile('.data/sandbox-qr.png', url.href, { ...options, width: 700 });
writeFileSync(
  '.data/TRY-STEWARD.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Try STEWARD</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f7fb;color:#161b27;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center}.poster{width:min(1300px,100%);padding:70px;display:grid;grid-template-columns:1.25fr 1fr;gap:90px;align-items:center}.brand{font-size:27px;font-weight:bold;letter-spacing:5px}.label{font-size:11px;color:#3450df;letter-spacing:2px;margin-top:70px}h1{font-size:65px;font-weight:400;letter-spacing:-3px;line-height:1.1;margin:25px 0}em{font-style:normal;color:#3450df}p{color:#606b7b;font-size:18px;line-height:1.7}.note{font-size:11px;margin-top:45px;letter-spacing:1px}.card{background:#ffffff;color:#161b27;padding:35px;border-radius:10px;text-align:center}.card img{width:100%;display:block}.card h2{font-weight:400;font-size:28px;letter-spacing:-1px}.card p{color:#606b7b;font-size:12px}.card a{color:#161b27;font-size:11px;text-decoration:none;overflow-wrap:anywhere}footer{font-size:9px;letter-spacing:1.5px;color:#606b7b;margin-top:65px}@media(max-width:700px){.poster{padding:30px;grid-template-columns:1fr;gap:30px}h1{font-size:44px}.label{margin-top:40px}}</style><div class="poster"><div><div class="brand">STEWARD</div><div class="label">PERSONAL OUTCOME RECOVERY</div><h1>One decision.<br><em>Your life, handled.</em></h1><p>Agents execute tasks.<br>Steward restores outcomes.</p><p class="note">NO ACCOUNT · NO EMAIL · NO CONNECTED ACCOUNTS<br>SYNTHETIC WORLD · PRIVATE SESSION</p><footer>WHEN PLANS BREAK, STEWARD FIXES THEM.</footer></div><div class="card"><img src="/sandbox/qr.svg" alt="Scan to try Steward"><h2>Try Steward yourself.</h2><p>Scan. Approve one decision. Watch it finish.</p><a href="${url.href}">${url.host}/sandbox</a></div></div></html>`,
);
console.log('Public sandbox QR, PNG and share poster generated in ignored local artifacts.');
