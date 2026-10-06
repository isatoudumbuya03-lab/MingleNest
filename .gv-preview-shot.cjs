
const { chromium } = require('/opt/gv-shot/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    // micro-VM: tiny /dev/shm; the node process may be root → --no-sandbox required.
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto("http://localhost:5173/", { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    // Wait for the app to actually RENDER, not just for the HTML shell. Vite is
    // near-instant, but Expo/React-Native-Web hydrates client-side after Metro
    // ships the bundle, so domcontentloaded is far too early → a blank shot.
    // Poll the render root for real content (text or a populated tree), capped.
    await page.waitForFunction(() => {
      const el = document.querySelector('#root, #app, #expo-root') || document.body;
      if (!el) return false;
      const hasText = (el.innerText || '').trim().length > 0;
      const hasTree = el.querySelectorAll('*').length > 8;
      return hasText || hasTree;
    }, { timeout: 8000 }).catch(() => {});
    // Condition-based, not a magic sleep: wait until web fonts finish loading so
    // we don't capture mid font-swap (the real reason a "settle" helped).
    await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())).catch(() => {});
    // REVEAL-ON-SCROLL pass (fast-forward animations + scroll to fire IntersectionObserver
    // reveals) so full-page agent shots don't capture below-the-fold sections blank.
    // Deliberately NO forced opacity:1 — the scroll reveals what WORKS; broken reveals
    // must capture broken (owner-caught regression, 2026-07-12). Empty in fast mode.

    await page.addStyleTag({
      content: 'html,body{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:0.001s!important;animation-delay:0s!important;transition-duration:0.001s!important;transition-delay:0s!important}',
    }).catch(() => {});
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const step = Math.max(200, Math.round(window.innerHeight * 0.8));
      for (let y = 0; y < total; y += step) {
        window.scrollTo(0, y);
        await sleep(80);
      }
      window.scrollTo(0, total);
      await sleep(150);
      /*
       * Back to the TOP, instantly, and confirm it. Generated pages usually set
       * html{scroll-behavior:smooth}, which turned this jump into a 0.5s animation —
       * the screenshot fired mid-scroll and captured a random middle slice (the
       * 'Reconnecting…' snapshot and the agent's capture_preview both showed it,
       * 2026-09-30). The style above disables smooth scrolling; the loop also waits
       * out JS smooth-scroll libraries that animate scrollTop themselves.
       */
      for (let i = 0; i < 20 && (window.scrollY > 0 || document.documentElement.scrollTop > 0); i++) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        await sleep(60);
      }
      await sleep(120);
    }).catch(() => {});

    // HARD height cap. Anthropic REJECTS any image with a dimension > 8000px
    // (400 invalid_request), and because the shot lives in the chat history,
    // one over-tall fullPage capture of a long landing page poisons EVERY
    // subsequent request in that chat. Anthropic also downscales anything
    // > ~1568px on the long edge, so ultra-tall shots are unreadable to the
    // model anyway — pure loss. Above the cap, clip to the top MAX_H pixels.
    //
    // 2026-09-05: 4000 → 2000. A 1280×4000 JPEG is ~2MB of base64; because the
    // shot rides in the conversation, useChat re-serializes it (JSON.parse +
    // stringify in the fetch wrapper) on EVERY round after the capture — ~100ms+
    // of main-thread work = the "page freezes after a screenshot" the user hit.
    // 2000px cuts the payload ~2.5× (parse/stringify → imperceptible), and the
    // model loses nothing: Anthropic was already downscaling the 4000px shot to
    // ~1568px long-edge (~500px wide — barely readable); 2000px downscales less
    // and reads BETTER. Long pages lose only below-2000px detail, which the DOM
    // facts (hiddenText/visibleTextLength) already cover for render verification.
    const MAX_H = 2000;
    const pageH = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)).catch(() => 0);

    /*
     * DOM facts, collected in the SAME render as the screenshot (free — no extra
     * round trip, no second browser launch).
     *
     * Why: a screenshot only lets the agent INFER whether the page rendered, and
     * that inference fails in the one case that matters most. Content hidden by
     * `opacity: 0` is fully present in the DOM with full height, so innerHTML
     * length and scrollHeight both look healthy while the page reads as blank.
     * On 2026-08-20 an agent chased that for ~40 rounds: it installed Playwright
     * (already present at /opt/gv-shot), measured innerHTML.length, concluded the
     * app was fine, and told the user twice that a real bug was a "capture
     * artifact". The bug was a scroll-reveal stuck at opacity 0.
     *
     * hiddenText is the signal that ends that argument: text present in the DOM
     * that no user can see.
     */
    const dom = await page.evaluate(() => {
      const root = document.querySelector('#root, #app, #expo-root') || document.body;
      const visibleText = (root.innerText || '').trim();
      let hiddenText = 0;
      let hiddenNodes = 0;

      for (const el of Array.from(root.querySelectorAll('*'))) {
        const text = (el.textContent || '').trim();
        if (!text) continue;
        // Only count the element that DIRECTLY holds the text, not every ancestor.
        if (el.children.length && !Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim())) {
          continue;
        }
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) {
          hiddenNodes++;
          hiddenText += text.length;
        }
      }

      return {
        pageHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
        visibleTextLength: visibleText.length,
        hiddenTextLength: hiddenText,
        hiddenNodeCount: hiddenNodes,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      };
    }).catch(() => null);

    if (dom) {
      console.log('GV_DOM ' + JSON.stringify(dom));
    }

    if (false && pageH > MAX_H) {
      await page.screenshot({ path: "/home/project/.gv-preview-shot.jpg", type: 'jpeg', quality: 55, fullPage: true, clip: { x: 0, y: 0, width: 1280, height: MAX_H } });
      console.log('GV_CLIP ' + JSON.stringify({ capturedHeight: MAX_H, pageHeight: pageH }));
    } else {
      await page.screenshot({ path: "/home/project/.gv-preview-shot.jpg", type: 'jpeg', quality: 55, fullPage: false });
      console.log('GV_CLIP ' + JSON.stringify({ capturedHeight: false ? pageH : 800, pageHeight: pageH }));
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('SHOT_ERR', e && e.message ? e.message : e); process.exit(1); });
