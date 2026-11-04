// Export the site to a single PDF for assignment submission: cover + article + sources.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..'); const OUT = process.argv[2] || path.join(ROOT, 'submission', 'Same-Roots-New-Skin.pdf');
const LIVE = 'https://jacobnazar26-del.github.io/same-roots-new-skin/';
const PRINT_CSS = `
  .nav, .progress, .lanterns, .walk, .map-wrap, .skip-link, .compare__handle, .hotspot, .pl-bar, .back, .flip__topseal { display: none !important; }
  .hero--band { background: #141414 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; animation: none !important; transition: none !important; }
  .js .reveal:not(.in) { opacity: 1 !important; transform: none !important; }
  .section, .place { padding-block: 28px !important; break-inside: avoid-page; }
  .place, .voices, .essays, .nb-card, .flip, .facts li, .refs li { break-inside: avoid; }
  .compare { aspect-ratio: auto !important; max-width: none !important; height: auto !important; overflow: visible !important; box-shadow: none !important; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .compare__layer { position: static !important; clip-path: none !important; }
  .compare__layer img { height: 420px; }
  .compare__label { position: static !important; display: inline-block; margin-bottom: 6px; }
  .place__grid { grid-template-columns: 1fr !important; }
  .flip__inner { transform: none !important; min-height: 0 !important; }
  .flip, .flip__inner { height: auto !important; min-height: 0 !important; }
  .flip__face { position: static !important; transform: none !important; }
  .flip__back { margin-top: 6px; }
  .flips { grid-template-columns: 1fr 1fr !important; }
  .voices.is-compare .tabs, .voices.is-compare .panel { display: block !important; }
  .tabs { display: none !important; }
  .panel { display: block !important; }
  .panel__who::before { content: ""; }
  .nb-card__body, .acc__panel, #allQuestions, #compareView, [hidden] { display: block !important; }
  .nb-grid { grid-template-columns: 1fr 1fr !important; }
  .prose--cols { columns: 1 !important; }
  body { font-size: 12.5px; }
  h2 { font-size: 26px; } h3 { font-size: 18px; }
  .cover { page-break-after: always; padding: 120px 40px; text-align: center; background: #141414; color: #FAF7F2; min-height: 95vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; }
  .cover h1 { font-family: "Noto Serif TC", Georgia, serif; font-size: 54px; color: #FAF7F2; margin: 0; }
  .cover p { margin: 0; font-size: 16px; } .cover a { color: #D4A017; font-size: 18px; word-break: break-all; }
  .cover .seal { margin-bottom: 20px; }
  .sources-break { page-break-before: always; }
`;
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8140', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, ignoreHTTPSErrors: true });
  await page.goto('http://127.0.0.1:8140/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(2500);
  // pull the sources page body in after the article
  const srcHtml = await (await page.request.get('http://127.0.0.1:8140/sources.html')).text();
  const srcMain = srcHtml.match(/<main id="top">([\s\S]*?)<\/main>/)[1];
  await page.evaluate(({ srcMain, LIVE }) => {
    document.querySelectorAll('picture source').forEach(e => e.remove());
    document.querySelectorAll('.compare img').forEach(i => { i.loading = 'eager'; const j = i.getAttribute('src'); i.src = j + '?v=1'; });
    document.querySelectorAll('[hidden]').forEach(e => e.hidden = false);
    document.querySelectorAll('[aria-expanded]').forEach(e => e.setAttribute('aria-expanded', 'true'));
    document.querySelectorAll('.nb-card').forEach(e => e.classList.add('is-open'));
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'));
    document.querySelectorAll('.photo.is-missing').forEach(e => e.classList.remove('is-missing'));
    document.querySelectorAll('a.cite').forEach(a => a.setAttribute('href', a.getAttribute('href').replace('sources.html', '')));
    const cover = document.createElement('section'); cover.className = 'cover';
    cover.innerHTML = '<span class="seal" aria-hidden="true">唐</span><h1>Same Roots, New Skin</h1><p>Manhattan\'s Chinatown, seen through the lens of Hong Kong &amp; China</p><p>By Jacob Nazar · Writing for Exploration · NYU · Fall 2026</p><p style="margin-top:28px">This PDF is a print copy of an interactive website. The live version, with the photo string, comparison sliders, hotspots and map, is at</p><a href="' + LIVE + '">' + LIVE + '</a><p style="margin-top:20px;font-size:13px;opacity:.8">Sources in APA 7, including three peer-reviewed articles, are at the end of this document and on the website\'s Sources tab.</p>';
    document.body.insertBefore(cover, document.body.firstChild);
    const wrap = document.createElement('div'); wrap.className = 'sources-break'; wrap.innerHTML = srcMain;
    document.querySelector('main').appendChild(wrap);
  }, { srcMain, LIVE });
  await page.addStyleTag({ content: PRINT_CSS });
  await page.emulateMedia({ media: 'screen' });
  await page.waitForTimeout(1500);
  await page.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.6in', left: '0.5in', right: '0.5in' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:9px;color:#6B6B6B;width:100%;text-align:center;font-family:sans-serif">Same Roots, New Skin · Jacob Nazar · <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await browser.close(); srv.kill();
  console.log('wrote', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(1) + ' MB');
})();
