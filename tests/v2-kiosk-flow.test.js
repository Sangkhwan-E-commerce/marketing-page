const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const mock = require('../v2/mock-data');
const { loadWidgets, resolveSettings } = require('../v2/registry');

const widgets = loadWidgets();
const w = widgets.get('kiosk-flow');
const run = (raw = {}, size = '4x2', locale = 'th') => w.getData({ mock, locale, settings: resolveSettings(w, raw), source: 'mock', size });
const render = (raw = {}, size = '4x2', locale = 'th') => ejs.renderFile(w.viewPath, {
    data: run(raw, size, locale), text: w.text[locale], locale, settings: resolveSettings(w, raw), size,
    fmt: (v) => new Intl.NumberFormat('th-TH').format(v), pick: (o) => o[locale]
});

test('kiosk-flow: 4 steps in order, 4x2 default, links to the kiosk manual', () => {
    assert.ok(w);
    assert.equal(w.defaultSize, '4x2');
    assert.deepEqual(w.dataSources, ['mock']);
    assert.equal(w.docPath, '/doc/restaurant/kiosk');
    const d = run();
    assert.deepEqual(d.steps.map(s => s.key), ['order', 'pay', 'kitchen', 'pickup']);
    assert.deepEqual(d.steps.map(s => s.no), [1, 2, 3, 4]);
    assert.equal(d.queue, 119);
    assert.equal(d.total, 75 + 2 * 45 + 55);
    assert.equal(d.count, 4);
    assert.equal(d.cash, true);
    assert.equal(d.scenes, true);
});

test('illustrations only on cards big enough (4x2 / 2x2) and when switched on', () => {
    assert.equal(run({}, '2x2').scenes, true);
    assert.equal(run({}, '4x1').scenes, false);
    assert.equal(run({}, '1x2').scenes, false);
    assert.equal(run({ show_scenes: false }, '4x2').scenes, false);
});

test('per-language step text overrides, QR-only payment, queue number', () => {
    const d = run({ step1_title_th: 'แตะสั่งเลย', step2_desc_en: 'EN only' });
    assert.equal(d.steps[0].title, 'แตะสั่งเลย');
    assert.equal(d.steps[1].desc, w.text.th.steps.pay.desc, 'English override does not leak into Thai');
    assert.equal(run({ step2_desc_en: 'EN only' }, '4x2', 'en').steps[1].desc, 'EN only');
    const qr = run({ payment: 'qr' });
    assert.equal(qr.cash, false);
    assert.equal(qr.steps[1].desc, w.text.th.steps.pay_qr_only.desc);
    assert.equal(run({ queue_no: 42 }).queue, 42);
});

test('view: renders every step, cash option and voice icon follow settings, no scenes on small cards', async () => {
    const html = await render();
    assert.equal((html.match(/class="w-ksk-step /g) || []).length, 4);
    assert.match(html, /PromptPay/);
    assert.match(html, /w-ksk-cash/);
    assert.match(html, /bi-volume-up-fill/);
    assert.match(html, /฿220/);
    assert.match(html, /data-animate="1"/);
    assert.ok(!(await render({ payment: 'qr' })).includes('w-ksk-cash'));
    assert.ok(!(await render({ show_voice: false })).includes('bi-volume-up-fill'));
    assert.ok(!(await render({}, '4x1')).includes('w-ksk-scene'));
    assert.match(await render({ palette: 'accent', show_numbers: false }), /w-ksk-accent[^"]*no-numbers/);
    assert.match(await render({}, '4x2', 'en'), />Ready</);
});

test('style: no color-mix() and no justify-content: flex-end', () => {
    const css = require('node:fs').readFileSync(path.join(w.dir, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/color-mix\(/.test(css));
    assert.ok(!/justify-content:\s*flex-end/.test(css));
});
