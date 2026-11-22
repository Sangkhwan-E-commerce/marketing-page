// ยอดขายรวมผ่าน Lullapos (บาท) — เจ้าของ 2026-11-22: "การ์ดยอดธุรกรรม หมายถึงยอดขายรวมทั้งระบบ"
//    ยอดขายสุทธิจาก pos-free-app sales_bills_v (นิยามเดียวกับรายงานยอดขาย/Ultra Report):
//    ตัดบิลยกเลิก · หักคืนสินค้าในวันที่คืน · ไม่นับขายบัตรของขวัญ (นับตอนใช้จ่าย) · ไม่นับ POS รับซื้อ
//    ตัวการ์ดอยู่ที่ v2/stat-card.js (ใช้ร่วมกับ bills-total) · ตัวอย่างเมื่อไม่มีข้อมูล = ฿1,850,000 (mock-data.js SALES_TOTAL)
const { createStatWidget } = require('../../stat-card');
const { SALES_TOTAL } = require('../../mock-data');

module.exports = createStatWidget({
    id: 'sales-total',
    tone: 'dark',
    defaultSize: '4x1',
    metric: {
        totalKey: 'sales_total',
        dailyKey: 'sales_daily',
        mockTotal: SALES_TOTAL,
        examples: { compact: '฿1.85M', full: '฿1,850,000', plus: '฿1.8M+' },
        minLabel: { th: 'แสดงข้อมูลจริงเมื่อยอดขาย (ทั้งหมด) อย่างน้อย (บาท)', en: 'Show live data from at least this much in sales (all time, THB)' }
    },
    text: {
        th: {
            name: 'ยอดขายรวมผ่าน Lullapos',
            description: 'ยอดขายสุทธิรวมของทุกร้านค้าทุกระบบที่ขายผ่าน Lullapos เลือกช่วงเวลาและกราฟได้',
            prefix: '฿',
            unit: '',
            caption: 'ยอดขายสุทธิ ทุกระบบ',
            period_all: 'ตั้งแต่เปิดใช้งาน',
            period_year: 'ปี {year}',
            channels: 'ขายหน้าร้าน · บริการ · คลินิก · ขายส่ง · อื่นๆ',
            updated: 'อัปเดตทุก 10 นาที',
            chart: 'กราฟยอดขาย {period}'
        },
        en: {
            name: 'Sales through Lullapos',
            description: 'Net sales of every store across every part of Lullapos, with a period and chart',
            prefix: '฿',
            unit: '',
            caption: 'net sales, every module',
            period_all: 'since launch',
            period_year: '{year}',
            channels: 'POS · services · clinics · wholesale · more',
            updated: 'Updated every 10 minutes',
            chart: 'Sales chart, {period}'
        }
    }
});
