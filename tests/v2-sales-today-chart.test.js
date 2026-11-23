const test = require('node:test');
const assert = require('node:assert/strict');
const mock = require('../v2/mock-data');
const { loadWidgets } = require('../v2/registry');
const { buildShareSpec } = require('../v2/chart');

const w = loadWidgets().get('sales-today');
const defaults = Object.fromEntries(w.settings.filter(s => !s.localized).map(s => [s.key, s.default]));
const run = (settings = {}, size = '2x2', locale = 'th') => w.getData({ mock, locale, settings: { ...defaults, ...settings }, size });

test('sales today: hourly Chart.js spec highlights the peak hour with its label and hour ticks', () => {
    const d = run();
    assert.equal(d.chart.type, 'bar');
    assert.equal(d.chart.values.length, mock.SALES_TODAY.hourly.length);
    assert.equal(d.chart.labels[d.chart.highlight], '12', 'peak = 12:00 in the sample day');
    assert.equal(d.chart.highlightLabel, 'ขายดีสุด');
    assert.equal(d.chart.xLabels, true);
    assert.equal(d.chart.tooltips[d.chart.highlight], '12:00 · ฿6,980');
    assert.equal(run({ show_peak: false }).chart.highlightLabel, undefined);
    assert.equal(run({ show_hours: false }).chart.xLabels, undefined);
    const small = run({}, '2x1');
    assert.equal(small.chart.highlightLabel, undefined, '2x1 is one row: no label above the bar');
    assert.equal(small.chart.xLabels, undefined);
    assert.equal(run({ show_chart: false }).chart, null);
});

test('sales today: payment share spec on 2x2 only, colours taken from the legend dots', () => {
    const d = run();
    assert.equal(d.pay.type, 'share');
    assert.deepEqual(d.pay.colorFrom, ['.w-dot.w-pay-qr', '.w-dot.w-pay-cash', '.w-dot.w-pay-card']);
    assert.equal(d.pay.tooltips[0], 'QR พร้อมเพย์ 58%');
    assert.equal(run({}, '2x1').pay, null);
    assert.equal(run({ showPayments: false }).pay, null);
    assert.equal(buildShareSpec([{ value: 0 }]), null, 'nothing to show');
});
