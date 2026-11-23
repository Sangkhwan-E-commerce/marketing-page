// 🌟 อ่านการตั้งค่าที่เผยแพร่จากฐานข้อมูล Lullapos — ตาราง lp_site (สร้าง/เขียนโดย pos-free-app เมนู Super Admin "Marketing web")
//    เว็บนี้ "อ่านอย่างเดียว" · ตั้ง V2_DATABASE_URL เป็นบัญชีฐานข้อมูลที่อ่านได้อย่างเดียว (แนะนำ) ไม่ตั้ง = ใช้ pool เดิมของ server.js
//    แคช (เจ้าของ 2026-11-22: อ่านใหม่เฉพาะตอนบันทึก/เผยแพร่ หรือวันละครั้ง — ลดภาระฐานข้อมูล):
//      อ่านสำเร็จ = ใช้จนกว่า Admin กดเผยแพร่ (revalidate) หรือเปลี่ยนวันตามเวลาไทย (สำรองเผื่อสัญญาณไม่ถึง)
//      อ่านพลาด/ยังไม่มีตาราง = ใช้ค่าล่าสุดที่อ่านได้ หรือค่าตั้งต้นในโค้ด แล้วลองใหม่ทุก retryMs (ค่าตั้งต้น 5 นาที)
const { todayIn } = require('./series');

const PREVIEW_TOKEN_RE = /^[a-f0-9]{48}$/;
const NONCE_RE = PREVIEW_TOKEN_RE; // รหัส revalidate ของ pos-free-app เป็น hex 48 ตัวเหมือนกัน

function createDbSources({ getPool, retryMs = 5 * 60 * 1000, now = Date.now, logger = console }) {
    let cache = null;
    let lastGood = null;
    const day = () => todayIn('Asia/Bangkok', new Date(now()));

    async function published() {
        if (cache && cache.day === day() && (cache.ok || now() - cache.at < retryMs)) return cache.value;
        try {
            const r = await getPool().query('SELECT published FROM lp_site WHERE id = 1');
            const value = (r.rows[0] && r.rows[0].published) || null;
            cache = { day: day(), at: now(), ok: true, value };
            lastGood = { value };
            return value;
        } catch (err) {
            // ใช้ค่าที่อ่านได้ครั้งล่าสุดต่อ (ถ้ามี) · จดลง log ครั้งเดียวต่อรอบลองใหม่ ไม่ใช่ทุกคำขอ
            const value = lastGood ? lastGood.value : null;
            cache = { day: day(), at: now(), ok: false, value };
            logger.error('[v2] read lp_site failed, using last/default settings:', err.message);
            return value;
        }
    }

    return {
        // ยังไม่เคยเผยแพร่ (null) = ใช้ค่าตั้งต้น
        loadPublished: async () => { const p = await published(); return p && p.layout ? p.layout : null; },
        loadSiteSettings: async () => { const p = await published(); return p && p.site ? p.site : null; },
        // ฉบับร่างสำหรับหน้าดูตัวอย่าง — ต้องมีรหัสที่ยังไม่หมดอายุ (pos-free-app ออกให้ อายุ 2 ชั่วโมง) · ไม่แคช (Admin ใช้เท่านั้น)
        loadDraft: async (token) => {
            if (typeof token !== 'string' || !PREVIEW_TOKEN_RE.test(token)) return null;
            const r = await getPool().query(
                'SELECT draft, published FROM lp_site WHERE id = 1 AND preview_token = $1 AND preview_expires_at > NOW()',
                [token]
            );
            if (!r.rows[0]) return null;
            return r.rows[0].draft || r.rows[0].published || {};
        },
        // Admin กดเผยแพร่ → pos-free-app ส่งรหัสใช้ครั้งเดียวมา · ตรงกับ lp_site.revalidate_nonce = ล้างแคช (อ่านใหม่ครั้งถัดไป)
        //    รหัสผิด = ไม่ทำอะไร (ไม่มีค่าลับร่วมกันสองระบบ — ตัวรหัสอยู่ในฐานข้อมูลที่ทั้งสองระบบอ่านได้)
        revalidate: async (nonce) => {
            if (typeof nonce !== 'string' || !NONCE_RE.test(nonce)) return false;
            const r = await getPool().query('SELECT 1 FROM lp_site WHERE id = 1 AND revalidate_nonce = $1', [nonce]);
            if (!r.rows[0]) return false;
            cache = null;
            return true;
        }
    };
}

module.exports = { createDbSources, PREVIEW_TOKEN_RE };
