import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';
import { config as loadEnv } from 'dotenv';
import googleAuthHandler from '../api/auth/google.js';
import logoutHandler from '../api/auth/logout.js';
import meHandler from '../api/me.js';
import collectionsHandler from '../api/collections.js';
import collectionHandler from '../api/collection.js';
import collectionCardHandler from '../api/collection-card.js';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const PORT = Number(process.env.API_PORT || 3001);

const routes = new Map([
  ['/api/auth/google', googleAuthHandler],
  ['/api/auth/logout', logoutHandler],
  ['/api/me', meHandler],
  ['/api/collections', collectionsHandler],
  ['/api/collection', collectionHandler],
  ['/api/collection-card', collectionCardHandler]
]);

function addJsonHelpers(res) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.json = function json(payload) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  res.send = function send(payload) {
    if (typeof payload === 'object' && payload !== null) {
      res.json(payload);
      return;
    }
    res.end(String(payload ?? ''));
  };
}

const server = http.createServer(async (req, res) => {
  addJsonHelpers(res);

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const handler = routes.get(url.pathname);

  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not found.' }));
    return;
  }

  try {
    await handler(req, res);
    if (!res.writableEnded) res.end();
  } catch (error) {
    console.error(error);
    if (res.writableEnded) return;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Internal server error.' }));
  }
});

server.listen(PORT, () => {
  console.info(`Local API server running on http://localhost:${PORT}`);
});
