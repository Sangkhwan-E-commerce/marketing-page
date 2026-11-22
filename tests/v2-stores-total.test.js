const test = require('node:test');
const assert = require('node:assert/strict');

const mock = require('../v2/mock-data');
const { loadWidgets } = require('../v2/registry');
const { createStatsSource } = require('../v2/stats');

const widgets = loadWidgets();
const stores = widgets.get('stores-total');
const bills = widgets.get('bills-total');
const TODAY = '2026-11-22';
const DAILY = [{ d: '2025-03-01', n: 4 }, { d: '2026-02-10', n: 3 }, { d: '2026-09-09', n: 6 }, { d: '2026-11-20', n: 2 }];
const defaultsOf = (w) => Object.fromEntries(w.settings.filter(s => !s.localized).map(s => [s.key, s.default]));
const run = (w, settings, stats = { stores_total: 15, stores_daily: DAILY }, size = '2x1') =>
    w.getData({ mock, locale: 'th', settings: { ...defaultsOf(w), ...settings }, source: 'live', size, stats, today: TODAY });
// ค่าของแท่ง/จุดในกราฟ อ่านจาก <title> ("ป้าย: n ร้าน")
const values = (svg) => [...svg.matchAll(/<title>[^<]*: ([\d,]+)/g)].map(m => Number(m[1].replace(/,/g, '')));

test('stores card: live total, period caption switches to "new stores", unit ร้าน', () => {
    assert.ok(stores && stores.feature === false);
    const all = run(stores, { format: 'full' });
    assert.equal(all.source, 'live');
    assert.equal(all.value, 15);
    assert.equal(all.caption, 'ร้านค้าที่เปิดใช้งาน');
    const year = run(stores, { period: 'this_year', format: 'full' });
    assert.equal(year.value, 11, 'stores opened this year');
    assert.equal(year.caption, 'ร้านค้าเปิดใหม่');
    assert.equal(run(stores, { period: 'this_year', caption_th: 'ร้านใหม่ปีนี้' }).caption, 'ร้านใหม่ปีนี้', 'admin caption wins');
    assert.equal(stores.text.th.unit, 'ร้าน');
});

test('cumulative chart starts from stores opened before the period and ends at the total', () => {
    assert.equal(defaultsOf(stores).chart_values, 'cumulative');
    assert.equal(defaultsOf(bills).chart_values, 'per_period', 'bills/sales keep per-period bars by default');
    const year = values(run(stores, { period: 'this_year', chart_type: 'line' }).chart);
    assert.equal(year[0], 4, 'Jan 2026 = 4 stores opened in 2025, nothing new yet');
    assert.equal(year[1], 7, 'Feb 2026 = +3');
    assert.equal(year[year.length - 1], 15, 'ends at the current total');
    const perPeriod = values(run(stores, { period: 'this_year', chart_values: 'per_period' }).chart);
    assert.equal(perPeriod.reduce((a, b) => a + b, 0), 11);
});

test('no live data → sample 128 stores with the sample badge', () => {
    const r = stores.getData({ mock, locale: 'th', settings: defaultsOf(stores), source: 'live', size: '1x1', stats: null, today: TODAY });
    assert.equal(r.source, 'mock');
    assert.equal(r.value, mock.STORES_TOTAL);
    assert.equal(r.display, '128');
    // ยอดน้อยต้องกระจายตามเส้นการเติบโต ไม่กองไว้ท้ายช่วง (กราฟยอดสะสมแบนแล้วพุ่ง — เจอ 2026-11-22)
    const days = mock.mockDaily(TODAY, 800, mock.STORES_TOTAL);
    const half = days.slice(0, 400).reduce((s, d) => s + d.n, 0);
    assert.ok(half >= 20 && half <= 64, `first half has ${half} of 128`);
    assert.ok(Math.max(...days.map(d => d.n)) <= 2, 'no spike day');
});

test('stats source keeps stores_total / stores_daily', async () => {
    const get = createStatsSource({ appUrl: 'x', logger: { error() {} }, fetchImpl: async () => ({ ok: true, json: async () => ({ data: { bills_total: 1, daily: [], stores_total: 9, stores_daily: [{ d: TODAY, n: 9 }, { d: 1 }] } }) }) });
    const s = await get();
    assert.equal(s.stores_total, 9);
    assert.deepEqual(s.stores_daily, [{ d: TODAY, n: 9 }]);
});
