// 🌟 อ่านการตั้งค่าที่เผยแพร่จากฐานข้อมูล Lullapos — ตาราง lp_site (สร้าง/เขียนโดย pos-free-app เมนู Super Admin "Marketing web")
//    เว็บนี้ "อ่านอย่างเดียว" · ตั้ง V2_DATABASE_URL เป็นบัญชีฐานข้อมูลที่อ่านได้อย่างเดียว (แนะนำ) ไม่ตั้ง = ใช้ pool เดิมของ server.js
//    แคชแถวที่เผยแพร่ 60 วินาที (หน้าแรกเปิดบ่อย) · อ่านพลาด/ยังไม่มีตาราง = ใช้ค่าตั้งต้นในโค้ด และไม่ถามซ้ำจนพ้นแคช
const PREVIEW_TOKEN_RE = /^[a-f0-9]{48}$/;

function createDbSources({ getPool, cacheMs = 60000, now = Date.now, logger = console }) {
    let cache = null;
    let lastGood = null;

    async function published() {
        if (cache && now() - cache.at < cacheMs) return cache.value;
        try {
            const r = await getPool().query('SELECT published FROM lp_site WHERE id = 1');
            const value = (r.rows[0] && r.rows[0].published) || null;
            cache = { at: now(), value };
            lastGood = { value };
            return value;
        } catch (err) {
            // ใช้ค่าที่อ่านได้ครั้งล่าสุดต่อ (ถ้ามี) · จดลง log ครั้งเดียวต่อรอบแคช ไม่ใช่ทุกคำขอ
            const value = lastGood ? lastGood.value : null;
            cache = { at: now(), value };
            logger.error('[v2] read lp_site failed, using last/default settings:', err.message);
            return value;
        }
    }

    return {
        // ยังไม่เคยเผยแพร่ (null) = ใช้ค่าตั้งต้น
        loadPublished: async () => { const p = await published(); return p && p.layout ? p.layout : null; },
        loadSiteSettings: async () => { const p = await published(); return p && p.site ? p.site : null; },
        // ฉบับร่างสำหรับหน้าดูตัวอย่าง — ต้องมีรหัสที่ยังไม่หมดอายุ (pos-free-app ออกให้ อายุ 2 ชั่วโมง) · ไม่แคช
        loadDraft: async (token) => {
            if (typeof token !== 'string' || !PREVIEW_TOKEN_RE.test(token)) return null;
            const r = await getPool().query(
                'SELECT draft, published FROM lp_site WHERE id = 1 AND preview_token = $1 AND preview_expires_at > NOW()',
                [token]
            );
            if (!r.rows[0]) return null;
            return r.rows[0].draft || r.rows[0].published || {};
        }
    };
}

module.exports = { createDbSources, PREVIEW_TOKEN_RE };
