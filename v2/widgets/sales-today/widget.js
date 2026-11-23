// ยอดขายวันนี้ — ตัวเลขรวม + กราฟรายชั่วโมง + สัดส่วนช่องทางชำระ (หน้าแดชบอร์ดหลังบ้าน /store/:id/dashboard)
//    กราฟทั้งสองส่วนวาดด้วย Chart.js ผ่าน LP.drawChart (เจ้าของ 2026-11-23: ใช้ Chart.js ทั้งหน้า) · แท่งที่ขายดีสุดเป็นสีเน้น
const { buildChartSpec, buildShareSpec } = require('../../chart');

const TEXT = {
    th: {
        name: 'ยอดขายวันนี้',
        description: 'ยอดขายรวม จำนวนบิล และช่วงเวลาขายดีของวัน',
        bills: 'บิล',
        avg: 'เฉลี่ยต่อบิล',
        vs_yesterday: 'เทียบเมื่อวาน',
        peak: 'ขายดีสุด',
        payments: { qr: 'QR พร้อมเพย์', cash: 'เงินสด', card: 'บัตร' },
        payments_aria: 'สัดส่วนช่องทางชำระ',
        currency: '฿'
    },
    en: {
        name: 'Sales today',
        description: 'Total sales, bill count and the busiest hours of the day',
        bills: 'bills',
        avg: 'avg per bill',
        vs_yesterday: 'vs yesterday',
        peak: 'Peak',
        payments: { qr: 'PromptPay QR', cash: 'Cash', card: 'Card' },
        payments_aria: 'Payment method share',
        currency: '฿'
    }
};

const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

module.exports = {
    id: 'sales-today',
    category: 'pos',
    sizes: ['2x2', '2x1'],
    defaultSize: '2x2',
    dataSources: ['mock'],
    docPath: '/doc/reports/dashboard',
    tone: 'light',
    settings: [
        {
            key: 'tone', type: 'select', default: 'light',
            label: { th: 'สีพื้นสำเร็จรูป', en: 'Preset colour' },
            options: [
                { value: 'light', label: { th: 'ขาว', en: 'White' } },
                { value: 'dark', label: { th: 'เข้ม', en: 'Dark' } },
                { value: 'blue', label: { th: 'น้ำเงิน', en: 'Blue' } }
            ]
        },
        { key: 'show_change', type: 'boolean', default: true, label: { th: 'แสดงเปอร์เซ็นต์เทียบเมื่อวาน', en: 'Show change vs yesterday' } },
        { key: 'show_meta', type: 'boolean', default: true, label: { th: 'แสดงจำนวนบิลและยอดเฉลี่ยต่อบิล', en: 'Show bill count and average' } },
        { key: 'show_chart', type: 'boolean', default: true, label: { th: 'แสดงกราฟรายชั่วโมง', en: 'Show the hourly chart' } },
        { key: 'show_hours', type: 'boolean', default: true, label: { th: 'แสดงเลขชั่วโมงใต้กราฟ', en: 'Show hour labels' } },
        { key: 'show_peak', type: 'boolean', default: true, label: { th: 'แสดงป้าย "ขายดีสุด"', en: 'Show the "Peak" label' } },
        { key: 'showPayments', type: 'boolean', default: true, label: { th: 'แสดงช่องทางชำระ (เฉพาะขนาด 2x2)', en: 'Show payment methods (2x2 only)' } }
    ],
    text: TEXT,
    getData({ mock, size, settings, locale }) {
        const s = mock.SALES_TODAY;
        const t = TEXT[locale] || TEXT.th;
        const nf = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'th-TH');
        const pf = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'th-TH', { style: 'percent' });
        const max = Math.max(...s.hourly.map(h => h.total));
        const peakIndex = s.hourly.findIndex(h => h.total === max);
        const wide = size !== '2x1'; // 2x1 สูงแถวเดียว: ไม่มีเลขชั่วโมง/ป้ายขายดีสุด

        const chart = settings.show_chart
            ? buildChartSpec(
                s.hourly.map(h => ({ label: String(h.hour), value: h.total, tooltip: `${hourLabel(h.hour)} · ${t.currency}${nf.format(h.total)}` })),
                'bar',
                {
                    ariaLabel: `${t.peak} ${hourLabel(s.hourly[peakIndex].hour)}`,
                    highlight: peakIndex,
                    highlightLabel: settings.show_peak && wide ? t.peak : '',
                    xLabels: settings.show_hours && wide
                })
            : null;

        const showPayments = size === '2x2' && settings.showPayments;
        const pay = showPayments
            ? buildShareSpec(s.payments.map(p => ({
                label: t.payments[p.key],
                value: p.share,
                tooltip: `${t.payments[p.key]} ${pf.format(p.share)}`,
                colorFrom: `.w-dot.w-pay-${p.key}`
            })), { ariaLabel: t.payments_aria })
            : null;

        return {
            total: s.total,
            bills: s.bills,
            avg: Math.round(s.total / s.bills),
            change: s.changeVsYesterday,
            peakHour: s.hourly[peakIndex].hour,
            chart,
            pay,
            payments: s.payments,
            showPayments
        };
    }
};
