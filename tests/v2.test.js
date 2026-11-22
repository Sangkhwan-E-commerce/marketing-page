const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { loadWidgets, validateManifest, resolveSettings, describeWidgets, SIZES } = require('../v2/registry');
const { normalizeLayout, DEFAULT_LAYOUT } = require('../v2/layout');
const { createV2App } = require('../v2');

const widgets = loadWidgets();
const silent = { error() {} };

async function withServer(mountPath, options, run) {
    const app = express();
    app.use(mountPath, createV2App({ logger: silent, ...options }));
    app.use((req, res) => res.status(404).send('old-site-404'));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    try { await run(base); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('registry loads every widget folder with a valid manifest', () => {
    assert.ok(widgets.size >= 3);
    for (const id of ['sales-today', 'kitchen-orders', 'stock-expiry']) assert.ok(widgets.has(id), id);
    for (const w of widgets.values()) {
        assert.ok(w.sizes.every(size => SIZES.includes(size)));
        assert.ok(w.text.th.name && w.text.en.name);
    }
});

test('registry rejects a broken manifest', () => {
    const good = { id: 'demo', sizes: ['1x1'], defaultSize: '1x1', dataSources: ['mock'], getData() {}, text: { th: { name: 'ก' }, en: { name: 'a' } } };
    assert.doesNotThrow(() => validateManifest(good, 'demo'));
    assert.throws(() => validateManifest(good, 'other-folder'), /folder name/);
    assert.throws(() => validateManifest({ ...good, sizes: ['3x3'], defaultSize: '3x3' }, 'demo'), /unknown size/);
    assert.throws(() => validateManifest({ ...good, defaultSize: '2x2' }, 'demo'), /defaultSize/);
    assert.throws(() => validateManifest({ ...good, dataSources: ['db'] }, 'demo'), /data source/);
    assert.throws(() => validateManifest({ ...good, text: { th: { name: 'ก' } } }, 'demo'), /text\.en/);
});

test('layout drops unknown widgets and falls back to supported size/source', () => {
    const layout = normalizeLayout([
        { widget: 'no-such-widget', size: '1x1' },
        { widget: 'sales-today', size: '1x1', source: 'live' },
        { widget: 'stock-expiry', size: '2x1', mobile: false },
        { widget: 'kitchen-orders', enabled: false }
    ], widgets);
    assert.equal(layout.length, 2);
    assert.equal(layout[0].size, widgets.get('sales-today').defaultSize);
    assert.equal(layout[0].source, 'mock');
    assert.equal(layout[1].size, '2x1');
    assert.equal(layout[1].mobile, false);
    assert.equal(normalizeLayout(DEFAULT_LAYOUT, widgets).length, DEFAULT_LAYOUT.length);
});

test('settings keep only known keys with valid values', () => {
    const w = widgets.get('sales-today');
    assert.deepEqual(resolveSettings(w, {}), { tone: 'light', showPayments: true });
    assert.deepEqual(resolveSettings(w, { tone: 'purple', showPayments: 'yes', extra: 1 }), { tone: 'light', showPayments: true });
    assert.deepEqual(resolveSettings(w, { tone: 'dark', showPayments: false }), { tone: 'dark', showPayments: false });
});

test('widget description for the admin has no functions or local paths', () => {
    const json = JSON.stringify(describeWidgets(widgets));
    assert.ok(!json.includes('getData'));
    assert.ok(!/[A-Za-z]:\\\\|\/Users\//.test(json));
});

test('/v2 renders Thai and English pages, noindex, sample badges, no external assets', async () => {
    await withServer('/v2', {}, async base => {
        const res = await fetch(`${base}/v2`);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
        const html = await res.text();
        assert.match(html, /<html lang="th">/);
        assert.match(html, /name="robots" content="noindex/);
        assert.match(html, /data-widget="sales-today"/);
        assert.match(html, /ตัวอย่าง/);
        assert.match(html, /href="\/v2\/assets\/css\/v2\.css"/);
        assert.match(html, /href="\/v2\/en"/);
        // ห้ามโหลดสคริปต์/สไตล์จากเว็บภายนอก
        assert.ok(!/<(script|link)[^>]+(src|href)="https?:\/\//.test(html.replace(/<link rel="alternate"[^>]*>/g, '')));

        const en = await (await fetch(`${base}/v2/en`)).text();
        assert.match(en, /<html lang="en">/);
        assert.match(en, /Sales today/);

        for (const asset of ['/v2/assets/css/v2.css', '/v2/assets/js/v2.js', '/v2/assets/widgets.css', '/v2/assets/widgets.js',
            '/v2/assets/vendor/bootstrap-icons/1.11.3/bootstrap-icons.min.css', '/v2/assets/vendor/fonts/anuphan/font.css']) {
            assert.equal((await fetch(base + asset)).status, 200, asset);
        }
        const api = await (await fetch(`${base}/v2/api/widgets.json`)).json();
        assert.equal(api.version, 1);
        assert.ok(api.widgets.some(w => w.id === 'kitchen-orders'));

        assert.equal(await (await fetch(`${base}/v2/nope`)).text(), 'old-site-404');
    });
});

test('mounted at / (after the switch) links have no /v2 and pages are indexable', async () => {
    await withServer('/', {}, async base => {
        const res = await fetch(`${base}/`);
        assert.equal(res.headers.get('x-robots-tag'), null);
        const html = await res.text();
        assert.ok(!/"\/v2[/"]/.test(html), 'no link may point under /v2');
        assert.ok(!html.includes('noindex'));
        assert.match(html, /href="\/assets\/css\/v2\.css"/);
        assert.match(html, /href="\/en"/);
    });
});

test('a failing widget is skipped and the page still renders', async () => {
    const broken = new Map(widgets);
    broken.set('sales-today', { ...widgets.get('sales-today'), getData() { throw new Error('boom'); } });
    await withServer('/v2', { widgets: broken }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.ok(!html.includes('data-widget="sales-today"'));
        assert.match(html, /data-widget="kitchen-orders"/);
    });
});

test('published layout is used, and a failing loader falls back to the default layout', async () => {
    await withServer('/v2', { loadPublished: async () => [{ widget: 'stock-expiry', size: '2x1' }] }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.match(html, /data-widget="stock-expiry"[^>]*data-size="2x1"/);
        assert.ok(!html.includes('data-widget="sales-today"'));
    });
    await withServer('/v2', { loadPublished: async () => { throw new Error('db down'); } }, async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.match(html, /data-widget="sales-today"/);
    });
});
