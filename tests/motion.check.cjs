const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdirSync } = require('node:fs');
const url = process.argv[2] || pathToFileURL(resolve(__dirname, '../index.html')).href;
const evidence = process.env.STUDY_EVIDENCE;
const settle = page => page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1040 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.fonts.check('800 30px "Bricolage Grotesque"')));
    assert.equal(await page.locator('#page-title').evaluate(element => getComputedStyle(element).fontWeight), '800');
    assert.equal(await page.locator('.hero-copy p, .topic-row p').count(), 0, 'repetitive home subtext returned');
    assert(parseFloat(await page.locator('.topic-row').first().evaluate(element => getComputedStyle(element).borderRadius)) >= 24);
    await page.locator('#decline-storage').click();
    await page.locator('[data-nav="karty"]').click();
    await page.locator('#flip-card').waitFor();
    await settle(page);
    assert.equal(await page.locator('.page-heading p, .flashcard-hint').count(), 0);
    assert.equal(await page.locator('.flashcard-front .flashcard-content').evaluate(element => getComputedStyle(element).fontWeight), '800');
    await page.locator('#shuffle-deck').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'shuffle-deck');
    assert(await page.locator('#flip-card').evaluate(element => element.getAnimations().length > 0), 'shuffle had no motion');
    await settle(page);
    await page.evaluate(() => { window.originalCard = document.querySelector('#flip-card'); });
    await page.locator('#flip-card').click();
    assert(await page.evaluate(() => originalCard === document.querySelector('#flip-card')), 'flip replaced the card');
    assert.equal(await page.locator('.flashcard-front').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('.flashcard-back').getAttribute('aria-hidden'), 'false');
    assert(!(await page.locator('#rate-known').isDisabled()));
    const midFlip = await page.locator('.flashcard-inner').evaluate(async element => {
      await new Promise(requestAnimationFrame);
      const transition = element.getAnimations().find(a => a.transitionProperty === 'transform');
      if (!transition) return null;
      transition.pause();
      transition.currentTime = 100;
      return new DOMMatrix(getComputedStyle(element).transform).m13;
    });
    assert(midFlip && Math.abs(midFlip) > .1, 'no real intermediate 3D flip');
    if (evidence) {
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: resolve(evidence, 'flip-middle.png') });
    }
    await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    await page.evaluate(() => document.querySelector('#rate-known').click());
    assert.equal(await page.locator('.card-exit').count(), 1);
    assert.equal(await page.locator('.card-exit').getAttribute('aria-hidden'), 'true');
    assert(await page.locator('.card-exit').evaluate(element => element.inert && !element.id));
    assert(await page.locator('#rate-known').isDisabled(), 'next card allowed unearned rating');
    await settle(page);
    assert.equal(await page.locator('.card-exit').count(), 0, 'departed card leaked');
    await page.evaluate(() => {
      document.querySelector('#flip-card').click();
      document.querySelector('#rate-again').click();
      document.querySelector('[data-nav="poznamky"]').click();
    });
    await page.locator('.notes-paper').waitFor();
    assert.equal(await page.locator('.card-exit').count(), 0, 'navigation retained departed card');

    await page.locator('.chapter-nav a[href="#poznamky/vetne-cleny"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.note-section').length === 11);
    await page.waitForFunction(() => document.querySelector('.note-section').getAnimations().length > 0);
    await settle(page);
    assert.equal(await page.locator('.note-section p').first().evaluate(element => getComputedStyle(element).fontWeight), '500');
    assert.equal(await page.locator('#reading-progress').evaluate(element => element.value), 0);
    await page.locator('[data-scroll="part-5"]').click();
    await page.waitForFunction(() => document.querySelector('[data-scroll="part-5"]').getAttribute('aria-current') === 'location');
    const middle = await page.locator('#reading-progress').evaluate(element => element.value);
    assert(middle > 0 && middle < 100);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('#reading-progress').value === 100);
    assert.equal(await page.locator('[data-scroll="part-10"]').getAttribute('aria-current'), 'location');
    assert.equal(await page.locator('#read-count').innerText(), '0 / 7', 'scroll marked lesson as read');

    await page.setViewportSize({ width: 320, height: 740 });
    await page.locator('[data-nav="karty"]').click();
    await settle(page);
    const movingWidth = await page.evaluate(() => {
      document.querySelector('#flip-card').click();
      document.querySelector('#rate-known').click();
      const animation = document.querySelector('.card-exit').getAnimations()[0];
      animation.pause();
      animation.currentTime = 140;
      return document.documentElement.scrollWidth;
    });
    assert(movingWidth <= 321, 'departing card added horizontal scrolling');
    await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.locator('[data-nav="kviz"]').click();
    assert.equal(await page.locator('.quiz-rules').count(), 0, 'redundant quiz instructions returned');
    await page.locator('#start-quiz').click();
    const animations = await page.evaluate(() => {
      const question = STUDY_CONTENT.questions.find(q => q.prompt === document.querySelector('#question-title').textContent);
      [...document.querySelectorAll('[data-answer]')].find(button => Number(button.dataset.answer) !== question.answer).click();
      return [document.querySelector('.answer-option.incorrect').getAnimations()[0]?.animationName, document.querySelector('.quiz-feedback').getAnimations()[0]?.animationName];
    });
    assert.deepEqual(animations, ['answer-nudge', 'paper-arrive']);
    assert.equal(await page.locator('[data-answer]:disabled').count(), 4);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-nav="karty"]').click();
    await page.locator('#flip-card').click();
    assert.equal(await page.locator('.flashcard-inner').evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.locator('#rate-again').click();
    assert.equal(await page.locator('.card-exit').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { document.querySelector('#flip-card').click(); document.querySelector('#rate-again').click(); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.card-exit') && document.getAnimations().length === 0);
    assert.equal(await page.locator('.card-exit').count(), 0, 'preference change retained animation');

    await page.setViewportSize({ width: 320, height: 740 });
    await page.locator('#shuffle-deck').click();
    const checked = await page.evaluate(() => {
      let count = 0;
      while (document.querySelector('#flip-card')) {
        const card = document.querySelector('#flip-card');
        card.click();
        if (card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1) throw Error('card overflow at 320px');
        document.querySelector('#rate-again').click();
        if (++count > STUDY_CONTENT.cards.length) throw Error('deck did not finish');
      }
      return count;
    });
    assert.equal(checked, 95);
    assert(await page.locator('.session-finished').isVisible());
    const touch = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
    touch.on('pageerror', error => errors.push(String(error)));
    await touch.goto(url.replace(/#.*$/, '') + '#karty');
    await touch.locator('#decline-storage').tap();
    assert(!(await touch.evaluate(() => matchMedia('(hover:hover) and (pointer:fine)').matches)));
    assert(await touch.locator('.navigation a').evaluateAll(links => links.every(link => link.scrollWidth <= link.clientWidth + 1)), 'mobile navigation clips text');
    await touch.locator('#flip-card').tap();
    assert.equal(await touch.locator('#flip-card').getAttribute('aria-expanded'), 'true');
    await touch.locator('#rate-known').tap();
    assert.equal(await touch.locator('.session-meta strong').innerText(), '2');
    assert(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ url, checks: ['local grotesk 800 and concise copy', 'soft shapes and shuffle focus', 'scroll entry', 'persistent accessible 3D flip', 'intermediate animation frame', 'rating and ghost cleanup', 'rapid navigation', 'reading progress and active section', 'manual read status', 'quiz feedback and lock', 'reduced motion and preference changes', 'all 95 cards at 320px', 'touch and navigation at 320px', 'no browser errors'], errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
