// 🌟 ข้อความของโครงหน้า v2 (ป้าย ลิงก์ภาษา ข้อความระบบ) · ข้อความส่วนบน/ส่วนท้าย/Footer ตั้งได้ที่ Admin (v2/site-settings.js กลุ่ม hero/cta/footer) — ข้อความในการ์ดอยู่ใน widget.js ของแต่ละ Widget
const MESSAGES = {
    th: {
        'nav.lang': 'English',
        'badge.mock': 'ตัวอย่าง',
        'badge.mock_title': 'ข้อมูลสมมุติเพื่อแสดงหน้าจอ ไม่ใช่ยอดของร้านจริง',
        'badge.live': 'ข้อมูลจริง',
        'badge.live_title': 'ตัวเลขจริงจากระบบ Lullapos อัปเดตวันละครั้ง',
        'card.doc_link': 'ดูวิธีใช้',
        'about.title': '{name} คืออะไร',
        'empty': 'ยังไม่มีการ์ดที่เปิดแสดง',
        'preview.banner': 'ตัวอย่างฉบับร่าง — คนทั่วไปยังไม่เห็น กด "เผยแพร่" ในหน้า Admin เพื่อให้หน้าเว็บจริงเปลี่ยน',
        'preview.expired': 'ลิงก์ดูตัวอย่างหมดอายุหรือไม่ถูกต้อง กลับไปกด "ดูตัวอย่าง" ในหน้า Admin อีกครั้ง'
    },
    en: {
        'nav.lang': 'ภาษาไทย',
        'badge.mock': 'Sample',
        'badge.mock_title': 'Made-up data to show the screen, not a real store’s numbers',
        'badge.live': 'Live',
        'badge.live_title': 'Real numbers from Lullapos, updated daily',
        'card.doc_link': 'How it works',
        'about.title': 'What is {name}?',
        'empty': 'No cards are switched on yet',
        'preview.banner': 'Draft preview — not public yet. Press "Publish" in the admin to update the live site.',
        'preview.expired': 'This preview link has expired or is invalid. Press "Preview" in the admin again.'
    }
};

const LOCALES = Object.keys(MESSAGES);
const DEFAULT_LOCALE = 'th';

function createT(locale) {
    const dict = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
    return key => (key in dict ? dict[key] : (MESSAGES[DEFAULT_LOCALE][key] ?? key));
}

const NUMBER_LOCALE = { th: 'th-TH', en: 'en-US' };
function formatNumber(value, locale, options = {}) {
    return new Intl.NumberFormat(NUMBER_LOCALE[locale] || 'th-TH', options).format(value);
}

module.exports = { MESSAGES, LOCALES, DEFAULT_LOCALE, createT, formatNumber };
