// 🌟 ข้อมูลสมมุติชุดกลางของหน้าเว็บ v2 — ทุก Widget ใช้ร้านเดียวกัน ตัวเลขจะได้สอดคล้องกัน
//    ⚠️ แต่งขึ้นทั้งหมด ไม่ใช่ข้อมูลร้านจริง · ร้านเดียวกับคู่มือ /doc ของ pos-free-app (doc/mock-data.js)
//    การ์ดที่ใช้ข้อมูลชุดนี้จะมีป้าย "ตัวอย่าง" เสมอ

const STORE = { name: { th: 'ร้านลัลลา สาขาตัวอย่าง', en: 'Lalla Store (sample branch)' } };

// ยอดขายรายชั่วโมงของ "วันนี้" (บาท) — 08:00 ถึง 20:00
const HOURLY_SALES = [
    { hour: 8, total: 1240 }, { hour: 9, total: 2380 }, { hour: 10, total: 3150 },
    { hour: 11, total: 4720 }, { hour: 12, total: 6980 }, { hour: 13, total: 5410 },
    { hour: 14, total: 3260 }, { hour: 15, total: 3890 }, { hour: 16, total: 4470 },
    { hour: 17, total: 5820 }, { hour: 18, total: 6310 }, { hour: 19, total: 4150 },
    { hour: 20, total: 2090 }
];

const SALES_TODAY = {
    total: HOURLY_SALES.reduce((sum, h) => sum + h.total, 0),
    bills: 214,
    changeVsYesterday: 0.12,
    hourly: HOURLY_SALES,
    // สัดส่วนช่องทางชำระเงิน (รวมกัน = 1)
    payments: [
        { key: 'qr', share: 0.58 },
        { key: 'cash', share: 0.31 },
        { key: 'card', share: 0.11 }
    ]
};

// ออเดอร์บนจอครัว — status: new | cooking | ready
const KITCHEN_TICKETS = [
    { no: 'A-118', table: { th: 'โต๊ะ 4', en: 'Table 4' }, status: 'new', minutes: 1,
        items: [{ th: 'ลาเต้เย็น 16 ออนซ์', en: 'Iced latte 16 oz', qty: 2 }, { th: 'ครัวซองต์เนยสด', en: 'Butter croissant', qty: 1 }] },
    { no: 'A-117', table: { th: 'QR โต๊ะ 9', en: 'QR · Table 9' }, status: 'cooking', minutes: 6,
        items: [{ th: 'ข้าวกะเพราไก่ไข่ดาว', en: 'Basil chicken rice + egg', qty: 1 }, { th: 'ชาไทยเย็น', en: 'Thai iced tea', qty: 1 }] },
    { no: 'A-116', table: { th: 'กลับบ้าน', en: 'Takeaway' }, status: 'cooking', minutes: 9,
        items: [{ th: 'อเมริกาโน่ร้อน', en: 'Hot americano', qty: 3 }] },
    { no: 'A-115', table: { th: 'โต๊ะ 2', en: 'Table 2' }, status: 'ready', minutes: 12,
        items: [{ th: 'สลัดอกไก่', en: 'Chicken salad', qty: 1 }] }
];

// ล็อตสินค้าที่ใกล้หมดอายุ — ระบบตัดล็อตที่หมดอายุก่อนออกก่อน (FEFO)
const EXPIRING_LOTS = [
    { product: { th: 'นมสดพาสเจอร์ไรส์ 2 ลิตร', en: 'Fresh milk 2 L' }, lot: 'L2611-03', daysLeft: 2, qty: 6, unit: { th: 'ขวด', en: 'btl' } },
    { product: { th: 'ขนมปังโฮลวีต', en: 'Whole wheat bread' }, lot: 'L2611-11', daysLeft: 3, qty: 9, unit: { th: 'แถว', en: 'loaf' } },
    { product: { th: 'โยเกิร์ตรสธรรมชาติ', en: 'Plain yogurt' }, lot: 'L2611-07', daysLeft: 5, qty: 14, unit: { th: 'ถ้วย', en: 'cup' } }
];

// ตัวเลขสมมุติของการ์ด "บิลที่ออกผ่าน Lullapos" ใช้ตอนยังไม่มีข้อมูลจริง (เจ้าของกำหนด 8.95k · 2026-11-22) — แสดงพร้อมป้าย "ตัวอย่าง" เสมอ
const BILLS_TOTAL = 8950;

module.exports = { STORE, SALES_TODAY, KITCHEN_TICKETS, EXPIRING_LOTS, BILLS_TOTAL };
