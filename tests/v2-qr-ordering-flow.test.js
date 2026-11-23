const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

const mock = require('../v2/mock-data');
const { loadWidgets, resolveSettings } = require('../v2/registry');

const widgets = loadWidgets();
const w = widgets.get('qr-ordering-flow');
const run = (raw = {}, size = '4x2', locale = 'th') => w.getData({ mock, locale, settings: resolveSettings(w, raw), source: 'mock', size });
const render = (raw = {}, size = '4x2', locale = 'th') => ejs.renderFile(w.viewPath, {
    data: run(raw, size, locale), text: w.text[locale], locale, settings: resolveSettings(w, raw), size,
    fmt: (v) => new Intl.NumberFormat('th-TH').format(v), pick: (o) => o[locale]
});

test('qr-ordering-flow: 4 steps in order, 4x2 default, links to the QR tables manual', () => {
    assert.ok(w);
    assert.equal(w.defaultSize, '4x2');
    assert.deepEqual(w.dataSources, ['mock']);
    assert.equal(w.docPath, '/doc/restaurant/qr-tables');
    const d = run();
    assert.deepEqual(d.steps.map(s => s.key), ['scan', 'received', 'kitchen', 'serve']);
    assert.deepEqual(d.steps.map(s => s.no), [1, 2, 3, 4]);
    assert.equal(d.table, 'โต๊ะ 4');
    assert.equal(d.total, 2 * 65 + 55);
    assert.equal(d.count, 3);
    assert.equal(d.scenes, true);
});

test('illustrations only on cards big enough (4x2 / 2x2) and when switched on', () => {
    assert.equal(run({}, '2x2').scenes, true);
    assert.equal(run({}, '4x1').scenes, false);
    assert.equal(run({}, '1x2').scenes, false);
    assert.equal(run({ show_scenes: false }, '4x2').scenes, false);
});

test('per-language step text overrides, serve-only last step, table number', () => {
    const d = run({ step1_title_th: 'สแกนเลย', step2_desc_en: 'EN only' });
    assert.equal(d.steps[0].title, 'สแกนเลย');
    assert.equal(d.steps[1].desc, w.text.th.steps.received.desc, 'English override does not leak into Thai');
    assert.equal(run({ step2_desc_en: 'EN only' }, '4x2', 'en').steps[1].desc, 'EN only');
    const serve = run({ last_step: 'serve' });
    assert.equal(serve.pay, false);
    assert.equal(serve.steps[3].label, w.text.th.steps.serve_only.label);
    assert.equal(run({ table_no: 12 }, '4x2', 'en').table, 'Table 12');
});

test('view: renders every step, PromptPay only when paying, no scenes on small cards', async () => {
    const html = await render();
    assert.equal((html.match(/class="w-qrf-step /g) || []).length, 4);
    assert.match(html, /PromptPay/);
    assert.match(html, /data-animate="1"/);
    assert.ok(!(await render({ last_step: 'serve' })).includes('PromptPay'));
    const small = await render({}, '4x1');
    assert.ok(!small.includes('w-qrf-scene'));
    assert.match(await render({ palette: 'accent', show_numbers: false }), /w-qrf-accent[^"]*no-numbers/);
});

test('style: no color-mix() and no justify-content: flex-end', () => {
    const css = require('node:fs').readFileSync(path.join(w.dir, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/color-mix\(/.test(css));
    assert.ok(!/justify-content:\s*flex-end/.test(css));
});
