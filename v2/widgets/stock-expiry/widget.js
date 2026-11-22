// ล็อตใกล้หมดอายุ — ระบบตัดล็อตที่หมดอายุก่อนออกก่อน (FEFO) และเตือนของที่ใกล้หมดอายุ (/store/:id/stock-lots)
module.exports = {
    id: 'stock-expiry',
    category: 'stock',
    sizes: ['1x1', '2x1'],
    defaultSize: '1x1',
    dataSources: ['mock'],
    docPath: '/doc/stock/lots-expiry',
    tone: 'orange',
    settings: [
        {
            key: 'tone', type: 'select', default: 'orange',
            label: { th: 'สีพื้นการ์ด', en: 'Card colour' },
            options: [
                { value: 'orange', label: { th: 'ส้ม', en: 'Orange' } },
                { value: 'light', label: { th: 'ขาว', en: 'White' } }
            ]
        }
    ],
    text: {
        th: {
            name: 'ล็อตใกล้หมดอายุ',
            description: 'เตือนสินค้าที่ใกล้หมดอายุเป็นรายล็อต และตัดล็อตที่หมดอายุก่อนออกขายก่อน',
            lots: 'ล็อต',
            within: 'หมดอายุใน 7 วัน',
            days_left: 'อีก {n} วัน',
            fefo: 'ขายล็อตที่หมดอายุก่อนให้อัตโนมัติ'
        },
        en: {
            name: 'Expiring lots',
            description: 'Warns about lots close to expiry and sells the earliest-expiring lot first',
            lots: 'lots',
            within: 'expire within 7 days',
            days_left: '{n} days left',
            fefo: 'Earliest-expiring lot is sold first, automatically'
        }
    },
    getData({ mock, locale }) {
        const pick = obj => obj[locale] || obj.th;
        const lots = mock.EXPIRING_LOTS
            .filter(l => l.daysLeft <= 7)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .map(l => ({ product: pick(l.product), lot: l.lot, daysLeft: l.daysLeft, qty: l.qty, unit: pick(l.unit) }));
        return { count: lots.length, lots };
    }
};
