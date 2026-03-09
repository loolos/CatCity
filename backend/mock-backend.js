import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer((req, res) => {
  const url = req.url?.split('?')[0] ?? '/';

  if (url === '/' || url === '') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'Cat City Mock Backend',
        endpoints: {
          '/health': 'GET - Health check',
          '/api/config': 'GET - Game config',
        },
      }),
    );
    return;
  }

  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'catcity-mock-backend' }));
    return;
  }

  if (url === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        gameName: 'Cat City MVP',
        mapSize: 7,
        mode: 'single-player-mock',
      }),
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[catcity-backend] running on http://localhost:${PORT}`);
  console.log('[catcity-backend] available endpoints: /health, /api/config');
});
