// ออเดอร์เข้าจอครัว — ใบออเดอร์จากโต๊ะ / QR / กลับบ้าน ไหลเข้าจอครัว (หน้าจอออเดอร์ /store/:id/order-display, /dp)
module.exports = {
    id: 'kitchen-orders',
    category: 'restaurant',
    sizes: ['1x2', '2x2'],
    defaultSize: '1x2',
    dataSources: ['mock'],
    docPath: '/doc/restaurant/kitchen-display',
    tone: 'dark',
    settings: [
        { key: 'animate', type: 'boolean', default: true, label: { th: 'จำลองออเดอร์ใหม่เข้ามาเรื่อยๆ', en: 'Simulate new orders arriving' } }
    ],
    text: {
        th: {
            name: 'ออเดอร์เข้าจอครัว',
            description: 'ออเดอร์จากโต๊ะ QR และกลับบ้าน ขึ้นจอครัวทันที ครัวกดรับและกดเสร็จได้',
            minutes: 'นาที',
            status: { new: 'ใหม่', cooking: 'กำลังทำ', ready: 'พร้อมเสิร์ฟ' },
            waiting: 'รอทำ'
        },
        en: {
            name: 'Kitchen display',
            description: 'Orders from tables, QR and takeaway reach the kitchen screen instantly',
            minutes: 'min',
            status: { new: 'New', cooking: 'Cooking', ready: 'Ready' },
            waiting: 'in queue'
        }
    },
    getData({ mock, locale, settings }) {
        const pick = obj => obj[locale] || obj.th;
        const tickets = mock.KITCHEN_TICKETS.map(t => ({
            no: t.no,
            table: pick(t.table),
            status: t.status,
            minutes: t.minutes,
            items: t.items.map(i => ({ name: pick(i), qty: i.qty }))
        }));
        return {
            tickets,
            waiting: tickets.filter(t => t.status !== 'ready').length,
            animate: settings.animate
        };
    }
};
