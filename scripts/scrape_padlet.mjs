import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://padlet.com/t4132/ai-s025ja7zuuls1v9vilvq';
const port = 9445;
const userDataDir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\chrome_temp_profile_math';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Launching Chrome to inspect ${targetUrl}...`);
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=12000,4000',
    '--no-first-run',
    '--no-default-browser-check',
    targetUrl
  ]);

  await sleep(3000);

  let wsUrl = '';
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const t = list.find(x => x.url && x.url.includes('padlet.com'));
      if (t) {
        wsUrl = t.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
    await sleep(1000);
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Could not find wsUrl for Padlet');
  }

  console.log(`Connected to Chrome WebSocket: ${wsUrl}`);
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

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  console.log('Waiting 10 seconds for page to hydrate...');
  await sleep(10000);

  // Set device metrics to ultrawide
  await send('Emulation.setDeviceMetricsOverride', {
    width: 12000,
    height: 4000,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Scroll across horizontal containers to force render
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const els = Array.from(document.querySelectorAll('*')).filter(el => el.scrollWidth > el.clientWidth && el.clientWidth > 300);
      for (const el of els) {
        for (let x = 0; x <= el.scrollWidth; x += 600) {
          el.scrollLeft = x;
          await new Promise(r => setTimeout(r, 80));
        }
        el.scrollLeft = 0;
      }
      window.scrollTo(0, 0);
    })()`,
    awaitPromise: true
  });
  await sleep(3000);

  // Extract HTML
  const htmlRes = await send('Runtime.evaluate', {
    expression: 'document.documentElement.outerHTML',
    returnByValue: true
  });
  const html = htmlRes.result?.result?.value || '';
  fs.writeFileSync('scripts/padlet_raw.html', html, 'utf-8');
  console.log(`Saved scripts/padlet_raw.html, length: ${html.length}`);

  // Extract structured board data
  const dataRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.title;
      const boardTitle = document.querySelector('[data-testid="padlet-title"]')?.innerText?.trim() 
        || document.querySelector('h1')?.innerText?.trim() 
        || document.title;
      const boardDesc = document.querySelector('[data-testid="padlet-description"]')?.innerText?.trim() 
        || document.querySelector('[class*="description"]')?.innerText?.trim() || '';

      // Wallpaper / Background
      let wallpaperUrl = '';
      let bgColor = '';
      const bodyStyle = window.getComputedStyle(document.body);
      bgColor = bodyStyle.backgroundColor;
      if (bodyStyle.backgroundImage && bodyStyle.backgroundImage.includes('url')) {
        const match = bodyStyle.backgroundImage.match(/url\\(["']?([^"']+)["']?\\)/);
        if (match) wallpaperUrl = match[1];
      }
      if (!wallpaperUrl) {
        const surfaceEl = document.querySelector('[class*="surface"]');
        if (surfaceEl) {
          const sStyle = window.getComputedStyle(surfaceEl);
          if (sStyle.backgroundImage && sStyle.backgroundImage.includes('url')) {
            const match = sStyle.backgroundImage.match(/url\\(["']?([^"']+)["']?\\)/);
            if (match) wallpaperUrl = match[1];
          }
        }
      }

      // Check Pinia stores or global padlet data
      let piniaDump = null;
      try {
        if (window.__PINIA__) {
          const stores = window.__PINIA__._s || {};
          piniaDump = {};
          for (const [k, v] of stores.entries ? stores.entries() : Object.entries(stores)) {
            try {
              piniaDump[k] = JSON.parse(JSON.stringify(v.$state || {}));
            } catch (e) {}
          }
        }
      } catch (e) {}

      // Section titles
      const sectionHeaderEls = Array.from(document.querySelectorAll('[data-testid="sectionTitleText"], [class*="section-title"], [class*="section_title"]'));
      
      // Extract columns/sections from DOM
      // Find all column wrappers
      const colWrappers = Array.from(document.querySelectorAll('[data-testid*="section"], [class*="surface-column"], [class*="surface-section"], [class*="column-wrapper"]'));

      const sections = [];
      const seenTitles = new Set();

      // Collect sections
      for (const st of sectionHeaderEls) {
        const secTitle = st.innerText.trim();
        if (!secTitle || seenTitles.has(secTitle)) continue;
        seenTitles.add(secTitle);

        // Find enclosing column container
        let container = st;
        for (let i = 0; i < 12; i++) {
          if (container.parentElement) {
            container = container.parentElement;
            if (container.getAttribute('data-testid')?.includes('section') || 
                container.className?.includes('column') || 
                container.className?.includes('section') ||
                container.querySelector('[data-testid*="post"]') ||
                container.querySelector('[class*="surface-post"]')) {
              break;
            }
          }
        }

        // Find cards inside this section container
        const postEls = Array.from(container.querySelectorAll('[data-testid*="post"], [class*="surface-post"], [class*="post-card"], [class*="wish-card"]'));
        
        const cards = [];
        const seenCardIds = new Set();

        for (const post of postEls) {
          const cardId = post.getAttribute('data-id') || post.id || post.getAttribute('data-testid') || Math.random().toString();
          if (seenCardIds.has(cardId)) continue;
          seenCardIds.add(cardId);

          const subject = post.querySelector('[id*="surface-post-subject"], [class*="subject"], [class*="title"], h2, h3, h4')?.innerText?.trim() || '';
          const bodyEl = post.querySelector('[class*="body"], [class*="content"], [data-testid*="body"], [class*="rendered-markdown"]');
          const bodyHtml = bodyEl?.innerHTML?.trim() || '';
          const bodyText = bodyEl?.innerText?.trim() || '';

          // Author and date if present
          const author = post.querySelector('[class*="author"], [data-testid*="author"]')?.innerText?.trim() || '';
          const time = post.querySelector('time, [class*="timestamp"], [class*="date"]')?.innerText?.trim() || '';

          // Background color of card
          const cardBg = post.style?.backgroundColor || window.getComputedStyle(post).backgroundColor || '';

          // Links
          const links = Array.from(post.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.innerText.trim(),
            title: a.getAttribute('title') || ''
          })).filter(l => l.href && !l.href.startsWith('javascript:'));

          // Media / Images / Attachments
          const imgs = Array.from(post.querySelectorAll('img')).map(img => ({
            src: img.src || img.getAttribute('data-src') || '',
            alt: img.alt || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height
          })).filter(img => img.src && !img.src.includes('avatar') && !img.src.includes('icon'));

          // Attachment preview link or media frame
          const attachmentEl = post.querySelector('[class*="attachment"], [class*="preview"], [class*="media"]');
          const attachmentLink = attachmentEl?.querySelector('a')?.href || '';

          cards.push({
            id: cardId,
            subject,
            bodyText,
            bodyHtml,
            author,
            time,
            color: cardBg,
            links,
            imgs,
            attachmentLink
          });
        }

        sections.push({
          title: secTitle,
          cardsCount: cards.length,
          cards
        });
      }

      // Also gather all general attachments and links
      const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.innerText.trim()
      })).filter(l => l.href && !l.href.startsWith('javascript:'));

      return {
        title,
        boardTitle,
        boardDesc,
        wallpaperUrl,
        bgColor,
        sectionsCount: sections.length,
        sections,
        allLinksCount: allLinks.length,
        hasPinia: !!piniaDump,
        piniaDump
      };
    })()`,
    returnByValue: true
  });

  const boardData = dataRes.result?.result?.value;
  fs.writeFileSync('scripts/board_extracted.json', JSON.stringify(boardData, null, 2), 'utf-8');
  console.log(`Saved scripts/board_extracted.json. Board Title: ${boardData?.boardTitle}, Sections: ${boardData?.sections?.length}`);

  // Take a full page screenshot
  console.log('Capturing screenshot...');
  const screenshotRes = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 4000,
      height: 2500,
      scale: 1
    }
  });
  if (screenshotRes.result?.data) {
    fs.writeFileSync('preview_screenshot.png', Buffer.from(screenshotRes.result.data, 'base64'));
    console.log('Saved preview_screenshot.png');
  }

  ws.close();
  chromeProc.kill();
  console.log('Scraping completed successfully!');
}

main().catch(err => {
  console.error('Scraping error:', err);
  process.exit(1);
});
