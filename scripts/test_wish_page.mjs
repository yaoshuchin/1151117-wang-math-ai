import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/R7dXadK7kndlW6bl';
const port = 9452;
const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\chrome_temp_wish_test';

const chromeProc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--headless=new',
  targetUrl
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  await sleep(2500);
  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const t = list.find(x => x.url && x.url.includes('padlet.com'));
      if (t) { wsUrl = t.webSocketDebuggerUrl; break; }
    } catch (e) {}
    await sleep(1000);
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
  console.log('Connected! Waiting 5s for wish modal...');
  await sleep(5000);

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find all links in document
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href,
        text: a.innerText.trim(),
        download: a.getAttribute('download'),
        title: a.getAttribute('title') || a.getAttribute('aria-label')
      }));

      // Look for iframes or embeds
      const iframes = Array.from(document.querySelectorAll('iframe, embed, object')).map(el => ({
        tag: el.tagName,
        src: el.src || el.data
      }));

      return {
        title: document.title,
        links: links.filter(l => l.href && !l.href.includes('/t4132/ai-s025ja7zuuls1v9vilvq#')),
        iframes
      };
    })()`,
    returnByValue: true
  });

  console.log('Wish Page Result:', JSON.stringify(evalRes.result?.result?.value, null, 2));

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);
