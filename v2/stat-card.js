// 🌟 การ์ดสถิติทั้งระบบ (ใช้ร่วม: bills-total จำนวนบิล · sales-total ยอดขายรวม) — เจ้าของสั่ง 2026-11-22
//    ตัวเลขรายวันตามเวลาไทยจาก pos-free-app (/api/public/marketing-web/stats ผ่าน v2/stats.js)
//    เลือกช่วง: ทั้งหมด / ปีนี้ / ปีที่แล้ว / กำหนดเอง · กราฟแท่ง/เส้น/พื้นที่ · ตำแหน่งกราฟ ซ้าย/ขวา/บน/ล่าง/เฉพาะตัวเลข/เฉพาะกราฟ
//    ยังไม่มีข้อมูล / ต่อไม่ได้ / น้อยกว่าเกณฑ์ → ชุดสมมุติ (mock-data.js mockDaily) พร้อมป้าย "ตัวอย่าง" (หรือซ่อนการ์ด)
//    ⚠️ ห้ามคูณ/แต่งตัวเลขจริง (เจ้าของตกลง 2026-11-22) · รูปแบบย่อปัดลงเสมอ (v2/format.js)
//    ⚠️ บรรทัดบอกช่วงเวลาซ่อนไม่ได้ — คนดูต้องรู้ว่าตัวเลขนับช่วงไหน
//    หน้าตาใช้ widgets/bills-total/view.ejs + style.css ร่วมกัน (คลาส w-bills-*)
const { FORMATS, formatStat } = require('./format');
const { PERIODS, summarize, todayIn } = require('./series');
const { CHART_TYPES, renderChart } = require('./chart');

const POSITIONS = ['auto', 'right', 'left', 'top', 'bottom', 'none', 'only'];
const NUMBER_LOCALE = { th: 'th-TH', en: 'en-GB' };
const opt = (value, th, en) => ({ value, label: { th, en } });

function autoPosition(size) {
    if (size === '1x1') return 'none';
    if (size === '2x2' || size === '1x2') return 'bottom';
    return 'right';
}
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
    const o = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${fmtDate(sum.from, locale, o)} – ${fmtDate(sum.to, locale, o)}`;
}

// metric: { totalKey, dailyKey, valueKey, mockTotal, examples: { compact, full, plus }, minLabel }
function createStatWidget({ id, tone = 'blue', metric, text, defaultSize = '1x1' }) {
    const settings = [
        { key: 'tone', type: 'select', default: tone, label: { th: 'สีพื้นสำเร็จรูป', en: 'Preset colour' },
            options: [opt('blue', 'น้ำเงิน', 'Blue'), opt('dark', 'เข้ม', 'Dark'), opt('green', 'เขียว', 'Green'), opt('light', 'ขาว', 'White')] },
        { key: 'period', type: 'select', default: 'all', label: { th: 'ช่วงเวลา', en: 'Period' },
            options: [opt('all', 'ทั้งหมดตั้งแต่เปิดระบบ', 'All time'), opt('this_year', 'ปีนี้', 'This year'), opt('last_year', 'ปีที่แล้ว', 'Last year'), opt('custom', 'กำหนดช่วงเอง', 'Custom range')] },
        { key: 'from', type: 'date', default: '', showIf: { key: 'period', value: 'custom' }, label: { th: 'ตั้งแต่วันที่', en: 'From' },
            hint: { th: 'เว้นว่าง = วันแรกที่มีข้อมูล', en: 'Empty = first day with data' } },
        { key: 'to', type: 'date', default: '', showIf: { key: 'period', value: 'custom' }, label: { th: 'ถึงวันที่', en: 'To' },
            hint: { th: 'เว้นว่าง = วันนี้', en: 'Empty = today' } },
        { key: 'format', type: 'select', default: 'compact', label: { th: 'รูปแบบตัวเลข', en: 'Number format' },
            options: [opt('compact', `ย่อ (${metric.examples.compact})`, `Short (${metric.examples.compact})`), opt('full', `เต็ม (${metric.examples.full})`, `Full (${metric.examples.full})`),
                opt('plus', `มากกว่า (${metric.examples.plus})`, `At least (${metric.examples.plus})`)] },
        { key: 'chart_type', type: 'select', default: 'bar', label: { th: 'รูปแบบกราฟ', en: 'Chart type' },
            options: [opt('bar', 'กราฟแท่ง', 'Bars'), opt('line', 'กราฟเส้น', 'Line'), opt('area', 'กราฟพื้นที่', 'Area')] },
        { key: 'chart_position', type: 'select', default: 'auto', label: { th: 'ตำแหน่งกราฟ', en: 'Chart position' },
            options: [opt('auto', 'อัตโนมัติตามขนาดการ์ด', 'Automatic for the card size'), opt('right', 'กราฟอยู่ขวา', 'Chart on the right'), opt('left', 'กราฟอยู่ซ้าย', 'Chart on the left'),
                opt('top', 'กราฟอยู่บน', 'Chart on top'), opt('bottom', 'กราฟอยู่ล่าง', 'Chart below'), opt('none', 'แสดงเฉพาะตัวเลข', 'Number only'), opt('only', 'แสดงเฉพาะกราฟ', 'Chart only')],
            hint: { th: 'อัตโนมัติ: 1x1 = เฉพาะตัวเลข · 2x2/1x2 = กราฟล่าง · การ์ดกว้าง = กราฟขวา · การ์ด 1x1 พื้นที่น้อย แนะนำ "เฉพาะตัวเลข" หรือ "เฉพาะกราฟ"', en: 'Automatic: 1x1 = number only · 2x2/1x2 = below · wide cards = right · 1x1 is small: "Number only" or "Chart only" work best' } },
        { key: 'chart_values', type: 'select', default: metric.defaultChartValues || 'per_period', label: { th: 'กราฟแสดง', en: 'Chart shows' },
            options: [opt('per_period', 'เพิ่มใหม่ในแต่ละช่วง', 'New in each period'), opt('cumulative', 'ยอดสะสม', 'Running total')] },
        { key: 'chart_bleed', type: 'boolean', default: false, label: { th: 'กราฟเต็มขอบการ์ด (ไม่มีระยะขอบ)', en: 'Chart to the card edges (no padding)' },
            hint: { th: 'กราฟชนขอบการ์ดด้านที่กราฟอยู่ · เหมาะกับกราฟพื้นที่/เส้น ตำแหน่งล่างหรือเฉพาะกราฟ', en: 'The chart touches the card edges on its side · best with area/line charts below or chart only' } },
        { key: 'show_axis', type: 'boolean', default: true, label: { th: 'แสดงช่วงวันที่ใต้กราฟ', en: 'Show dates under the chart' } },
        { key: 'min_live', type: 'number', default: 1, min: 1, max: 100000000000, label: metric.minLabel },
        { key: 'fallback', type: 'select', default: 'mock', label: { th: 'ถ้ายังไม่ถึงเกณฑ์หรือดึงข้อมูลไม่ได้', en: 'Below the minimum or no data' },
            options: [opt('mock', 'แสดงตัวเลขตัวอย่าง (มีป้าย "ตัวอย่าง")', 'Show a sample number (marked "Sample")'), opt('hide', 'ซ่อนการ์ด', 'Hide the card')] },
        { key: 'caption', type: 'text', localized: true, default: '', maxLength: 80, label: { th: 'ข้อความใต้ตัวเลข', en: 'Line under the number' },
            hint: { th: `เว้นว่าง = "${text.th.caption}" · บรรทัดบอกช่วงเวลาแสดงเสมอ`, en: `Empty = "${text.en.caption}" · the period line always shows` } },
        { key: 'show_caption', type: 'boolean', default: true, label: { th: 'แสดงข้อความใต้ตัวเลข', en: 'Show the line under the number' } },
        { key: 'show_channels', type: 'boolean', default: true, label: { th: 'แสดงรายชื่อระบบ', en: 'Show the module list' } },
        { key: 'show_updated', type: 'boolean', default: true, label: { th: 'แสดง "ข้อมูล ณ วันที่" (ข้อมูลจริง)', en: 'Show "Data as of" date (live)' } }
    ];

    return {
        id,
        category: 'platform',
        sizes: ['1x1', '2x1', '1x2', '2x2', '3x1', '4x1'],
        defaultSize,
        dataSources: ['live', 'mock'],
        tone,
        feature: false, // เป็นสถิติ ไม่ใช่ความสามารถของระบบ — ไม่ใส่ใน featureList / llms.txt
        settings,
        text,
        getData({ mock, locale, settings: s, source, stats, size, today = todayIn() }) {
            const t = text[locale] || text.th;
            const format = FORMATS.includes(s.format) ? s.format : 'compact';
            const period = PERIODS.includes(s.period) ? s.period : 'all';
            const real = stats && Number.isFinite(stats[metric.totalKey]) ? stats[metric.totalKey] : null;
            const live = source === 'live' && real !== null && real >= s.min_live;
            if (!live && source === 'live' && s.fallback === 'hide') return { hidden: true };

            const daily = live ? (stats[metric.dailyKey] || []) : mock.mockDaily(today, 800, metric.mockTotal);
            const sum = summarize(daily, period, { from: s.from, to: s.to }, today);
            // ข้อมูลจริงรุ่นเก่าที่ไม่มีรายวัน: ใช้ยอดรวมได้เฉพาะช่วง "ทั้งหมด"
            const raw = live && !daily.length && period === 'all' ? real : sum.total;
            const value = Math.max(0, Math.floor(raw)); // ยอดเงินตัดเศษสตางค์ลง (ไม่ปัดขึ้น)

            const position = POSITIONS.includes(s.chart_position) && s.chart_position !== 'auto' ? s.chart_position : autoPosition(size);
            const chartType = CHART_TYPES.includes(s.chart_type) ? s.chart_type : 'bar';
            const label = periodLabel(period, sum, locale, t);
            const nf = new Intl.NumberFormat(NUMBER_LOCALE[locale] || 'th-TH', { maximumFractionDigits: 0 });
            // กราฟ "ยอดสะสม" = ยอดรวมถึงแต่ละช่วง (เริ่มจากยอดก่อนวันแรกของช่วง) · "เพิ่มใหม่" = ยอดของแต่ละช่วง
            const cumulative = (s.chart_values || metric.defaultChartValues) === 'cumulative';
            let running = cumulative ? daily.reduce((acc, r) => (r && r.d < sum.from ? acc + r.n : acc), 0) : 0;
            const points = sum.points.map(p => {
                const l = pointLabel(p.key, sum.bucket, locale);
                running += p.value;
                const v = cumulative ? running : p.value;
                return { label: l, value: Math.max(0, v), title: `${l}: ${t.prefix || ''}${nf.format(Math.floor(v))}${t.unit ? ` ${t.unit}` : ''}` };
            });
            const showChart = position !== 'none' && points.length > 1;
            const bleed = showChart && s.chart_bleed === true;
            return {
                source: live ? 'live' : 'mock',
                value,
                format,
                display: formatStat(value, format, locale),
                periodLabel: label,
                // ข้อความใต้ตัวเลขตามช่วง: ช่วงย่อยใช้ caption_period ถ้า Widget มี (เช่น ร้านค้า "เปิดใหม่" ต่างจาก "ทั้งหมดที่เปิดใช้งาน")
                caption: s[`caption_${locale}`] || (period !== 'all' && t.caption_period ? t.caption_period : t.caption),
                position: showChart ? position : 'none',
                chart: showChart ? renderChart(points, chartType, { ariaLabel: t.chart.replace('{period}', label), edge: bleed }) : '',
                bleed,
                // "ข้อมูล ณ วันที่" — วันที่ pos-free-app คำนวณสถิติชุดนี้ (แคชวันละครั้ง + ทุกครั้งที่เผยแพร่)
                updatedLabel: live && stats.updated_at ? t.updated.replace('{date}', new Intl.DateTimeFormat(NUMBER_LOCALE[locale] || 'th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(stats.updated_at))) : '',
                cardClass: bleed ? 'lp-card-bleed' : '',
                axis: showChart && s.show_axis ? { first: points[0].label, last: points[points.length - 1].label } : null
            };
        }
    };
}

module.exports = { createStatWidget };
