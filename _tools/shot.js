// Screenshots of the local site: node _tools/shot.js [url]
const puppeteer = require('puppeteer-core');
const OUT = process.env.SHOT_DIR || __dirname;
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8765/';
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['mob', { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => errors.push('FAILED ' + r.url()));
    await page.setViewport(vp);
    await page.goto(url, { waitUntil: 'networkidle0' });
    // scroll through to trigger reveals / lazy images
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate(y => window.scrollTo(0, y), y); await new Promise(r => setTimeout(r, 120)); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1800));
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth; const bad = [];
      document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > w + 1 && !el.closest('.strip') && getComputedStyle(el).position !== 'fixed') bad.push(el.tagName + '.' + el.className + ' ' + Math.round(r.right)); });
      return { scrollW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 10) };
    });
    console.log(name, JSON.stringify(overflow), errors.length ? errors : 'no errors');
    await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
    await page.screenshot({ path: `${OUT}/${name}-fold.png` });
    await page.close();
  }
  await browser.close();
})();
