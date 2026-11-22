// ร้านค้าที่เปิดใช้ Lullapos — เจ้าของสั่ง 2026-11-22 ("สถิติยอดร้านค้าที่เปิดในระบบทั้งหมด")
//    = ร้านที่ยังไม่ถูกลบ ตามวันที่เปิดร้าน (เวลาไทย) จาก pos-free-app — นิยามเดียวกับตัวนับร้านของแดชบอร์ด Super Admin
//    ช่วง "ทั้งหมด" = ร้านที่เปิดใช้งานทั้งหมดตอนนี้ · ช่วงอื่น = ร้านเปิดใหม่ในช่วงนั้น (ข้อความใต้ตัวเลขเปลี่ยนตาม)
//    ตัวการ์ดอยู่ที่ v2/stat-card.js · กราฟเริ่มต้นเป็นยอดสะสม · ตัวอย่างเมื่อไม่มีข้อมูล = 128 ร้าน (mock-data.js STORES_TOTAL)
const { createStatWidget } = require('../../stat-card');
const { STORES_TOTAL } = require('../../mock-data');

module.exports = createStatWidget({
    id: 'stores-total',
    tone: 'green',
    metric: {
        totalKey: 'stores_total',
        dailyKey: 'stores_daily',
        mockTotal: STORES_TOTAL,
        defaultChartValues: 'cumulative',
        examples: { compact: '1.25k', full: '1,250', plus: '1.2k+' },
        minLabel: { th: 'แสดงข้อมูลจริงเมื่อมีร้านค้า (ทั้งหมด) อย่างน้อย', en: 'Show live data from at least this many stores (all time)' }
    },
    text: {
        th: {
            name: 'ร้านค้าที่ใช้ Lullapos',
            description: 'จำนวนร้านค้าที่เปิดใช้งาน Lullapos ทุกประเภทธุรกิจ พร้อมกราฟการเติบโต',
            prefix: '',
            unit: 'ร้าน',
            caption: 'ร้านค้าที่เปิดใช้งาน',
            caption_period: 'ร้านค้าเปิดใหม่',
            period_all: 'ตั้งแต่เปิดใช้งาน',
            period_year: 'ปี {year}',
            channels: 'ร้านค้าปลีก · ร้านอาหาร · บริการ · คลินิก · อื่นๆ',
            updated: 'อัปเดตทุก 10 นาที',
            chart: 'กราฟจำนวนร้านค้า {period}'
        },
        en: {
            name: 'Stores using Lullapos',
            description: 'Stores running on Lullapos across every type of business, with a growth chart',
            prefix: '',
            unit: 'stores',
            caption: 'active stores',
            caption_period: 'new stores',
            period_all: 'since launch',
            period_year: '{year}',
            channels: 'Retail · restaurants · services · clinics · more',
            updated: 'Updated every 10 minutes',
            chart: 'Stores chart, {period}'
        }
    }
});
