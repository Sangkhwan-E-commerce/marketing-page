// ยอดขายวันนี้ — ตัวเลขรวม + กราฟรายชั่วโมง + สัดส่วนช่องทางชำระ (หน้าแดชบอร์ดหลังบ้าน /store/:id/dashboard)
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
    text: {
        th: {
            name: 'ยอดขายวันนี้',
            description: 'ยอดขายรวม จำนวนบิล และช่วงเวลาขายดีของวัน',
            bills: 'บิล',
            avg: 'เฉลี่ยต่อบิล',
            vs_yesterday: 'เทียบเมื่อวาน',
            peak: 'ขายดีสุด',
            payments: { qr: 'QR พร้อมเพย์', cash: 'เงินสด', card: 'บัตร' },
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
            currency: '฿'
        }
    },
    getData({ mock, size, settings }) {
        const s = mock.SALES_TODAY;
        const max = Math.max(...s.hourly.map(h => h.total));
        const peak = s.hourly.find(h => h.total === max);
        // แท่งสูงสุด 82% ของช่อง เหลือที่ให้ป้าย "ขายดีสุด" เหนือแท่ง
        return {
            total: s.total,
            bills: s.bills,
            avg: Math.round(s.total / s.bills),
            change: s.changeVsYesterday,
            peakHour: peak.hour,
            bars: s.hourly.map(h => ({ hour: h.hour, pct: Math.round((h.total / max) * 82), peak: h === peak })),
            payments: s.payments,
            showPayments: size === '2x2' && settings.showPayments
        };
    }
};
