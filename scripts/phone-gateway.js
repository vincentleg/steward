import http from 'node:http';

// Expose only the signed phone approval surface through the free public tunnel.
// Desktop run creation and event state stay on localhost.
const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const allowed =
    path === '/approve' ||
    path === '/style.css' ||
    path === '/api/health' ||
    /^\/fonts\/[a-z0-9-]+\.woff2$/.test(path);
  if (!allowed || !['GET', 'POST', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: Number(process.env.PORT || 3000),
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Steward is reconnecting. Please try again.');
  });
  req.pipe(upstream);
});
server.listen(3002, '127.0.0.1', () => console.log('Phone approval gateway ready.'));
