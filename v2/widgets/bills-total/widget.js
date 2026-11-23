// บิลที่ออกผ่าน Lullapos — จำนวนบิลทุกระบบ (นิยามเดียวกับการคิดค่าบริการ: pos-free-app utils/billableBills.js)
//    ตัวการ์ดอยู่ที่ v2/stat-card.js (ใช้ร่วมกับ sales-total) · ตัวอย่างเมื่อไม่มีข้อมูล = 8,950 บิล
const { createStatWidget } = require('../../stat-card');

module.exports = createStatWidget({
    id: 'bills-total',
    tone: 'blue',
    metric: {
        totalKey: 'bills_total',
        dailyKey: 'daily',
        mockTotal: 8950,
        examples: { compact: '8.95k', full: '8,950', plus: '8.9k+' },
        minLabel: { th: 'แสดงข้อมูลจริงเมื่อมีบิล (ทั้งหมด) อย่างน้อย', en: 'Show live data from at least this many bills (all time)' }
    },
    text: {
        th: {
            name: 'บิลที่ออกผ่าน Lullapos',
            description: 'จำนวนบิลทุกระบบที่ร้านค้าออกผ่าน Lullapos เลือกช่วงเวลาและกราฟได้',
            prefix: '',
            unit: 'บิล',
            caption: 'ทุกระบบ',
            period_all: 'ตั้งแต่เปิดใช้งาน',
            period_year: 'ปี {year}',
            channels: 'ขายหน้าร้าน · บริการ · คลินิก · ขายส่ง · อื่นๆ',
            updated: 'ข้อมูล ณ {date}',
            chart: 'กราฟจำนวนบิล {period}'
        },
        en: {
            name: 'Bills issued with Lullapos',
            description: 'Bills issued by stores across every part of Lullapos, with a period and chart',
            prefix: '',
            unit: 'bills',
            caption: 'every module',
            period_all: 'since launch',
            period_year: '{year}',
            channels: 'POS · services · clinics · wholesale · more',
            updated: 'Data as of {date}',
            chart: 'Bills chart, {period}'
        }
    }
});
