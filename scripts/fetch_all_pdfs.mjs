import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9455;
const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\chrome_temp_pdf_fetch';

const wishes = [
  { id: 'math_curriculum', name: '數學領綱.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/R7dXadK7kndlW6bl' },
  { id: 'math_content_analysis', name: '數學領域課程手冊_國小篇.pdf', wishUrl: 'https://u1.padletusercontent.com/uploads/padlet-uploads-usc1/1726799469/e98ffac955193bddcb1c6d4869219462/_________________p_29_p.391pdf?download=1', isDirect: true },
  { id: 'transition_analysis', name: '202605-各年級數學學習銜接問題分析.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/zV61Q6E5ewRRaO98' },
  { id: 'g2_apply', name: '202605篩選測驗結果運用-G2.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/E1P8aXrKVzx3ZwA9' },
  { id: 'g4_apply', name: '202605篩選測驗結果運用-G4.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/J24jalRLJnD4Z0A1' },
  { id: 'g5_apply', name: '202605篩選測驗結果運用-G5.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/kxodWG5mVnoEQgP7' },
  { id: 'content_context', name: '基本學習內容脈絡.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/wKmOZ5KyVwkXazMA' },
  { id: 'g1_content', name: '一年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/Ae2Rav7EBb84Qnz4' },
  { id: 'g2_content', name: '二年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/XGyBQb3KzM8gZL6K' },
  { id: 'g3_content', name: '三年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/j40PQD7PVmNeavXB' },
  { id: 'g4_content', name: '四年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/lkROZP9jBNLXWjMg' },
  { id: 'g5_content', name: '五年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/zV61Q6E5ewOGaO98' },
  { id: 'g6_content', name: '六年級基本學習內容.pdf', wishUrl: 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq/wish/PR3NWxyKVDe7ab0O' }
];

fs.mkdirSync('assets/pdf', { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Starting Chrome for PDF extraction...');
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq'
  ]);

  await sleep(3000);

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
  console.log('Connected to CDP.');

  const pdfMapping = {};

  for (const item of wishes) {
    const localDest = path.join('assets', 'pdf', item.name);
    console.log(`\nProcessing: ${item.name}...`);

    if (item.isDirect) {
      try {
        console.log(`Downloading direct: ${item.wishUrl.substring(0, 80)}...`);
        await downloadFile(item.wishUrl, localDest);
        console.log(`  -> Saved ${localDest} (${fs.statSync(localDest).size} bytes)`);
        pdfMapping[item.id] = { name: item.name, localPath: `assets/pdf/${encodeURIComponent(item.name)}` };
        continue;
      } catch (e) {
        console.error(`Direct download failed: ${e.message}`);
      }
    }

    // Navigate to wish URL
    await send('Page.navigate', { url: item.wishUrl });
    await sleep(4000);

    // Extract iframe src or download links
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        let pdfUrl = '';
        const iframe = document.querySelector('iframe[src*="pdf-viewer"]');
        if (iframe && iframe.src) {
          const match = iframe.src.match(/url=([^&]+)/);
          if (match) pdfUrl = decodeURIComponent(match[1]);
        }
        if (!pdfUrl) {
          const a = document.querySelector('a[href*=".pdf"], a[href*="download=1"]');
          if (a) pdfUrl = a.href;
        }
        return pdfUrl;
      })()`,
      returnByValue: true
    });

    let pdfUrl = res.result?.result?.value;
    if (pdfUrl) {
      console.log(`  Found PDF URL: ${pdfUrl.substring(0, 90)}...`);
      try {
        await downloadFile(pdfUrl, localDest);
        console.log(`  -> Saved ${localDest} (${fs.statSync(localDest).size} bytes)`);
        pdfMapping[item.id] = { name: item.name, localPath: `assets/pdf/${encodeURIComponent(item.name)}`, url: pdfUrl };
      } catch (e) {
        console.error(`  Download error for ${item.name}: ${e.message}`);
      }
    } else {
      console.warn(`  Could not find PDF URL on page: ${item.wishUrl}`);
    }
  }

  fs.writeFileSync('scripts/pdf_mapping.json', JSON.stringify(pdfMapping, null, 2), 'utf-8');
  console.log('\nPDF download and mapping completed!');

  ws.close();
  chromeProc.kill();
}

main().catch(console.error);
