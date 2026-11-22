const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createDbSources } = require('../v2/db');
const { createV2App } = require('../v2');

const silent = { error() {} };
const TOKEN = 'a'.repeat(48);

// ฐานข้อมูลปลอม: แถวเดียวของ lp_site
function fakePool(row, { fail = false } = {}) {
    const calls = [];
    return {
        calls,
        query: async (sql, params = []) => {
            calls.push(sql);
            if (fail) throw new Error('relation "lp_site" does not exist');
            if (sql.includes('preview_token')) {
                const ok = row.preview_token === params[0] && row.preview_expires_at > Date.now();
                return { rows: ok ? [{ draft: row.draft, published: row.published }] : [] };
            }
            return { rows: [{ published: row.published }] };
        }
    };
}

async function withServer(options, run) {
    const app = express();
    app.use('/v2', createV2App({ logger: silent, siteCacheMs: 0, ...options }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(r => server.close(r)); }
}

test('published row is cached and shared by layout and site loaders', async () => {
    let t = 0;
    const pool = fakePool({ published: { layout: [{ widget: 'stock-expiry' }], site: { brand: { theme_color: '#123456' } } } });
    const db = createDbSources({ getPool: () => pool, now: () => t, logger: silent });
    assert.deepEqual(await db.loadPublished(), [{ widget: 'stock-expiry' }]);
    assert.deepEqual(await db.loadSiteSettings(), { brand: { theme_color: '#123456' } });
    assert.equal(pool.calls.length, 1, 'second loader hits the cache');
    t = 61000;
    await db.loadPublished();
    assert.equal(pool.calls.length, 2, 'cache expires after 60s');
});

test('never published / missing table → null (site uses defaults), keeps last good value on failure', async () => {
    const empty = createDbSources({ getPool: () => fakePool({ published: null }), logger: silent });
    assert.equal(await empty.loadPublished(), null);
    assert.equal(await empty.loadSiteSettings(), null);

    const missing = createDbSources({ getPool: () => fakePool({}, { fail: true }), logger: silent });
    assert.equal(await missing.loadPublished(), null);

    let t = 0;
    let fail = false;
    const row = { published: { layout: [{ widget: 'sales-today' }] } };
    const pool = { query: async () => { if (fail) throw new Error('down'); return { rows: [{ published: row.published }] }; } };
    const db = createDbSources({ getPool: () => pool, now: () => t, logger: silent });
    await db.loadPublished();
    fail = true; t = 61000;
    assert.deepEqual(await db.loadPublished(), [{ widget: 'sales-today' }]);
    t = 200000;
    assert.deepEqual(await db.loadPublished(), [{ widget: 'sales-today' }], 'still the last good value after repeated failures');
});

test('draft needs a valid, unexpired token', async () => {
    const row = { draft: { layout: [] }, published: null, preview_token: TOKEN, preview_expires_at: Date.now() + 60000 };
    const db = createDbSources({ getPool: () => fakePool(row), logger: silent });
    assert.deepEqual(await db.loadDraft(TOKEN), { layout: [] });
    assert.equal(await db.loadDraft('b'.repeat(48)), null);
    assert.equal(await db.loadDraft("' OR 1=1 --"), null);
    assert.equal(await db.loadDraft(undefined), null);
    row.preview_expires_at = Date.now() - 1;
    assert.equal(await db.loadDraft(TOKEN), null);
});

test('home page renders the published layout and settings from the database', async () => {
    const pool = fakePool({ published: { layout: [{ widget: 'stock-expiry', size: '2x1' }], site: { texts: { th: { title: 'ชื่อจากหลังบ้าน' } } } } });
    await withServer(createDbSources({ getPool: () => pool, logger: silent }), async base => {
        const html = await (await fetch(`${base}/v2`)).text();
        assert.match(html, /<title>ชื่อจากหลังบ้าน<\/title>/);
        assert.match(html, /data-widget="stock-expiry"[^>]*data-size="2x1"/);
        assert.ok(!html.includes('data-widget="sales-today"'));
        assert.ok(!html.includes('lp-preview-bar'));
    });
});

test('preview shows the draft with a banner, noindex and no-store; bad token is refused', async () => {
    const row = {
        published: { layout: [{ widget: 'sales-today' }] },
        draft: { layout: [{ widget: 'kitchen-orders', size: '2x2' }], site: { texts: { en: { title: 'Draft title' } } } },
        preview_token: TOKEN, preview_expires_at: Date.now() + 60000
    };
    await withServer(createDbSources({ getPool: () => fakePool(row), logger: silent }), async base => {
        const res = await fetch(`${base}/v2/en/preview?token=${TOKEN}`);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'no-store');
        assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
        const html = await res.text();
        assert.match(html, /lp-preview-bar/);
        assert.match(html, /<title>Draft title<\/title>/);
        assert.match(html, /data-widget="kitchen-orders"[^>]*data-size="2x2"/);
        assert.ok(!html.includes('data-widget="sales-today"'));
        assert.match(html, new RegExp(`href="/v2/preview\\?token=${TOKEN}" hreflang="th"`), 'language switch stays in preview');

        const bad = await fetch(`${base}/v2/preview?token=${'c'.repeat(48)}`);
        assert.equal(bad.status, 403);
        assert.match(await bad.text(), /หมดอายุ/);
    });
    await withServer({}, async base => {
        assert.equal((await fetch(`${base}/v2/preview?token=${TOKEN}`)).status, 403, 'no draft loader = no preview');
    });
});

test('widgets.json includes the default layout for the admin page', async () => {
    await withServer({}, async base => {
        const api = await (await fetch(`${base}/v2/api/widgets.json`)).json();
        assert.ok(Array.isArray(api.defaultLayout) && api.defaultLayout.length >= 3);
        assert.equal(api.defaultLayout[0].widget, 'sales-today');
    });
});
