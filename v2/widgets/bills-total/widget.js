// บิลที่ออกผ่าน Lullapos — การ์ดข้อมูลจริงใบแรก (เจ้าของสั่ง 2026-11-22)
//    จำนวนบิลทุกระบบตั้งแต่เปิดระบบ จาก pos-free-app (นิยามเดียวกับการคิดค่าบริการ: utils/billableBills.js)
//    ยังไม่มีข้อมูล / ต่อไม่ได้ / น้อยกว่าเกณฑ์ → ตัวเลขสมมุติ 8,950 พร้อมป้าย "ตัวอย่าง" (หรือซ่อนการ์ด)
//    ⚠️ ห้ามคูณ/แต่งตัวเลขจริง (เจ้าของตกลง 2026-11-22 — โฆษณาเกินจริง) · รูปแบบย่อปัดลงเสมอ (v2/format.js)
const { FORMATS, formatStat } = require('../../format');

module.exports = {
    id: 'bills-total',
    category: 'platform',
    sizes: ['1x1', '2x1'],
    defaultSize: '1x1',
    dataSources: ['live', 'mock'],
    tone: 'blue',
    feature: false, // เป็นสถิติ ไม่ใช่ความสามารถของระบบ — ไม่ใส่ใน featureList / llms.txt
    settings: [
        {
            key: 'tone', type: 'select', default: 'blue',
            label: { th: 'สีพื้นสำเร็จรูป', en: 'Preset colour' },
            options: [
                { value: 'blue', label: { th: 'น้ำเงิน', en: 'Blue' } },
                { value: 'dark', label: { th: 'เข้ม', en: 'Dark' } },
                { value: 'green', label: { th: 'เขียว', en: 'Green' } },
                { value: 'light', label: { th: 'ขาว', en: 'White' } }
            ]
        },
        {
            key: 'format', type: 'select', default: 'compact',
            label: { th: 'รูปแบบตัวเลข', en: 'Number format' },
            options: [
                { value: 'compact', label: { th: 'ย่อ (8.95k)', en: 'Short (8.95k)' } },
                { value: 'full', label: { th: 'เต็ม (8,950)', en: 'Full (8,950)' } },
                { value: 'plus', label: { th: 'มากกว่า (8.9k+)', en: 'At least (8.9k+)' } }
            ]
        },
        { key: 'min_live', type: 'number', default: 1, min: 1, max: 100000000, label: { th: 'แสดงข้อมูลจริงเมื่อมีบิลอย่างน้อย', en: 'Show live data from at least this many bills' } },
        {
            key: 'fallback', type: 'select', default: 'mock',
            label: { th: 'ถ้ายังไม่ถึงเกณฑ์หรือดึงข้อมูลไม่ได้', en: 'Below the minimum or no data' },
            options: [
                { value: 'mock', label: { th: 'แสดงตัวเลขตัวอย่าง (มีป้าย "ตัวอย่าง")', en: 'Show a sample number (marked "Sample")' } },
                { value: 'hide', label: { th: 'ซ่อนการ์ด', en: 'Hide the card' } }
            ]
        },
        { key: 'caption', type: 'text', localized: true, default: '', maxLength: 80,
            label: { th: 'ข้อความใต้ตัวเลข', en: 'Line under the number' },
            hint: { th: 'เว้นว่าง = "ทุกระบบ ตั้งแต่เปิดใช้งาน"', en: 'Empty = "every module, since launch"' } },
        { key: 'show_caption', type: 'boolean', default: true, label: { th: 'แสดงข้อความใต้ตัวเลข', en: 'Show the line under the number' } },
        { key: 'show_channels', type: 'boolean', default: true, label: { th: 'แสดงรายชื่อระบบ', en: 'Show the module list' } },
        { key: 'show_updated', type: 'boolean', default: true, label: { th: 'แสดง "อัปเดตทุก 10 นาที" (ข้อมูลจริง)', en: 'Show "Updated every 10 minutes" (live)' } }
    ],
    text: {
        th: {
            name: 'บิลที่ออกผ่าน Lullapos',
            description: 'จำนวนบิลทุกระบบที่ร้านค้าออกผ่าน Lullapos ตั้งแต่เปิดระบบ',
            unit: 'บิล',
            caption: 'ทุกระบบ ตั้งแต่เปิดใช้งาน',
            channels: 'ขายหน้าร้าน · บริการ · คลินิก · ขายส่ง · อื่นๆ',
            updated: 'อัปเดตทุก 10 นาที'
        },
        en: {
            name: 'Bills issued with Lullapos',
            description: 'Bills issued by stores across every part of Lullapos since launch',
            unit: 'bills',
            caption: 'every module, since launch',
            channels: 'POS · services · clinics · wholesale · more',
            updated: 'Updated every 10 minutes'
        }
    },
    getData({ mock, locale, settings, source, stats }) {
        const format = FORMATS.includes(settings.format) ? settings.format : 'compact';
        const real = stats && Number.isFinite(stats.bills_total) ? stats.bills_total : null;
        const live = source === 'live' && real !== null && real >= settings.min_live;
        if (!live && source === 'live' && settings.fallback === 'hide') return { hidden: true };
        const value = live ? real : mock.BILLS_TOTAL;
        return { source: live ? 'live' : 'mock', value, format, display: formatStat(value, format, locale) };
    }
};
