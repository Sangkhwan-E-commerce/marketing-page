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

// ออเดอร์ QR ของโต๊ะเดียว ใช้เล่าขั้นตอนในการ์ด qr-ordering-flow (รายการเดียวกับใบแรกบนจอครัว)
const QR_ORDER = {
    table: { th: 'โต๊ะ 4', en: 'Table 4' },
    items: [
        { th: 'ลาเต้เย็น 16 ออนซ์', en: 'Iced latte 16 oz', qty: 2, price: 65 },
        { th: 'ครัวซองต์เนยสด', en: 'Butter croissant', qty: 1, price: 55 }
    ]
};

// ล็อตสินค้าที่ใกล้หมดอายุ — ระบบตัดล็อตที่หมดอายุก่อนออกก่อน (FEFO)
const EXPIRING_LOTS = [
    { product: { th: 'นมสดพาสเจอร์ไรส์ 2 ลิตร', en: 'Fresh milk 2 L' }, lot: 'L2611-03', daysLeft: 2, qty: 6, unit: { th: 'ขวด', en: 'btl' } },
    { product: { th: 'ขนมปังโฮลวีต', en: 'Whole wheat bread' }, lot: 'L2611-11', daysLeft: 3, qty: 9, unit: { th: 'แถว', en: 'loaf' } },
    { product: { th: 'โยเกิร์ตรสธรรมชาติ', en: 'Plain yogurt' }, lot: 'L2611-07', daysLeft: 5, qty: 14, unit: { th: 'ถ้วย', en: 'cup' } }
];

// ตัวเลขสมมุติของการ์ด "บิลที่ออกผ่าน Lullapos" ใช้ตอนยังไม่มีข้อมูลจริง (เจ้าของกำหนด 8.95k · 2026-11-22) — แสดงพร้อมป้าย "ตัวอย่าง" เสมอ
const BILLS_TOTAL = 8950;
// ยอดขายรวมสมมุติ (บาท) ของการ์ด "ยอดขายรวมผ่าน Lullapos" ตอนยังไม่มีข้อมูลจริง — แสดงพร้อมป้าย "ตัวอย่าง" เสมอ
const SALES_TOTAL = 1850000;
// จำนวนร้านค้าสมมุติของการ์ด "ร้านค้าที่ใช้ Lullapos" ตอนยังไม่มีข้อมูลจริง — แสดงพร้อมป้าย "ตัวอย่าง" เสมอ
const STORES_TOTAL = 128;

// บิลรายวันสมมุติ 540 วันย้อนหลังถึงวันนี้ รวมได้ BILLS_TOTAL พอดี — ใช้วาดกราฟตอนยังไม่มีข้อมูลจริง
//    ค่าแน่นอน (ไม่สุ่ม) หน้าเว็บจะได้ไม่เปลี่ยนทุกครั้งที่เปิด · มีแนวโน้มโตขึ้น + เสาร์อาทิตย์ขายดีกว่า
function mockDaily(today, days = 800, total = BILLS_TOTAL) {
    const end = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
    const weights = [];
    for (let i = 0; i < days; i++) {
        const ms = end - (days - 1 - i) * 86400000;
        const dow = new Date(ms).getUTCDay();
        const growth = 0.25 + (i / days) * 1.5;
        const weekend = dow === 0 || dow === 6 ? 1.35 : 1;
        const wave = 1 + 0.18 * Math.sin(i / 9) + 0.08 * Math.sin(i / 2.3);
        weights.push({ d: new Date(ms).toISOString().slice(0, 10), w: growth * weekend * wave });
    }
    const sum = weights.reduce((s, x) => s + x.w, 0);
    // ปัดที่ "ยอดสะสม" แล้วค่อยแตกเป็นรายวัน — รวมได้ total พอดี และกระจายตามเส้นการเติบโตแม้ยอดรวมน้อย (เช่น 128 ร้าน ใน 800 วัน)
    //    (แบบแจกเศษให้วันที่เศษมากสุด จะกองไว้ช่วงท้ายจนกราฟยอดสะสมแบนแล้วพุ่ง — เจอ 2026-11-22)
    let acc = 0;
    let prev = 0;
    return weights.map(({ d, w }, i) => {
        acc += (w / sum) * total;
        const cum = i === weights.length - 1 ? total : Math.floor(acc + 1e-9);
        const n = cum - prev;
        prev = cum;
        return { d, n };
    });
}

module.exports = { STORE, SALES_TODAY, KITCHEN_TICKETS, QR_ORDER, EXPIRING_LOTS, BILLS_TOTAL, SALES_TOTAL, STORES_TOTAL, mockDaily };
