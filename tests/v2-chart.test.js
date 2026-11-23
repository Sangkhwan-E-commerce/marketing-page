const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { summarize, periodRange, todayIn } = require('../v2/series');
const { buildChartSpec } = require('../v2/chart');
const { specOf } = require('./v2-chart-bleed.test.js');
const mock = require('../v2/mock-data');
const { loadWidgets, SIZES } = require('../v2/registry');
const { createV2App } = require('../v2');

const silent = { error() {} };
const widgets = loadWidgets();
const bills = widgets.get('bills-total');
const DAILY = [
    { d: '2024-12-31', n: 5 },
    { d: '2025-01-01', n: 10 }, { d: '2025-06-15', n: 20 }, { d: '2025-12-31', n: 30 },
    { d: '2026-01-02', n: 40 }, { d: '2026-11-20', n: 50 }, { d: '2026-11-22', n: 60 }
];
const TODAY = '2026-11-22';

test('3x1 is a standard size; bills-total offers the wide sizes', () => {
    assert.deepEqual(SIZES, ['1x1', '2x1', '1x2', '2x2', '3x1', '4x1', '4x2']);
    for (const s of ['3x1', '4x1', '2x2']) assert.ok(bills.sizes.includes(s), s);
});

test('periods: all / this year / last year / custom, counting both ends', () => {
    assert.equal(summarize(DAILY, 'all', {}, TODAY).total, 215);
    assert.equal(summarize(DAILY, 'this_year', {}, TODAY).total, 150);
    assert.equal(summarize(DAILY, 'last_year', {}, TODAY).total, 60);
    assert.equal(summarize(DAILY, 'custom', { from: '2025-06-15', to: '2026-01-02' }, TODAY).total, 90);
    assert.deepEqual(periodRange('custom', { from: '2026-02-01', to: '2025-01-01' }, TODAY, '2024-12-31'), { from: '2025-01-01', to: '2026-02-01' }, 'swapped dates are fixed');
    assert.deepEqual(periodRange('custom', { from: 'bad', to: '' }, TODAY, '2024-12-31'), { from: '2024-12-31', to: TODAY }, 'empty/invalid dates = first day … today');
    assert.equal(summarize([], 'all', {}, TODAY).total, 0);
});

test('chart buckets: day ≤ 62 days, month ≤ ~3 years, year beyond; gaps filled with 0', () => {
    const days = summarize(DAILY, 'custom', { from: '2026-11-18', to: '2026-11-22' }, TODAY);
    assert.equal(days.bucket, 'day');
    assert.deepEqual(days.points.map(p => p.value), [0, 0, 50, 0, 60]);
    const months = summarize(DAILY, 'this_year', {}, TODAY);
    assert.equal(months.bucket, 'month');
    assert.equal(months.points.length, 11);
    assert.equal(months.points[0].value, 40);
    assert.equal(months.points[10].value, 110);
    const years = summarize([{ d: '2020-03-01', n: 1 }, ...DAILY], 'all', {}, TODAY);
    assert.equal(years.bucket, 'year');
    assert.deepEqual(years.points.map(p => p.key), ['2020', '2021', '2022', '2023', '2024', '2025', '2026']);
});

test('sample series totals exactly the 8,950 sample number', () => {
    const daily = mock.mockDaily(TODAY);
    assert.equal(daily.reduce((s, r) => s + r.n, 0), mock.BILLS_TOTAL);
    assert.equal(daily[daily.length - 1].d, TODAY);
    assert.ok(daily.every(r => r.n >= 0));
    assert.deepEqual(mock.mockDaily(TODAY), daily, 'same numbers every time');
});

test('buildChartSpec hands Chart.js labels, non-negative values and tooltips', () => {
    const pts = [{ label: 'a', value: 1, tooltip: '1 บิล' }, { label: 'b', value: -3, tooltip: '฿<3>' }];
    const spec = buildChartSpec(pts, 'bar', { ariaLabel: 'x' });
    assert.deepEqual(spec, { type: 'bar', labels: ['a', 'b'], values: [1, 0], tooltips: ['1 บิล', '฿<3>'], edge: false, ariaLabel: 'x' });
    assert.equal(buildChartSpec(pts, 'pie').type, 'bar', 'unknown type → bar');
    assert.equal(buildChartSpec(pts, 'area').type, 'area');
    assert.equal(buildChartSpec([], 'bar'), null);
});

test('widget: period label always shown, chart position follows settings and size', () => {
    const run = (settings, size = '2x1', stats = null, source = 'mock') =>
        bills.getData({ mock, locale: 'th', settings: { ...defaults(), ...settings }, source, size, stats, today: TODAY });
    const defaults = () => Object.fromEntries(bills.settings.filter(s => !s.localized).map(s => [s.key, s.default]));
    assert.equal(run({}, '1x1').position, 'none', '1x1 auto = number only');
    assert.equal(run({}, '2x2').position, 'bottom');
    assert.equal(run({}, '3x1').position, 'right');
    assert.equal(run({ chart_position: 'left' }).position, 'left');
    assert.equal(run({ chart_position: 'only' }).position, 'only');
    assert.equal(run({ chart_type: 'line' }).chart.type, 'line');
    assert.equal(run({}).periodLabel, 'ตั้งแต่เปิดใช้งาน');
    assert.equal(run({ period: 'this_year' }).periodLabel, 'ปี พ.ศ. 2569', 'Thai page uses the Buddhist year');
    assert.match(run({ period: 'custom', from: '2026-01-01', to: '2026-03-31' }).periodLabel, /1 ม\.ค\. 2569 – 31 มี\.ค\. 2569/);

    const live = { bills_total: 215, daily: DAILY };
    const r = run({ period: 'last_year', format: 'full' }, '2x1', live, 'live');
    assert.equal(r.source, 'live');
    assert.equal(r.value, 60);
    assert.equal(r.display, '60');
    assert.equal(run({ period: 'all', format: 'full' }, '2x1', { bills_total: 6580 }, 'live').display, '6,580', 'old stats without daily: all-time total still works');
});

test('page: wide card with chart on the left and live this-year number', async () => {
    const app = express();
    app.use('/v2', createV2App({
        logger: silent,
        loadPublished: async () => [{ widget: 'bills-total', size: '3x1', settings: { period: 'this_year', chart_type: 'area', chart_position: 'left', format: 'full' } }],
        loadStats: async () => ({ bills_total: 215, daily: DAILY.map(r => ({ ...r, d: r.d.replace('2026', todayIn().slice(0, 4)).replace('2025', String(Number(todayIn().slice(0, 4)) - 1)) })) })
    }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try {
        const html = await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text();
        const card = /<article[^>]*data-widget="bills-total"[\s\S]*?<\/article>/.exec(html)[0];
        assert.match(card, /lp-size-3x1/);
        assert.match(card, /class="w-bills pos-left"/);
        assert.equal(specOf(card).type, 'area');
        assert.match(card, /<canvas role="img" aria-label="[^"]+"><\/canvas>/);
        assert.match(html, /<script src="\/v2\/assets\/vendor\/chartjs\/4\.5\.1\/chart\.umd\.min\.js"><\/script>/, 'Chart.js loaded from our own files');
        assert.match(card, /w-bills-period/);
        assert.match(card, /lp-badge-live/);
    } finally { await new Promise(r => server.close(r)); }
});
