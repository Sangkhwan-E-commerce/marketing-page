// 🌟 ข้อความของโครงหน้า v2 (แถบบน หัวข้อ ป้าย ปุ่ม) — ข้อความในการ์ดอยู่ใน widget.js ของแต่ละ Widget
const MESSAGES = {
    th: {
        'nav.lang': 'English',
        'nav.cta': 'เริ่มใช้งาน',
        'hero.eyebrow': 'Lullapos',
        'hero.title': 'ทุกอย่างที่ร้านต้องใช้ เห็นได้ในหน้าเดียว',
        'hero.subtitle': 'การ์ดแต่ละใบคือความสามารถหนึ่งของระบบ กดที่การ์ดเพื่อดูวิธีใช้ในคู่มือ',
        'hero.cta': 'เริ่มใช้งาน Lullapos',
        'badge.mock': 'ตัวอย่าง',
        'badge.mock_title': 'ข้อมูลสมมุติเพื่อแสดงหน้าจอ ไม่ใช่ยอดของร้านจริง',
        'badge.live': 'ข้อมูลจริง',
        'badge.live_title': 'ตัวเลขจริงจากระบบ Lullapos อัปเดตทุก 10 นาที',
        'card.doc_link': 'ดูวิธีใช้',
        'footer.cta_title': 'พร้อมลองกับร้านของคุณหรือยัง',
        'footer.cta': 'เริ่มใช้งาน Lullapos',
        'footer.note': 'ตัวเลขในการ์ดที่มีป้าย "ตัวอย่าง" เป็นข้อมูลสมมุติของร้านตัวอย่าง',
        'footer.manual': 'คู่มือการใช้งาน',
        'about.title': '{name} คืออะไร',
        'empty': 'ยังไม่มีการ์ดที่เปิดแสดง',
        'preview.banner': 'ตัวอย่างฉบับร่าง — คนทั่วไปยังไม่เห็น กด "เผยแพร่" ในหน้า Admin เพื่อให้หน้าเว็บจริงเปลี่ยน',
        'preview.expired': 'ลิงก์ดูตัวอย่างหมดอายุหรือไม่ถูกต้อง กลับไปกด "ดูตัวอย่าง" ในหน้า Admin อีกครั้ง'
    },
    en: {
        'nav.lang': 'ภาษาไทย',
        'nav.cta': 'Get started',
        'hero.eyebrow': 'Lullapos',
        'hero.title': 'Everything your store runs on, on one screen',
        'hero.subtitle': 'Each card is one part of the system. Click a card to see how it works in the manual.',
        'hero.cta': 'Start using Lullapos',
        'badge.mock': 'Sample',
        'badge.mock_title': 'Made-up data to show the screen, not a real store’s numbers',
        'badge.live': 'Live',
        'badge.live_title': 'Real numbers from Lullapos, updated every 10 minutes',
        'card.doc_link': 'How it works',
        'footer.cta_title': 'Ready to try it with your store?',
        'footer.cta': 'Start using Lullapos',
        'footer.note': 'Numbers on cards marked "Sample" come from a made-up sample store.',
        'footer.manual': 'User manual',
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
