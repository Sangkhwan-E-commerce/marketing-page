const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createV2App } = require('../v2');
const { renderChart } = require('../v2/chart');

async function page(layout) {
    const app = express();
    app.use('/v2', createV2App({ logger: { error() {} }, loadPublished: async () => layout }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try { return await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text(); }
    finally { await new Promise(r => server.close(r)); }
}
const card = (html, id) => (new RegExp(`<article[^>]*data-widget="${id}"[\\s\\S]*?<\\/article>`).exec(html) || [''])[0];

test('edge charts run from the left edge to the right edge', () => {
    const pts = [{ value: 1 }, { value: 2 }, { value: 3 }];
    const edge = renderChart(pts, 'area', { edge: true });
    assert.match(edge, /<polyline class="w-chart-line" points="0,[\d.]+ 50,[\d.]+ 100,/);
    assert.match(edge, /<path class="w-chart-area" d="M0,40 /);
    const normal = renderChart(pts, 'line');
    assert.ok(!/points="0,/.test(normal), 'normal charts keep points centred in their slot');
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
    assert.match(sales, /points="0,/);
    const bills = card(html, 'bills-total');
    assert.ok(!bills.includes('lp-card-bleed') && !bills.includes(' bleed"'), 'default = normal padding');
    const stores = card(html, 'stores-total');
    assert.ok(!stores.includes('lp-card-bleed'), '1x1 auto position = number only, so nothing to bleed');
});
