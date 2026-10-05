import { readFileSync, readdirSync, statSync } from 'node:fs';
const secrets = [];
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^(AGENTMAIL_API_KEY|APPROVAL_EMAIL|APPROVAL_SECRET)=(.*)$/);
    if (m) {
      const v = m[2].trim().replace(/^['"]|['"]$/g, '');
      if (v.length > 8) secrets.push(v);
    }
  }
} catch {}
const origin = process.env.STEWARD_TEST_URL;
let count = 0;
const scan = (data) => {
  count++;
  if (secrets.some((s) => data.includes(s)) || /am_us_inbox_[a-f0-9]{30,}/.test(data))
    throw Error('Private configuration found; release blocked. Values withheld.');
};
for (const root of ['public', 'src']) {
  const walk = (p) => {
    for (const name of readdirSync(p)) {
      const path = p + '/' + name;
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|html|css|json|ts)$/.test(name)) scan(readFileSync(path, 'utf8'));
    }
  };
  walk(root);
}
if (origin) {
  for (const route of ['/', '/life.js', '/connections.js', '/life.css', '/sandbox/app.js']) {
    const r = await fetch(origin + route);
    if (!r.ok) throw Error('Public asset unavailable');
    scan(await r.text());
  }
  for (const route of ['/.env', '/presentation', '/api/runs', '/approve', '/.git/config'])
    if ((await fetch(origin + route)).status !== 404) throw Error('Private route exposed');
}
console.log(`PASS: ${count} source/public assets checked. No configured private values exposed.`);
