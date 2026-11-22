// กันข้อความในการ์ดล้นขึ้นไปทับหัวการ์ด (เจ้าของเห็นจริงบนเว็บ 2026-11-22)
//    สาเหตุ: จัดเนื้อหาชิดล่างด้วย justify-content: flex-end แล้วเนื้อหาสูงกว่าการ์ด → ล้นขึ้นด้านบน
//    กติกา: กล่องเนื้อหาของการ์ดตัดส่วนที่ล้น (overflow: hidden) · Widget จัดชิดล่างด้วย margin-top: auto แทน
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'v2');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
// คอลัมน์แท่งกราฟของ sales-today จัดแท่งชิดล่างในกล่องที่สูงคงที่ ไม่มีข้อความ — ใช้ flex-end ได้
const ALLOWED = ['.w-sales-col', '.lp-card-head.is-untitled'];

test('card body clips overflow instead of spilling over the header', () => {
    assert.match(read('public/css/v2.css'), /\.lp-card-body \{[^}]*overflow: hidden;/);
});

test('widgets do not bottom-align text with justify-content: flex-end', () => {
    const files = ['public/css/v2.css', ...fs.readdirSync(path.join(root, 'widgets')).map(w => `widgets/${w}/style.css`).filter(f => fs.existsSync(path.join(root, f)))];
    for (const f of files) {
        // ตัดคอมเมนต์ออกก่อน — คอมเมนต์อธิบายกติกานี้เองก็มีคำว่า flex-end
        for (const rule of read(f).replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
            if (!/justify-content:\s*flex-end/.test(rule)) continue;
            const selector = rule.split('{')[0].trim();
            assert.ok(ALLOWED.some(a => selector.includes(a)), `${f}: "${selector}" uses justify-content: flex-end — use margin-top: auto on the first child`);
        }
    }
});

test('live badge text is short; the full meaning is in the tooltip', () => {
    const { MESSAGES } = require('../v2/i18n');
    assert.ok(MESSAGES.th['badge.live'].length <= 12);
    assert.ok(MESSAGES.th['badge.live_title'] && MESSAGES.en['badge.live_title']);
});
