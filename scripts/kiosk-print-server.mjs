/**
 * שרת הדפסה מקומי — מדפיס למדפסת ברירת מחדל בלי חלון Chrome.
 * מאזין רק ב-127.0.0.1 (מחשב הקיוסק).
 */
import http from 'http';
import { printKioskTicket } from '../server/kioskPrint.js';

const PORT = Number(process.env.KIOSK_PRINT_PORT || 39123);
const HOST = '127.0.0.1';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 512_000) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, platform: process.platform }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    if (process.platform !== 'win32') {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Windows only' }));
      return;
    }
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      await printKioskTicket(
        payload.ticket,
        payload.settings || {},
        payload.reception_room || null
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      console.log(`[print] ticket ${payload.ticket?.display_code || payload.ticket?.id}`);
    } catch (e) {
      console.error('[print]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`MedQueue local print → http://${HOST}:${PORT}`);
  console.log('Default Windows printer, no Chrome dialog.');
  if (process.platform !== 'win32') {
    console.warn('Warning: printing works on Windows only.');
  }
});
