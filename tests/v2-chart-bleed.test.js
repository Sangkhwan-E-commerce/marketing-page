const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createV2App } = require('../v2');
const { buildChartSpec } = require('../v2/chart');

async function page(layout) {
    const app = express();
    app.use('/v2', createV2App({ logger: { error() {} }, loadPublished: async () => layout }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try { return await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text(); }
    finally { await new Promise(r => server.close(r)); }
}
const card = (html, id) => (new RegExp(`<article[^>]*data-widget="${id}"[\\s\\S]*?<\\/article>`).exec(html) || [''])[0];
// data-chart="…" ถูก escape แบบ HTML — แกะกลับเป็นสเปก
const specOf = (html) => {
    const m = /data-chart="([^"]*)"/.exec(html);
    return m ? JSON.parse(m[1].replace(/&#34;/g, '"').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")) : null;
};

test('chart spec carries the edge flag for full-bleed charts', () => {
    const pts = [{ label: 'a', value: 1 }, { label: 'b', value: 2 }];
    assert.equal(buildChartSpec(pts, 'area', { edge: true }).edge, true);
    assert.equal(buildChartSpec(pts, 'line').edge, false);
    assert.equal(buildChartSpec([pts[0]], 'line'), null, 'one point = no chart');
});

test('chart_bleed is off by default and adds the bleed classes when on', async () => {
    const html = await page([
        { widget: 'sales-total', size: '1x2', settings: { chart_type: 'area', chart_bleed: true } },
        { widget: 'bills-total', size: '2x2' },
        { widget: 'stores-total', size: '1x1', settings: { chart_bleed: true } }
    ]);
    const sales = card(html, 'sales-total');
    assert.match(sales, /class="lp-card [^"]*lp-card-bleed"/);
    assert.match(sales, /class="w-bills pos-bottom bleed"/);
    assert.equal(specOf(sales).edge, true);
    assert.equal(specOf(sales).type, 'area');
    const bills = card(html, 'bills-total');
    assert.ok(!bills.includes('lp-card-bleed') && !bills.includes(' bleed"'), 'default = normal padding');
    assert.equal(specOf(bills).edge, false);
    const stores = card(html, 'stores-total');
    assert.ok(!stores.includes('lp-card-bleed'), '1x1 auto position = number only, so nothing to bleed');
});

module.exports = { specOf };

test('pages without chart cards do not load Chart.js', async () => {
    const html = await page([{ widget: 'stock-expiry' }, { widget: 'kitchen-orders' }]);
    assert.ok(!html.includes('chart.umd.min.js'));
});
