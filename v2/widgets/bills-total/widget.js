// บิลที่ออกผ่าน Lullapos — การ์ดข้อมูลจริงใบแรก (เจ้าของสั่ง 2026-11-22)
//    จำนวนบิลทุกระบบ จาก pos-free-app (นิยามเดียวกับการคิดค่าบริการ: utils/billableBills.js) เป็นรายวันตามเวลาไทย
//    เลือกช่วง: ทั้งหมด / ปีนี้ / ปีที่แล้ว / กำหนดเอง · กราฟแท่ง/เส้น/พื้นที่ · ตำแหน่งกราฟ ซ้าย/ขวา/บน/ล่าง/เฉพาะตัวเลข/เฉพาะกราฟ
//    ยังไม่มีข้อมูล / ต่อไม่ได้ / น้อยกว่าเกณฑ์ → ชุดสมมุติรวม 8,950 พร้อมป้าย "ตัวอย่าง" (หรือซ่อนการ์ด)
//    ⚠️ ห้ามคูณ/แต่งตัวเลขจริง (เจ้าของตกลง 2026-11-22) · รูปแบบย่อปัดลงเสมอ (v2/format.js)
//    ⚠️ บรรทัดบอกช่วงเวลาซ่อนไม่ได้ — คนดูต้องรู้ว่าตัวเลขนับช่วงไหน
const { FORMATS, formatStat } = require('../../format');
const { PERIODS, summarize, todayIn } = require('../../series');
const { CHART_TYPES, renderChart } = require('../../chart');

const POSITIONS = ['auto', 'right', 'left', 'top', 'bottom', 'none', 'only'];
const opt = (value, th, en) => ({ value, label: { th, en } });

function autoPosition(size) {
    if (size === '1x1' || size === '1x2') return size === '1x2' ? 'bottom' : 'none';
    if (size === '2x2') return 'bottom';
    return 'right';
}

const NUMBER_LOCALE = { th: 'th-TH', en: 'en-GB' };
function fmtDate(d, locale, opts) {
    return new Intl.DateTimeFormat(NUMBER_LOCALE[locale] || 'th-TH', { timeZone: 'UTC', ...opts }).format(new Date(`${d}T00:00:00Z`));
}
function pointLabel(key, bucket, locale) {
    if (bucket === 'day') return fmtDate(key, locale, { day: 'numeric', month: 'short' });
    if (bucket === 'month') return fmtDate(`${key}-01`, locale, { month: 'short', year: '2-digit' });
    return fmtDate(`${key}-01-01`, locale, { year: 'numeric' });
}
function periodLabel(period, sum, locale, text) {
    if (period === 'all') return text.period_all;
    if (period === 'this_year' || period === 'last_year') return text.period_year.replace('{year}', fmtDate(sum.from, locale, { year: 'numeric' }));
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${fmtDate(sum.from, locale, opts)} – ${fmtDate(sum.to, locale, opts)}`;
}

module.exports = {
    id: 'bills-total',
    category: 'platform',
    sizes: ['1x1', '2x1', '1x2', '2x2', '3x1', '4x1'],
    defaultSize: '1x1',
    dataSources: ['live', 'mock'],
    tone: 'blue',
    feature: false, // เป็นสถิติ ไม่ใช่ความสามารถของระบบ — ไม่ใส่ใน featureList / llms.txt
    settings: [
        { key: 'tone', type: 'select', default: 'blue', label: { th: 'สีพื้นสำเร็จรูป', en: 'Preset colour' },
            options: [opt('blue', 'น้ำเงิน', 'Blue'), opt('dark', 'เข้ม', 'Dark'), opt('green', 'เขียว', 'Green'), opt('light', 'ขาว', 'White')] },
        { key: 'period', type: 'select', default: 'all', label: { th: 'ช่วงเวลา', en: 'Period' },
            options: [opt('all', 'ทั้งหมดตั้งแต่เปิดระบบ', 'All time'), opt('this_year', 'ปีนี้', 'This year'), opt('last_year', 'ปีที่แล้ว', 'Last year'), opt('custom', 'กำหนดช่วงเอง', 'Custom range')] },
        { key: 'from', type: 'date', default: '', showIf: { key: 'period', value: 'custom' }, label: { th: 'ตั้งแต่วันที่', en: 'From' },
            hint: { th: 'เว้นว่าง = วันแรกที่มีข้อมูล', en: 'Empty = first day with data' } },
        { key: 'to', type: 'date', default: '', showIf: { key: 'period', value: 'custom' }, label: { th: 'ถึงวันที่', en: 'To' },
            hint: { th: 'เว้นว่าง = วันนี้', en: 'Empty = today' } },
        { key: 'format', type: 'select', default: 'compact', label: { th: 'รูปแบบตัวเลข', en: 'Number format' },
            options: [opt('compact', 'ย่อ (8.95k)', 'Short (8.95k)'), opt('full', 'เต็ม (8,950)', 'Full (8,950)'), opt('plus', 'มากกว่า (8.9k+)', 'At least (8.9k+)')] },
        { key: 'chart_type', type: 'select', default: 'bar', label: { th: 'รูปแบบกราฟ', en: 'Chart type' },
            options: [opt('bar', 'กราฟแท่ง', 'Bars'), opt('line', 'กราฟเส้น', 'Line'), opt('area', 'กราฟพื้นที่', 'Area')] },
        { key: 'chart_position', type: 'select', default: 'auto', label: { th: 'ตำแหน่งกราฟ', en: 'Chart position' },
            options: [opt('auto', 'อัตโนมัติตามขนาดการ์ด', 'Automatic for the card size'), opt('right', 'กราฟอยู่ขวา', 'Chart on the right'), opt('left', 'กราฟอยู่ซ้าย', 'Chart on the left'),
                opt('top', 'กราฟอยู่บน', 'Chart on top'), opt('bottom', 'กราฟอยู่ล่าง', 'Chart below'), opt('none', 'แสดงเฉพาะตัวเลข', 'Number only'), opt('only', 'แสดงเฉพาะกราฟ', 'Chart only')],
            hint: { th: 'อัตโนมัติ: 1x1 = เฉพาะตัวเลข · 2x2/1x2 = กราฟล่าง · การ์ดกว้าง = กราฟขวา', en: 'Automatic: 1x1 = number only · 2x2/1x2 = below · wide cards = right' } },
        { key: 'show_axis', type: 'boolean', default: true, label: { th: 'แสดงช่วงวันที่ใต้กราฟ', en: 'Show dates under the chart' } },
        { key: 'min_live', type: 'number', default: 1, min: 1, max: 100000000, label: { th: 'แสดงข้อมูลจริงเมื่อมีบิล (ทั้งหมด) อย่างน้อย', en: 'Show live data from at least this many bills (all time)' } },
        { key: 'fallback', type: 'select', default: 'mock', label: { th: 'ถ้ายังไม่ถึงเกณฑ์หรือดึงข้อมูลไม่ได้', en: 'Below the minimum or no data' },
            options: [opt('mock', 'แสดงตัวเลขตัวอย่าง (มีป้าย "ตัวอย่าง")', 'Show a sample number (marked "Sample")'), opt('hide', 'ซ่อนการ์ด', 'Hide the card')] },
        { key: 'caption', type: 'text', localized: true, default: '', maxLength: 80, label: { th: 'ข้อความใต้ตัวเลข', en: 'Line under the number' },
            hint: { th: 'เว้นว่าง = "ทุกระบบ" · บรรทัดบอกช่วงเวลาแสดงเสมอ', en: 'Empty = "every module" · the period line always shows' } },
        { key: 'show_caption', type: 'boolean', default: true, label: { th: 'แสดงข้อความใต้ตัวเลข', en: 'Show the line under the number' } },
        { key: 'show_channels', type: 'boolean', default: true, label: { th: 'แสดงรายชื่อระบบ', en: 'Show the module list' } },
        { key: 'show_updated', type: 'boolean', default: true, label: { th: 'แสดง "อัปเดตทุก 10 นาที" (ข้อมูลจริง)', en: 'Show "Updated every 10 minutes" (live)' } }
    ],
    text: {
        th: {
            name: 'บิลที่ออกผ่าน Lullapos',
            description: 'จำนวนบิลทุกระบบที่ร้านค้าออกผ่าน Lullapos เลือกช่วงเวลาและกราฟได้',
            unit: 'บิล',
            caption: 'ทุกระบบ',
            period_all: 'ตั้งแต่เปิดใช้งาน',
            period_year: 'ปี {year}',
            channels: 'ขายหน้าร้าน · บริการ · คลินิก · ขายส่ง · อื่นๆ',
            updated: 'อัปเดตทุก 10 นาที',
            chart: 'กราฟจำนวนบิล {period}'
        },
        en: {
            name: 'Bills issued with Lullapos',
            description: 'Bills issued by stores across every part of Lullapos, with a period and chart',
            unit: 'bills',
            caption: 'every module',
            period_all: 'since launch',
            period_year: '{year}',
            channels: 'POS · services · clinics · wholesale · more',
            updated: 'Updated every 10 minutes',
            chart: 'Bills chart, {period}'
        }
    },
    getData({ mock, locale, settings, source, stats, size, today = todayIn() }) {
        const format = FORMATS.includes(settings.format) ? settings.format : 'compact';
        const period = PERIODS.includes(settings.period) ? settings.period : 'all';
        const real = stats && Number.isFinite(stats.bills_total) ? stats.bills_total : null;
        const live = source === 'live' && real !== null && real >= settings.min_live;
        if (!live && source === 'live' && settings.fallback === 'hide') return { hidden: true };

        const daily = live ? (stats.daily || []) : mock.mockDaily(today);
        const sum = summarize(daily, period, { from: settings.from, to: settings.to }, today);
        // ข้อมูลจริงรุ่นเก่าที่ไม่มีรายวัน: ใช้ยอดรวมได้เฉพาะช่วง "ทั้งหมด"
        const value = live && !daily.length && period === 'all' ? real : sum.total;

        const position = POSITIONS.includes(settings.chart_position) && settings.chart_position !== 'auto' ? settings.chart_position : autoPosition(size);
        const chartType = CHART_TYPES.includes(settings.chart_type) ? settings.chart_type : 'bar';
        const label = periodLabel(period, sum, locale, this.text[locale] || this.text.th);
        const unit = (this.text[locale] || this.text.th).unit;
        const points = sum.points.map(p => {
            const l = pointLabel(p.key, sum.bucket, locale);
            return { label: l, value: p.value, title: `${l}: ${new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(p.value)} ${unit}` };
        });
        const showChart = position !== 'none' && points.length > 1;
        return {
            source: live ? 'live' : 'mock',
            value,
            format,
            display: formatStat(value, format, locale),
            periodLabel: label,
            position: showChart ? position : 'none',
            chart: showChart ? renderChart(points, chartType, { ariaLabel: (this.text[locale] || this.text.th).chart.replace('{period}', label) }) : '',
            axis: showChart && settings.show_axis ? { first: points[0].label, last: points[points.length - 1].label } : null
        };
    }
};
