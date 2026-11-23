// 🌟 ตั้งค่าพื้นฐานของเว็บ v2 — โลโก้ favicon สีธีม ข้อความ SEO/OpenGraph โซเชียล ยืนยันเจ้าของเว็บ และ robots/AI
//    ตอนนี้ใช้ DEFAULT_SITE ในโค้ด · ขั้นต่อไปหน้า Admin "Marketing web" ใน pos-free-app จะเขียนลงตาราง lp_settings
//    แล้วเว็บนี้อ่านอย่างเดียว (ส่ง loadPublished เข้า createSiteSource) — ค่าว่าง/ผิดรูป = ใช้ค่าตั้งต้นของช่องนั้น
//    ข้อความหลายภาษา: ภาษาไหนว่าง ใช้ภาษาไทย (กติกาเดียวกับ utils/seoSettings.js ของ pos-free-app)
//    รูปทุกช่องรับได้ทั้ง URL เต็ม (R2) และ path ในเว็บนี้ที่ขึ้นต้นด้วย "/assets/"

const LOCALES = ['th', 'en'];
const DEFAULT_LOCALE = 'th';

// ช่องตั้งค่า — หน้า Admin อ่านจาก /api/site-settings.json ไปสร้างฟอร์ม · max = จำนวนตัวอักษรสูงสุด
const FIELDS = {
    brand: [
        { key: 'logo_url', type: 'image', hint: { th: 'โลโก้แนวนอน PNG/SVG พื้นใส', en: 'Horizontal logo, PNG/SVG, transparent' } },
        { key: 'logo_height', type: 'number', min: 20, max: 80 },
        { key: 'favicon_url', type: 'image', hint: { th: 'สี่เหลี่ยมจัตุรัส อย่างน้อย 512×512 PNG หรือ SVG', en: 'Square, at least 512×512, PNG or SVG' } },
        { key: 'apple_touch_icon_url', type: 'image', hint: { th: '180×180 พื้นทึบ (iPhone ไม่รองรับพื้นใส)', en: '180×180, solid background' } },
        { key: 'theme_color', type: 'color' },
        { key: 'primary_color', type: 'color', hint: { th: 'สีปุ่มหลัก ข้อความเล็กบนหัว และลิงก์ทั้งหน้า · สีตัวหนังสือบนปุ่มเลือกขาว/เข้มให้เอง', en: 'Main buttons, the small heading and links · button text colour is chosen automatically' } },
        { key: 'page_bg_color', type: 'color', hint: { th: 'สีพื้นหลังทั้งหน้า (นอกการ์ด) · สีเข้ม = ตัวหนังสือบนพื้นหลังเปลี่ยนเป็นสีอ่อนให้เอง · การ์ดใช้สีของตัวเอง', en: 'Background of the whole page (outside the cards) · dark colours switch the page text to light automatically · cards keep their own colours' } }
    ],
    texts: [
        { key: 'site_name', type: 'text', max: 60 },
        { key: 'title', type: 'text', max: 70, hint: { th: 'ชื่อในผลค้นหา ไม่เกิน ~60 ตัวอักษร', en: 'Search result title, ~60 chars' } },
        { key: 'description', type: 'textarea', max: 200, hint: { th: 'คำอธิบายในผลค้นหา ~150 ตัวอักษร', en: 'Search snippet, ~150 chars' } },
        { key: 'about', type: 'textarea', max: 600, hint: { th: 'ย่อหน้าแนะนำ "Lullapos คืออะไร" แสดงท้ายหน้า ช่วยให้ Google และ AI สรุปถูก', en: 'A plain "What is Lullapos" paragraph shown at the bottom; helps search engines and AI summarise' } },
        { key: 'og_image_alt', type: 'text', max: 200 }
    ],
    share: [
        { key: 'og_image_th', type: 'image', hint: { th: 'รูปแชร์ 1200×630 ภาษาไทย', en: 'Share image 1200×630 (Thai)' } },
        { key: 'og_image_en', type: 'image', hint: { th: 'รูปแชร์ 1200×630 ภาษาอังกฤษ (ว่าง = ใช้รูปไทย)', en: 'Share image 1200×630 (English, empty = Thai)' } }
    ],
    social: [
        { key: 'line', type: 'url' }, { key: 'facebook', type: 'url' }, { key: 'youtube', type: 'url' },
        { key: 'tiktok', type: 'url' }, { key: 'instagram', type: 'url' }, { key: 'x', type: 'url' }
    ],
    contact: [
        { key: 'email', type: 'email' }, { key: 'phone', type: 'text', max: 30 }
    ],
    verification: [
        { key: 'google', type: 'text', max: 100, hint: { th: 'ค่า content ของ google-site-verification (Search Console)', en: 'google-site-verification content' } },
        { key: 'bing', type: 'text', max: 100, hint: { th: 'ค่า content ของ msvalidate.01 (Bing Webmaster)', en: 'msvalidate.01 content' } }
    ],
    // 🌟 ส่วนบน / ส่วนท้าย / Footer (เจ้าของ 2026-11-23: แก้ข้อความ ปุ่ม และสีให้เข้ากับธีมได้) · localized = เก็บ key_th / key_en
    //    ลิงก์ว่าง = ลิงก์ตั้งต้น (APP_BASE_URL สำหรับปุ่ม · APP_BASE_URL/doc สำหรับคู่มือ)
    hero: [
        { key: 'eyebrow', type: 'text', localized: true, max: 40 },
        { key: 'title', type: 'text', localized: true, max: 120 },
        { key: 'subtitle', type: 'textarea', localized: true, max: 300 },
        { key: 'button_text', type: 'text', localized: true, max: 40 },
        { key: 'button_url', type: 'url', hint: { th: 'เว้นว่าง = หน้าเข้าสู่ระบบ/สมัคร Lullapos · ใส่ https://, mailto: หรือ tel: ได้', en: 'Empty = Lullapos sign-in/sign-up · https://, mailto: or tel:' } },
        { key: 'show_eyebrow', type: 'boolean' },
        { key: 'show_subtitle', type: 'boolean' },
        { key: 'show_button', type: 'boolean' },
        { key: 'nav_button_text', type: 'text', localized: true, max: 30 },
        { key: 'nav_button_url', type: 'url', hint: { th: 'ปุ่มมุมขวาบน · เว้นว่าง = หน้าเข้าสู่ระบบ/สมัคร Lullapos', en: 'Top-right button · empty = Lullapos sign-in/sign-up' } },
        { key: 'show_nav_button', type: 'boolean' },
        { key: 'show_lang_switch', type: 'boolean' }
    ],
    cta: [
        { key: 'show', type: 'boolean' },
        { key: 'title', type: 'text', localized: true, max: 120 },
        { key: 'button_text', type: 'text', localized: true, max: 40 },
        { key: 'button_url', type: 'url', hint: { th: 'เว้นว่าง = หน้าเข้าสู่ระบบ/สมัคร Lullapos', en: 'Empty = Lullapos sign-in/sign-up' } },
        { key: 'note', type: 'textarea', localized: true, max: 200 },
        { key: 'show_note', type: 'boolean' },
        { key: 'bg_color', type: 'color', hint: { th: 'สีพื้นแถบส่วนท้าย · เว้นว่าง = ใช้สีพื้นหลังหน้าเว็บ · สีเข้ม = ตัวหนังสือเป็นสีอ่อนให้เอง', en: 'Band background · empty = page background · dark colours switch text to light' } }
    ],
    footer: [
        { key: 'show_about', type: 'boolean' },
        { key: 'copyright', type: 'text', localized: true, max: 120, hint: { th: 'ใช้ {year} = ปีปัจจุบัน · {name} = ชื่อเว็บ', en: '{year} = current year · {name} = site name' } },
        { key: 'manual_text', type: 'text', localized: true, max: 40 },
        { key: 'manual_url', type: 'url', hint: { th: 'เว้นว่าง = คู่มือการใช้งาน Lullapos', en: 'Empty = the Lullapos user manual' } },
        { key: 'show_manual', type: 'boolean' },
        { key: 'bg_color', type: 'color', hint: { th: 'สีพื้น Footer · เว้นว่าง = ใช้สีพื้นหลังหน้าเว็บ', en: 'Footer background · empty = page background' } }
    ],
    robots: [
        { key: 'allow_ai', type: 'boolean', hint: { th: 'ให้บอทของ AI (ChatGPT, Claude, Perplexity, Gemini) อ่านเว็บได้', en: 'Let AI crawlers (ChatGPT, Claude, Perplexity, Gemini) read the site' } }
    ]
};

const DEFAULT_SITE = {
    brand: {
        logo_url: '/assets/brand/logo.png',
        logo_height: 36,
        favicon_url: '/assets/brand/icon.svg',
        apple_touch_icon_url: '/assets/brand/apple-touch-icon.png',
        theme_color: '#f8878f',
        primary_color: '#2563eb', // เท่ากับ --lp-primary ใน public/css/v2.css
        page_bg_color: '#dfe6ef' // เท่ากับ --lp-bg ใน public/css/v2.css
    },
    // ค่าตั้งต้น = ข้อความเดิมของหน้า (ไม่แก้ = หน้าเหมือนเดิม)
    hero: {
        eyebrow_th: 'Lullapos', eyebrow_en: 'Lullapos',
        title_th: 'ทุกอย่างที่ร้านต้องใช้ เห็นได้ในหน้าเดียว', title_en: 'Everything your store runs on, on one screen',
        subtitle_th: 'การ์ดแต่ละใบคือความสามารถหนึ่งของระบบ กดที่การ์ดเพื่อดูวิธีใช้ในคู่มือ',
        subtitle_en: 'Each card is one part of the system. Click a card to see how it works in the manual.',
        button_text_th: 'เริ่มใช้งาน Lullapos', button_text_en: 'Start using Lullapos',
        button_url: '',
        show_eyebrow: true, show_subtitle: true, show_button: true,
        nav_button_text_th: 'เริ่มใช้งาน', nav_button_text_en: 'Get started',
        nav_button_url: '',
        show_nav_button: true, show_lang_switch: true
    },
    cta: {
        show: true,
        title_th: 'พร้อมลองกับร้านของคุณหรือยัง', title_en: 'Ready to try it with your store?',
        button_text_th: 'เริ่มใช้งาน Lullapos', button_text_en: 'Start using Lullapos',
        button_url: '',
        note_th: 'ตัวเลขในการ์ดที่มีป้าย "ตัวอย่าง" เป็นข้อมูลสมมุติของร้านตัวอย่าง',
        note_en: 'Numbers on cards marked "Sample" come from a made-up sample store.',
        show_note: true,
        bg_color: ''
    },
    footer: {
        show_about: true,
        copyright_th: '© {year} {name}', copyright_en: '© {year} {name}',
        manual_text_th: 'คู่มือการใช้งาน', manual_text_en: 'User manual',
        manual_url: '',
        show_manual: true,
        bg_color: ''
    },
    texts: {
        th: {
            site_name: 'Lullapos',
            title: 'Lullapos — ระบบ POS และจัดการร้านครบในที่เดียว',
            description: 'ระบบขายหน้าร้าน จอครัว สต็อกและล็อตสินค้า สมาชิกและแต้ม บัญชี ร้านยา คลินิก และแฟรนไชส์ ใช้งานบนเว็บ แท็บเล็ต และมือถือ',
            about: 'Lullapos คือระบบจัดการร้านค้าบนเว็บสำหรับธุรกิจในประเทศไทย รวมการขายหน้าร้าน (POS) จอครัวและสั่งอาหารด้วย QR สต็อกและล็อตวันหมดอายุ สมาชิกและแต้มสะสม บัญชีและภาษี ร้านขายยา คลินิก งานบริการ และการบริหารหลายสาขาหรือแฟรนไชส์ไว้ในระบบเดียว ใช้ได้ทั้งบนคอมพิวเตอร์ แท็บเล็ต และมือถือ',
            og_image_alt: 'Lullapos — ระบบ POS และจัดการร้านครบในที่เดียว'
        },
        en: {
            site_name: 'Lullapos',
            title: 'Lullapos — POS and store management in one system',
            description: 'Point of sale, kitchen display, stock and expiry lots, members and points, accounting, pharmacy, clinic and franchise tools on web, tablet and phone.',
            about: 'Lullapos is a web-based store management system for businesses in Thailand. It brings point of sale, kitchen display and QR ordering, stock with expiry lots, members and loyalty points, accounting and tax, pharmacy, clinic and service work, and multi-branch or franchise management into one system that runs on computers, tablets and phones.',
            og_image_alt: 'Lullapos — POS and store management in one system'
        }
    },
    share: { og_image_th: '/assets/brand/og-th.png', og_image_en: '/assets/brand/og-en.png' },
    social: { line: '', facebook: '', youtube: '', tiktok: '', instagram: '', x: '' },
    contact: { email: '', phone: '' },
    verification: { google: '', bing: '' },
    robots: { allow_ai: true }
};

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function cleanUrl(value) {
    if (typeof value !== 'string') return '';
    const v = value.trim();
    if (v.startsWith('/assets/')) return v.slice(0, 500);
    try {
        const u = new URL(v);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.href.slice(0, 2000) : '';
    } catch { return ''; }
}

function cleanValue(field, value, fallback) {
    switch (field.type) {
        case 'image':
            return cleanUrl(value) || fallback;
        case 'url': {
            // ปุ่ม/ลิงก์รับ mailto: และ tel: ได้ด้วย (เช่น ปุ่ม "ติดต่อเรา")
            if (typeof value === 'string' && /^(mailto|tel):[^\s<>"']{1,200}$/i.test(value.trim())) return value.trim();
            return cleanUrl(value) || fallback;
        }
        case 'number': {
            const n = Number(value);
            if (value === '' || value === null || !Number.isFinite(n)) return fallback;
            return Math.min(field.max ?? n, Math.max(field.min ?? n, Math.round(n)));
        }
        case 'color':
            return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : fallback;
        case 'boolean':
            return typeof value === 'boolean' ? value : fallback;
        case 'email':
            return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim().slice(0, 200) : fallback;
        default: {
            if (typeof value !== 'string') return fallback;
            const v = value.replace(/\s+/g, ' ').trim();
            return v ? v.slice(0, field.max || 200) : fallback;
        }
    }
}

// รวมค่าจากหลังบ้านกับค่าตั้งต้นทีละช่อง — ค่าที่ผิดรูปหรือว่างจะไม่ทับค่าตั้งต้น
function normalizeSiteSettings(raw) {
    const src = isObj(raw) ? raw : {};
    const out = {};
    for (const group of Object.keys(FIELDS)) {
        if (group === 'texts') continue;
        const from = isObj(src[group]) ? src[group] : {};
        out[group] = {};
        for (const field of FIELDS[group]) {
            if (!field.localized) { out[group][field.key] = cleanValue(field, from[field.key], DEFAULT_SITE[group][field.key]); continue; }
            // ข้อความหลายภาษาในกลุ่มอื่น: key_th / key_en · อังกฤษว่าง → ไทยที่ตั้งไว้ → ค่าตั้งต้นของภาษานั้น
            const th = cleanValue(field, from[`${field.key}_th`], null);
            for (const locale of LOCALES) {
                const k = `${field.key}_${locale}`;
                const own = cleanValue(field, from[k], null);
                out[group][k] = own ?? (locale === DEFAULT_LOCALE ? null : th) ?? DEFAULT_SITE[group][k];
            }
        }
    }
    const texts = isObj(src.texts) ? src.texts : {};
    out.texts = {};
    for (const locale of LOCALES) {
        const from = isObj(texts[locale]) ? texts[locale] : {};
        out.texts[locale] = {};
        for (const field of FIELDS.texts) {
            // ภาษาอื่นที่ว่าง → ใช้ภาษาไทยที่ตั้งไว้ → ใช้ค่าตั้งต้นของภาษานั้น
            const thValue = locale === DEFAULT_LOCALE ? undefined : (isObj(texts.th) ? texts.th[field.key] : undefined);
            const fallback = DEFAULT_SITE.texts[locale][field.key];
            const own = cleanValue(field, from[field.key], null);
            out.texts[locale][field.key] = own ?? cleanValue(field, thValue, null) ?? fallback;
        }
    }
    return out;
}

// แคชค่าที่อ่านได้ไว้สั้นๆ — หน้าแรกเปิดบ่อย ไม่ต้องถามฐานข้อมูลทุกครั้ง
function createSiteSource({ loadPublished = null, cacheMs = 60000, logger = console, now = Date.now } = {}) {
    let cache = null;
    return async function getSite() {
        if (!loadPublished) return normalizeSiteSettings(null);
        if (cache && now() - cache.at < cacheMs) return cache.value;
        try {
            const value = normalizeSiteSettings(await loadPublished());
            cache = { at: now(), value };
            return value;
        } catch (err) {
            logger.error('[v2] load site settings failed, using defaults:', err.message);
            return cache ? cache.value : normalizeSiteSettings(null);
        }
    };
}

module.exports = { FIELDS, DEFAULT_SITE, LOCALES, normalizeSiteSettings, createSiteSource, cleanUrl };
