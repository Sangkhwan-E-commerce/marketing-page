const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');

const { formatStat } = require('../v2/format');
const { createStatsSource } = require('../v2/stats');
const { createV2App } = require('../v2');

const silent = { error() {} };

test('formatStat never rounds up', () => {
    assert.equal(formatStat(8950, 'compact'), '8.95k');
    assert.equal(formatStat(8959, 'compact'), '8.95k');
    assert.equal(formatStat(9000, 'compact'), '9k');
    assert.equal(formatStat(8950, 'plus'), '8.9k+');
    assert.equal(formatStat(9000, 'plus'), '9k');
    assert.equal(formatStat(8950, 'full'), '8,950');
    assert.equal(formatStat(999, 'compact'), '999');
    assert.equal(formatStat(1234567, 'compact'), '1.23M');
    assert.equal(formatStat(6580, 'compact'), '6.58k');
    assert.equal(formatStat(-5, 'compact'), '0');
});

test('browser formatter matches the server formatter', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'v2', 'public', 'js', 'v2.js'), 'utf8');
    const ctx = { window: { matchMedia: () => ({ matches: false }) }, Intl, Math, Number, String, console };
    vm.createContext(ctx);
    // ดึงเฉพาะส่วนสูตร (UNITS, floorTo, formatStat) + format มาตรฐาน
    const start = src.indexOf('    function format(');
    const end = src.indexOf('    // ตัวเลขนับขึ้น');
    vm.runInContext(`var locale = 'en';\n${src.slice(start, end)}\nthis.formatStat = formatStat;`, ctx);
    for (const n of [0, 7, 999, 1000, 1001, 6580, 8950, 8959, 9000, 12345, 999999, 1000000, 1234567, 987654321, 1500000000]) {
        for (const style of ['compact', 'plus', 'full']) {
            assert.equal(ctx.formatStat(n, style), formatStat(n, style, 'en'), `${n} ${style}`);
        }
    }
});

test('stats source: once per Thai day, dedupes, clear() on publish, retries failures every 15 min with the last good value', async () => {
    let t = Date.parse('2026-11-22T01:00:00Z'); // 08:00 เวลาไทย
    let calls = 0;
    let fail = false;
    const fetchImpl = async () => { calls++; if (fail) throw new Error('down'); return { ok: true, json: async () => ({ data: { bills_total: 6580 } }) }; };
    const get = createStatsSource({ appUrl: 'https://app.example.com', fetchImpl, now: () => t, logger: silent });
    const [a, b] = await Promise.all([get(), get()]);
    assert.equal(a.bills_total, 6580);
    assert.equal(b.bills_total, 6580);
    assert.equal(calls, 1, 'concurrent requests share one fetch');
    t += 15 * 3600 * 1000; await get(); // 23:00 วันเดิม
    assert.equal(calls, 1, 'same Thai day = no refetch');
    get.clear(); await get();
    assert.equal(calls, 2, 'clear() (publish) refetches');
    t += 2 * 3600 * 1000; fail = true; // 01:00 วันถัดไป ต่อไม่ได้
    assert.equal((await get()).bills_total, 6580, 'last good value on failure');
    assert.equal(calls, 3);
    t += 5 * 60 * 1000; await get();
    assert.equal(calls, 3, 'failed fetch is not retried on every request');
    t += 11 * 60 * 1000; await get();
    assert.equal(calls, 4, 'retried after 15 minutes');
    const none = createStatsSource({ appUrl: 'x', fetchImpl: async () => { throw new Error('no'); }, logger: silent });
    assert.equal(await none(), null);
});

async function render(layout, stats) {
    const app = express();
    app.use('/v2', createV2App({ logger: silent, loadPublished: async () => layout, loadStats: stats === undefined ? null : async () => stats }));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    try {
        return await (await fetch(`http://127.0.0.1:${server.address().port}/v2`)).text();
    } finally { await new Promise(r => server.close(r)); }
}
const cardHtml = (html) => (/<article[^>]*data-widget="bills-total"[\s\S]*?<\/article>/.exec(html) || [''])[0];

test('live data shows the real number with the live badge', async () => {
    const card = cardHtml(await render([{ widget: 'bills-total' }], { bills_total: 6580 }));
    assert.match(card, /data-countup="6580" data-format="compact">6\.58k</);
    assert.match(card, /lp-badge-live/);
    assert.ok(!card.includes('ตัวอย่าง'));
});

test('no data / below minimum / admin chose sample → 8.95k sample with the sample badge', async () => {
    for (const [layout, stats] of [
        [[{ widget: 'bills-total' }], null],
        [[{ widget: 'bills-total' }], undefined],
        [[{ widget: 'bills-total' }], { bills_total: 0 }],
        [[{ widget: 'bills-total', settings: { min_live: 10000 } }], { bills_total: 6580 }],
        [[{ widget: 'bills-total', source: 'mock' }], { bills_total: 6580 }]
    ]) {
        const card = cardHtml(await render(layout, stats));
        assert.match(card, />8\.95k</, JSON.stringify(layout));
        assert.ok(!card.includes('lp-badge-live'), 'never a live badge on sample numbers');
        assert.match(card, /class="lp-badge"/);
    }
});

test('fallback "hide" removes the card instead of showing a sample', async () => {
    const html = await render([{ widget: 'bills-total', settings: { fallback: 'hide' } }, { widget: 'stock-expiry' }], null);
    assert.equal(cardHtml(html), '');
    assert.match(html, /data-widget="stock-expiry"/);
    const shown = await render([{ widget: 'bills-total', settings: { fallback: 'hide', format: 'full' } }], { bills_total: 6580 });
    assert.match(cardHtml(shown), />6,580</);
});

test('the stat card is not listed as a product feature in JSON-LD or llms.txt', async () => {
    const html = await render([{ widget: 'bills-total' }], { bills_total: 6580 });
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
    const features = ld['@graph'][3].featureList.join(' ');
    assert.ok(!features.includes('บิลที่ออกผ่าน'));
    assert.ok(features.includes('ยอดขายวันนี้'));
});

test('live card shows "data as of" the date the stats were computed (Thai time)', async () => {
    // 2026-11-22T18:00Z = 23 พ.ย. 01:00 เวลาไทย
    const card = cardHtml(await render([{ widget: 'bills-total', size: '2x2' }], { bills_total: 6580, daily: [{ d: '2026-11-22', n: 6580 }], updated_at: '2026-11-22T18:00:00Z' }));
    assert.match(card, /<p class="w-bills-updated">[^<]*<i[^>]*><\/i> ข้อมูล ณ 23 พ\.ย\. 2569<\/p>/);
    const sample = cardHtml(await render([{ widget: 'bills-total', size: '2x2' }], null));
    assert.ok(!sample.includes('w-bills-updated'), 'no date on sample numbers');
});
