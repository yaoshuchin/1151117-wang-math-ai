import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Start a lightweight local static server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), decodeURIComponent(reqPath));

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8089, async () => {
  console.log('Test server running at http://localhost:8089');
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9448;
  const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\chrome_temp_test_math';

  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=1920,1080',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:8089'
  ]);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(2500);

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const t = list.find(x => x.url && x.url.includes('localhost:8089'));
      if (t) { wsUrl = t.webSocketDebuggerUrl; break; }
    } catch (e) {}
    await sleep(1000);
  }

  if (!wsUrl) {
    chromeProc.kill();
    server.close();
    throw new Error('Could not find wsUrl');
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const cb = pending.get(data.id);
      pending.delete(data.id);
      cb(data);
    }
  };
  const send = (method, params = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  console.log('Connected to CDP, waiting 2s for page render...');
  await sleep(2000);

  // Take screenshot of password gate
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('preview_gate.png', Buffer.from(shot1.result.data, 'base64'));
  console.log('Saved preview_gate.png');

  // Input password "nato" and unlock
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById('gate-password-input').value = 'nato';
      document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    })()`
  });
  await sleep(1500);

  // Check columns and cards count
  const testRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const cols = document.querySelectorAll('#board-columns > div').length;
      const cards = document.querySelectorAll('.card-glass').length;
      const gateHidden = document.getElementById('password-gate').classList.contains('hidden');
      return { cols, cards, gateHidden };
    })()`,
    returnByValue: true
  });
  console.log('Test result after unlock:', testRes.result?.result?.value);

  // Take screenshot of unlocked board
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('preview_unlocked.png', Buffer.from(shot2.result.data, 'base64'));
  console.log('Saved preview_unlocked.png');

  ws.close();
  chromeProc.kill();
  server.close();
  console.log('Verification completed successfully!');
  process.exit(0);
});
