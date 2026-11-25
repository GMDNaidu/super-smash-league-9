// Super Smash League 9.0 — all-in-one server (no database, no Firebase, no config file).
// Serves the website, streams live scores to every viewer, and only accepts scoring from people who know the PIN.
// Run:  SCORER_PIN=1234 node server.js     (needs Node.js 16 or newer, no npm install)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
let PIN = String(process.env.SCORER_PIN || '');
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const askPin = cb => {
  if (PIN.length >= 4 && PIN !== 'CHANGE-ME-1234') return cb();
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => rl.question('\nChoose a scorer PIN (at least 4 characters, e.g. 4821) and press Enter: ', a => {
    a = a.trim(); if (a.length < 4) { console.log('Too short — try again.'); return ask(); }
    PIN = a; rl.close(); cb();
  });
  ask();
};

let db = { fx: {}, league: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); db.fx = db.fx || {}; db.league = db.league || {}; console.log('Loaded saved scores from', FILE); } catch (e) {}
let ver = 0; const clients = new Set();
const snapshot = () => JSON.stringify({ fx: db.fx, config: db.league.config || null, ver });
let saving = false, again = false;
function save() { if (saving) { again = true; return; } saving = true; fs.writeFile(FILE + '.tmp', JSON.stringify(db), () => fs.rename(FILE + '.tmp', FILE, () => { saving = false; if (again) { again = false; save(); } })); }
function broadcast() { const s = 'data: ' + snapshot() + '\n\n'; clients.forEach(c => c.write(s)); }
const pinOk = p => { const a = Buffer.from(String(p || '')), b = Buffer.from(PIN); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'));
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }); return res.end(INDEX); }
  if (req.method === 'GET' && url === '/api/state') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(snapshot()); }
  if (req.method === 'GET' && url === '/api/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 2000\n\ndata: ' + snapshot() + '\n\n'); clients.add(res);
    const hb = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(hb); clients.delete(res); }); return;
  }
  if (req.method === 'POST' && url === '/api/login') { if (pinOk(req.headers['x-pin'])) return json(res, 200, { ok: true }); return setTimeout(() => json(res, 401, { ok: false }), 600); }
  if (req.method === 'POST' && url === '/api/write') {
    if (!pinOk(req.headers['x-pin'])) return setTimeout(() => json(res, 401, { ok: false }), 600);
    let body = '', big = false;
    req.on('data', d => { body += d; if (body.length > 2e6) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return;
      try {
        const { path: p, data } = JSON.parse(body);
        if (!/^(fx\/[A-Za-z0-9_-]{1,40}|league\/config)$/.test(p) || typeof data !== 'object' || data === null) return json(res, 400, { ok: false });
        const [a, b] = p.split('/'); db[a][b] = data; ver++; save(); broadcast(); json(res, 200, { ok: true });
      } catch (e) { json(res, 400, { ok: false }); }
    }); return;
  }
  res.writeHead(404); res.end('Not found');
});
askPin(() => server.listen(PORT, () => console.log('\nSuper Smash League 9.0 is running →  http://localhost:' + PORT + '\nScorers: open  http://localhost:' + PORT + '/#control  and enter the PIN.\nScores are saved in ' + FILE + '\n')));
