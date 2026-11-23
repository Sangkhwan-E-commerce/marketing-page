const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createV2App } = require('../v2');
const { normalizeSiteSettings, FIELDS } = require('../v2/site-settings');

async function page(site) {
    const app = express();
    app.use('/v2', createV2App({ logger: { error() {} }, loadSiteSettings: async () => site }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try { return await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text(); }
    finally { await new Promise(r => server.close(r)); }
}

test('page background colour: default, light custom, dark custom switches page text to light', async () => {
    assert.ok(FIELDS.brand.some(f => f.key === 'page_bg_color' && f.type === 'color'));
    assert.match(await page(null), /<body class="lp-body" style="--lp-bg: #dfe6ef;/);
    assert.match(await page({ brand: { page_bg_color: '#FEF3C7' } }), /<body class="lp-body" style="--lp-bg: #fef3c7;/);
    assert.match(await page({ brand: { page_bg_color: '#0f172a' } }), /<body class="lp-body lp-page-dark" style="--lp-bg: #0f172a;/);
    assert.equal(normalizeSiteSettings({ brand: { page_bg_color: 'url(javascript:x)' } }).brand.page_bg_color, '#dfe6ef', 'bad value → default');
});
