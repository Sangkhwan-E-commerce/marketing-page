const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const mock = require('../v2/mock-data');
const { loadWidgets } = require('../v2/registry');
const { createStatsSource } = require('../v2/stats');
const { createV2App } = require('../v2');

const silent = { error() {} };
const widgets = loadWidgets();
const sales = widgets.get('sales-total');
const TODAY = '2026-11-22';
const defaults = () => Object.fromEntries(sales.settings.filter(s => !s.localized).map(s => [s.key, s.default]));
const run = (settings, stats = null, source = 'live', size = '4x1') =>
    sales.getData({ mock, locale: 'th', settings: { ...defaults(), ...settings }, source, size, stats, today: TODAY });

test('sales card exists with the shared stat settings and is not a product feature', () => {
    assert.ok(sales);
    assert.equal(sales.feature, false);
    for (const k of ['period', 'from', 'to', 'chart_type', 'chart_position', 'format', 'min_live', 'fallback']) {
        assert.ok(sales.settings.some(s => s.key === k), k);
    }
    assert.equal(sales.text.th.prefix, '฿');
});

test('live sales: baht from sales_daily, period sums, satang floored, refunds subtracted', () => {
    const stats = { sales_total: 134700.24, sales_daily: [{ d: '2025-12-31', n: 1000.9 }, { d: '2026-10-01', n: 125000.5 }, { d: '2026-11-21', n: -300.25 }, { d: '2026-11-22', n: 9999.99 }] };
    const all = run({ format: 'full' }, { ...stats, sales_total: 135701.14 });
    assert.equal(all.source, 'live');
    assert.equal(all.value, 135701, 'satang dropped, never rounded up');
    assert.equal(all.display, '135,701');
    const year = run({ period: 'this_year', format: 'compact' }, stats);
    assert.equal(year.value, 134700);
    assert.equal(year.display, '134.7k');
    assert.ok(year.chart.values.every(v => v >= 0), 'negative refund days drawn as 0, not upside down');
    assert.ok(year.chart.tooltips.every(t => t.startsWith('฿')), 'tooltips in baht');
});

test('no data / below minimum → sample ฿1.85M with the sample badge; hide on request', () => {
    const none = run({}, null);
    assert.equal(none.source, 'mock');
    assert.equal(none.value, mock.SALES_TOTAL);
    assert.equal(none.display, '1.85M');
    assert.equal(run({ min_live: 500000 }, { sales_total: 1000, sales_daily: [{ d: TODAY, n: 1000 }] }).source, 'mock');
    assert.deepEqual(run({ fallback: 'hide' }, null), { hidden: true });
    const sampleDays = mock.mockDaily(TODAY, 800, mock.SALES_TOTAL);
    assert.equal(sampleDays.reduce((s, r) => s + r.n, 0), mock.SALES_TOTAL);
});

test('stats source maps sales_daily {d, v} to the shared {d, n} shape', async () => {
    const get = createStatsSource({ appUrl: 'x', logger: silent, fetchImpl: async () => ({ ok: true, json: async () => ({ data: { bills_total: 3, daily: [], sales_total: 99.5, sales_daily: [{ d: TODAY, v: 99.5 }, { d: 'bad' }] } }) }) });
    const s = await get();
    assert.equal(s.sales_total, 99.5);
    assert.deepEqual(s.sales_daily, [{ d: TODAY, n: 99.5 }]);
});

test('page: default layout includes the 4x1 sales card with ฿ prefix and a chart', async () => {
    const app = express();
    app.use('/v2', createV2App({ logger: silent }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try {
        const html = await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text();
        const card = /<article[^>]*data-widget="sales-total"[\s\S]*?<\/article>/.exec(html)[0];
        assert.match(card, /lp-size-4x1/);
        assert.match(card, /<span class="w-bills-cur">฿<\/span><span data-countup="1850000" data-format="compact">1\.85M<\/span><\/div>/);
        assert.match(card, /class="w-bills pos-right"/);
        assert.match(card, /data-chart="[^"]+"><canvas /);
        assert.match(card, /ยอดขายสุทธิ ทุกระบบ/);
        assert.match(card, /class="lp-badge"/, 'sample badge');
    } finally { await new Promise(r => server.close(r)); }
});
