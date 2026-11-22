// 🌟 ตัวเลขสถิติจริงสำหรับการ์ดข้อมูลจริง — ดึงจาก pos-free-app GET /api/public/marketing-web/stats
//    (นิยามบิลอยู่ที่ pos-free-app utils/billableBills.js จุดเดียว — เว็บนี้ไม่นับเอง ไม่ต้องอ่านตารางของ POS)
//    แคช 10 นาที · ดึงไม่ได้ = ใช้ค่าล่าสุดที่ได้ หรือ null (การ์ดจะใช้ข้อมูลตัวอย่างแทน)
function createStatsSource({ appUrl, fetchImpl = globalThis.fetch, cacheMs = 10 * 60 * 1000, timeoutMs = 4000, now = Date.now, logger = console }) {
    let cache = null;
    let lastGood = null;
    let pending = null;

    async function load() {
        try {
            const res = await fetchImpl(`${appUrl}/api/public/marketing-web/stats`, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json();
            const data = body && body.data;
            if (!data || !Number.isFinite(Number(data.bills_total))) throw new Error('unexpected stats');
            lastGood = { bills_total: Number(data.bills_total), updated_at: data.updated_at || null };
        } catch (err) {
            logger.error('[v2] load stats failed:', err.message);
        }
        cache = { at: now(), value: lastGood };
        return lastGood;
    }

    return async function getStats() {
        if (cache && now() - cache.at < cacheMs) return cache.value;
        // หลายคำขอพร้อมกันตอนแคชหมด → ดึงครั้งเดียว
        if (!pending) pending = load().finally(() => { pending = null; });
        return pending;
    };
}

module.exports = { createStatsSource };
