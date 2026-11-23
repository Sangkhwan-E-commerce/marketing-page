// 🌟 ตัวเลขสถิติจริงสำหรับการ์ดข้อมูลจริง — ดึงจาก pos-free-app GET /api/public/marketing-web/stats
//    (นิยามอยู่ที่ pos-free-app จุดเดียว — เว็บนี้ไม่นับเอง ไม่ต้องอ่านตารางของ POS)
//    ⚠️ การ์ดข้อมูลจริงทุกตัว (รวมที่จะเพิ่มในอนาคต) ใช้ชุดสถิตินี้ชุดเดียว — ห้ามถามฐานข้อมูล/ยิง API แยกต่อการ์ด
//    แคช (เจ้าของ 2026-11-22: ดึงใหม่ตอนบันทึก/เผยแพร่ หรือวันละครั้งเท่านั้น — ลดภาระฐานข้อมูล):
//      ดึงสำเร็จ = ใช้ทั้งวัน (เปลี่ยนวันตามเวลาไทย) · ดึงไม่สำเร็จ = ลองใหม่ทุก retryMs (ค่าตั้งต้น 15 นาที) โดยใช้ค่าล่าสุดที่ได้ไปก่อน
//      getStats.clear() = ล้างทันที (เรียกจาก /api/revalidate ตอน Admin กดเผยแพร่)
const { todayIn } = require('./series');

const rows = (list, key) => (Array.isArray(list)
    ? list.filter(r => r && typeof r.d === 'string' && Number.isFinite(Number(r[key]))).map(r => ({ d: r.d, n: Number(r[key]) }))
    : []);
const numOrNull = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

function createStatsSource({ appUrl, fetchImpl = globalThis.fetch, retryMs = 15 * 60 * 1000, timeoutMs = 4000, now = Date.now, logger = console }) {
    let cache = null;
    let lastGood = null;
    let pending = null;
    const day = () => todayIn('Asia/Bangkok', new Date(now()));

    async function load() {
        let ok = false;
        try {
            const res = await fetchImpl(`${appUrl}/api/public/marketing-web/stats`, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json();
            const data = body && body.data;
            if (!data || !Number.isFinite(Number(data.bills_total))) throw new Error('unexpected stats');
            lastGood = {
                bills_total: Number(data.bills_total),
                daily: rows(data.daily, 'n'),
                // ยอดขาย (บาท) รายวันมาเป็น { d, v } → เก็บเป็น { d, n } รูปเดียวกับบิล ให้การ์ดสถิติใช้สูตรเดียวกัน
                sales_total: numOrNull(data.sales_total),
                sales_daily: rows(data.sales_daily, 'v'),
                stores_total: numOrNull(data.stores_total),
                stores_daily: rows(data.stores_daily, 'n'),
                updated_at: data.updated_at || null
            };
            ok = true;
        } catch (err) {
            logger.error('[v2] load stats failed:', err.message);
        }
        cache = { day: day(), at: now(), ok, value: lastGood };
        return lastGood;
    }

    async function getStats() {
        if (cache && cache.day === day() && (cache.ok || now() - cache.at < retryMs)) return cache.value;
        // หลายคำขอพร้อมกันตอนแคชหมด → ดึงครั้งเดียว
        if (!pending) pending = load().finally(() => { pending = null; });
        return pending;
    }
    getStats.clear = () => { cache = null; };
    return getStats;
}

module.exports = { createStatsSource };
