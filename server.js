const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: 'เข้าสู่ระบบผิดพลาดบ่อยเกินไป กรุณาลองใหม่ในอีก 15 นาที'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// เลย์เอาต์ที่เลือกได้ในหน้าแอดมิน (id ต้องตรงกับชื่อไฟล์ใน views/partials/)
const TEMPLATES = {
    hero: [
        { id: 'split-with-image', name: 'ข้อความซ้าย / รูปขวา', image: true },
        { id: 'split-image-left', name: 'รูปซ้าย / ข้อความขวา', image: true },
        { id: 'simple-centered', name: 'กึ่งกลาง ไม่มีรูป', image: false },
        { id: 'centered-with-screenshot', name: 'กึ่งกลาง + ภาพหน้าจอด้านล่าง', image: true },
        { id: 'background-image', name: 'รูปเต็มพื้นหลัง (โทนเข้ม)', image: true }
    ],
    features: [
        { id: 'three-column-icons', name: 'การ์ด 3 คอลัมน์ (ไอคอนซ้าย)', image: false },
        { id: 'offset-grid-icons', name: 'ตาราง 2 คอลัมน์ (ไอคอนเยื้องซ้าย)', image: false },
        { id: 'centered-grid', name: 'ตารางกึ่งกลาง (ไอคอนด้านบน)', image: false },
        { id: 'with-screenshot', name: 'รายการซ้าย + ภาพหน้าจอขวา', image: true }
    ]
};
const pickTemplate = (group, value, fallback) => TEMPLATES[group].some(t => t.id === value) ? value : fallback;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS LANDING_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS landing_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS landing_articles (
                id SERIAL PRIMARY KEY,
                category_id INTEGER REFERENCES landing_categories(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                cover_image TEXT,
                seo_description TEXT,
                content TEXT NOT NULL,
                is_published BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const defaultSettings = {
            favicon_url: 'https://via.placeholder.com/32',
            logo_url: 'https://via.placeholder.com/150x50?text=Logo',
            theme_color: 'rgb(244 97 100 / 98%)',
            hero_list: JSON.stringify([
                {
                    template: 'split-with-image',
                    badge: 'POS ระบบยุคใหม่เพื่อร้านค้าทุกขนาด',
                    title: 'Lullapos โตไปด้วยกัน จ่ายตามจริง',
                    desc: 'จุดเริ่มต้นจากหัวใจคนชนบท สู่ระบบจัดการร้านค้าที่ทรงพลัง เลิกแบกรับต้นทุนรายเดือนที่แสนแพง ให้คุณเริ่มใช้ฟรี และจ่ายเพียงเศษสตางค์เมื่อธุรกิจคุณเติบโต',
                    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
                    buttons: [{ text: 'สมัครใช้งานฟรี', url: '#', style: 'primary', size: 'text-sm' }]
                }
            ]),
            feature_badge: 'วิสัยทัศน์ของเรา',
            feature_title: 'ความฝันเล็กๆ สู่การเปลี่ยนแปลงที่ยิ่งใหญ่',
            feature_subtitle: 'หัวใจของการทำธุรกิจ ไม่ควรถูกจำกัดด้วยขนาดของร้านหรือทำเลที่ตั้ง Lullapos จึงเกิดมาเพื่อทลายกำแพงนั้น',
            col_list: JSON.stringify([
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"></path></svg>`, title: 'สร้างจากหัวใจคนชนบท', desc: 'คุณอภิลักษณ์ แสงขวัญ ตั้งใจสร้างระบบนี้เพื่อให้ร้านค้าเล็กๆ นอกเมือง มีเครื่องมือดีๆ ใช้ในราคาที่สู้ไหว', highlight: false, badge: '' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"></path></svg>`, title: 'ใช้ฟรี 1,000 ออเดอร์แรก', desc: 'ให้คุณเริ่มต้นปรับตัวเข้าสู่เทคโนโลยีได้ทันทีโดยไม่มีความเสี่ยง ไม่ถึงพันบิล ไม่ต้องเสียเงินแม้แต่บาทเดียว', highlight: false, badge: '' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`, title: 'ยุติธรรม จ่ายเพียง 5 สตางค์', desc: 'เมื่อถึงเวลาเติบโต ออเดอร์ที่ 1,001 เป็นต้นไป จ่ายแค่ 5 สตางค์/ออเดอร์ เดือนไหนเงียบจ่ายน้อย แฟร์ที่สุด', highlight: true, badge: 'คุ้มค่าที่สุด' },
            ]),
            col_template: 'three-column-icons',
            col_img_url: '',
            footer_text: '© 2026 Lullapos.com. โตไปด้วยกัน จ่ายตามจริง.',
            facebook_url: 'https://facebook.com/',
            facebook_icon: `<svg fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd" /></svg>`,
            line_url: 'https://line.me/th/',
            line_icon: `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.082.923.258 1.058.59.12.295.079.756.038 1.066l-.164 1.031c-.046.297.228.536.5.385 2.15-1.189 6.071-4.225 7.734-6.31 1.722-2.128 2.8-4.321 2.8-6.37zm-14.862 3.655h-2.502c-.366 0-.662-.297-.662-.662v-4.992c0-.365.296-.662.662-.662.366 0 .662.297.662.662v4.33h1.84c.366 0 .662.296.662.662 0 .365-.296.662-.662.662zm2.686-.662c0 .365-.296.662-.662.662-.366 0-.662-.297-.662-.662v-4.992c0-.365.296-.662.662-.662.366 0 .662.297.662.662v4.992zm5.023 0c0 .365-.296.662-.662.662-.366 0-.662-.297-.662-.662v-2.738l-1.928 2.535c-.131.171-.32.265-.515.265-.015 0-.03 0-.045-.002-.213-.021-.383-.2-.383-.414v-4.992c0-.365.296-.662.662-.662.366 0 .662.297.662.662v2.738l1.928-2.535c.131-.171.32-.265.515-.265.015 0 .03 0 .045.002.213.021.383.2.383.414v4.992zm4.316-3.003c0 .365-.296.662-.662.662h-1.84v.998h1.84c.366 0 .662.296.662.662 0 .365-.296.662-.662.662h-2.502c-.366 0-.662-.297-.662-.662v-4.992c0-.365.296-.662.662-.662h2.502c.366 0 .662.297.662.662 0 .365-.296.662-.662.662h-1.84v1.006h1.84c.366 0 .662.297.662.662z"/></svg>`,
            grid_badge: 'ฟีเจอร์ที่ตอบโจทย์',
            grid_title: 'ฟีเจอร์ครบครัน สำหรับจัดการร้านค้า',
            grid_desc: 'ทุกสิ่งที่คุณต้องการในการบริหารร้านค้าให้อยู่หมัด รวบรวมไว้ในระบบเดียว ใช้งานง่าย ไม่ซับซ้อน',
            grid_list: JSON.stringify([
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"></path></svg>`, title: 'ทำงานบนคลาวด์ 100%', desc: 'ไม่ต้องติดตั้งโปรแกรม ข้อมูลไม่หายแม้อุปกรณ์พัง' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"></path></svg>`, title: 'ความปลอดภัยสูงสุด', desc: 'ปกป้องข้อมูลยอดขายและข้อมูลลูกค้าของคุณ' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>`, title: 'อัปเดตข้อมูลแบบเรียลไทม์', desc: 'สต๊อกสินค้าซิงค์ตรงกันทุกอุปกรณ์ทันที' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"></path></svg>`, title: 'ระบบจัดการสิทธิ์พนักงาน', desc: 'กำหนดสิทธิ์การเข้าถึงได้อย่างอิสระ' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>`, title: 'รายงานยอดขายอัจฉริยะ', desc: 'สรุปยอดขายรายวัน รายเดือน พร้อมกราฟ' },
                { icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"></path></svg>`, title: 'รองรับการชำระเงินหลายรูปแบบ', desc: 'เงินสด โอนเงิน พร้อมเพย์ หรือบัตรเครดิต' },
            ]),
            grid_template: 'offset-grid-icons',
            grid_img_url: '',
            
            stats_badge: 'ภารกิจของเรา', stats_title: 'สถิติที่เติบโตไปพร้อมกับคุณ', stats_desc: 'Lullapos มุ่งมั่นที่จะเป็นส่วนหนึ่งในความสำเร็จของร้านค้าขนาดเล็ก เราพร้อมสนับสนุนคุณด้วยระบบที่เสถียร ใช้งานง่าย และยุติธรรมที่สุด', stats_img_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80',
            stat1_label: 'ร้านค้าที่ไว้วางใจ', stat1_value: '8,000+', stat2_label: 'ค่าธรรมเนียมแรกเข้า', stat2_value: '0 ฿', stat3_label: 'ระบบเสถียร (Uptime)', stat3_value: '99.9%', stat4_label: 'ประหยัดต้นทุนเฉลี่ย', stat4_value: '100%',
            
            faq_title: 'คำถามที่พบบ่อย (FAQ)',
            faq_list: JSON.stringify([
                { question: "เริ่มต้นใช้งานฟรี 1,000 ออเดอร์ จริงไหม?", answer: "จริงครับ! ไม่มีข้อผูกมัดใดๆ แอบแฝง" },
                { question: "ถ้าเกิน 1,000 ออเดอร์ จะคิดเงินอย่างไร?", answer: "เราคิดเพียง 5 สตางค์ ต่อ 1 ออเดอร์ที่เกินมาครับ" }
            ]),
            
            cta_title: 'พร้อมที่จะเติบโตไปกับเราหรือยัง?', cta_desc: 'สมัครใช้งาน Lullapos วันนี้ เริ่มต้นฟรี 1,000 ออเดอร์แรก', cta_btn1_text: 'เริ่มต้นใช้งานฟรี', cta_btn1_url: '#', cta_btn2_text: 'เรียนรู้เพิ่มเติม', cta_btn2_url: '#',
            
            seo_title: 'Lullapos - ระบบ POS สำหรับร้านค้าขนาดเล็ก ใช้ฟรี จ่ายตามจริง', seo_description: 'ระบบจัดการหน้าร้าน Lullapos เริ่มต้นใช้งานฟรี', seo_keywords: 'ระบบ pos, ระบบ pos ฟรี', seo_thumbnail_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
            
            banner_active: 'false',
            banner_display_type: 'always', 
            banner_display_limit: '1',
            banner_version: '1',
            banner_list: '[]',
            
            article_cta_title: 'พร้อมเปลี่ยนระบบร้านค้าของคุณหรือยัง?',
            article_cta_btn_text: 'ลองใช้ Lullapos ฟรี 1,000 ออเดอร์แรก',
            article_cta_btn_url: '#'
        };

        // แปลงส่วน Hero เดี่ยวของข้อมูลเดิม ให้เป็นลิสต์ที่วางได้หลายบล็อก (hero_list)
        const heroListRow = await pool.query("SELECT value FROM LANDING_settings WHERE key = 'hero_list'");
        if (heroListRow.rows.length === 0) {
            const legacyHeroRes = await pool.query(
                "SELECT key, value FROM LANDING_settings WHERE key IN ('hero_badge','hero_title','hero_desc','hero_img_url','btn_text','btn_url','btn_size')"
            );
            const legacyHero = {};
            legacyHeroRes.rows.forEach(row => { legacyHero[row.key] = row.value; });
            if (legacyHero.hero_title) {
                const buttons = legacyHero.btn_text
                    ? [{ text: legacyHero.btn_text, url: legacyHero.btn_url || '#', style: 'primary', size: legacyHero.btn_size || 'text-sm' }]
                    : [];
                await pool.query(
                    "INSERT INTO LANDING_settings (key, value) VALUES ('hero_list', $1) ON CONFLICT (key) DO NOTHING",
                    [JSON.stringify([{
                        template: 'split-with-image',
                        badge: legacyHero.hero_badge || '',
                        title: legacyHero.hero_title,
                        desc: legacyHero.hero_desc || '',
                        image: legacyHero.hero_img_url || '',
                        buttons
                    }])]
                );
            }
        }

        // แปลงวิสัยทัศน์แบบตายตัว (col1..col3) ของข้อมูลเดิม ให้เป็นลิสต์ที่เพิ่ม/ลดได้ (col_list)
        const colListRow = await pool.query("SELECT value FROM LANDING_settings WHERE key = 'col_list'");
        if (colListRow.rows.length === 0) {
            const legacyColRes = await pool.query("SELECT key, value FROM LANDING_settings WHERE key ~ '^col[0-9]+_(title|desc|icon)$'");
            const legacyCol = {};
            legacyColRes.rows.forEach(row => { legacyCol[row.key] = row.value; });
            const migratedCols = [];
            for (let i = 1; i <= 3; i++) {
                if (!legacyCol['col' + i + '_title']) continue;
                migratedCols.push({
                    icon: legacyCol['col' + i + '_icon'] || '',
                    title: legacyCol['col' + i + '_title'],
                    desc: legacyCol['col' + i + '_desc'] || '',
                    highlight: i === 3,
                    badge: i === 3 ? 'คุ้มค่าที่สุด' : ''
                });
            }
            if (migratedCols.length > 0) {
                await pool.query(
                    "INSERT INTO LANDING_settings (key, value) VALUES ('col_list', $1) ON CONFLICT (key) DO NOTHING",
                    [JSON.stringify(migratedCols)]
                );
            }
        }

        // แปลงฟีเจอร์หลักแบบตายตัว (grid1..grid6) ของข้อมูลเดิม ให้เป็นลิสต์ที่เพิ่ม/ลดได้ (grid_list)
        const gridListRow = await pool.query("SELECT value FROM LANDING_settings WHERE key = 'grid_list'");
        if (gridListRow.rows.length === 0) {
            const legacyRes = await pool.query("SELECT key, value FROM LANDING_settings WHERE key ~ '^grid[0-9]+_(title|desc|icon)$'");
            const legacy = {};
            legacyRes.rows.forEach(row => { legacy[row.key] = row.value; });
            const migrated = [];
            for (let i = 1; i <= 6; i++) {
                if (!legacy[`grid${i}_title`]) continue;
                migrated.push({
                    icon: legacy[`grid${i}_icon`] || '',
                    title: legacy[`grid${i}_title`],
                    desc: legacy[`grid${i}_desc`] || ''
                });
            }
            if (migrated.length > 0) {
                await pool.query(
                    "INSERT INTO LANDING_settings (key, value) VALUES ('grid_list', $1) ON CONFLICT (key) DO NOTHING",
                    [JSON.stringify(migrated)]
                );
            }
        }

        for (const [key, value] of Object.entries(defaultSettings)) {
            await pool.query(
                `INSERT INTO LANDING_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
                [key, value]
            );
        }
        console.log("Database initialized");
    } catch (err) {
        console.error("Database initialization failed:", err);
    }
}
initDB();

async function getSettings() {
    const res = await pool.query('SELECT key, value FROM LANDING_settings');
    const settings = {};
    res.rows.forEach(row => { settings[row.key] = row.value; });
    return settings;
}

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

async function uploadToR2(file, folder = '') {
    const fileExt = path.extname(file.originalname);
    const fileName = `landing_${Date.now()}_${Math.floor(Math.random() * 1000)}${fileExt}`;
    const key = folder ? `${folder}/${fileName}` : fileName;
    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));
    return `${process.env.R2_PUBLIC_URL}/${key}`;
}

function requireAuth(req, res, next) {
    if (req.session.isLoggedIn) return next();
    res.redirect('/admin/login');
}

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const sanitizeHtml = (dirty) => DOMPurify.sanitize(dirty);

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\nSitemap: https://lullapos.com/sitemap.xml");
});

app.get('/sitemap.xml', async (req, res) => {
    try {
        const articles = await pool.query('SELECT slug, created_at FROM landing_articles WHERE is_published = true ORDER BY created_at DESC');
        let urls = `
  <url>
    <loc>https://lullapos.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lullapos.com/articles</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
        articles.rows.forEach(a => {
            urls += `
  <url>
    <loc>https://lullapos.com/article/${encodeURIComponent(a.slug)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });
        res.type('application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`);
    } catch (e) {
        res.status(500).send('');
    }
});

app.get('/', async (req, res, next) => {
    try {
        const settings = await getSettings();
        const articlesRes = await pool.query(`
            SELECT a.title, a.slug, a.cover_image, a.seo_description, c.name as category_name, a.created_at
            FROM landing_articles a 
            LEFT JOIN landing_categories c ON a.category_id = c.id 
            WHERE a.is_published = true 
            ORDER BY a.created_at DESC LIMIT 9
        `);
        res.render('index', { settings, latest_articles: articlesRes.rows, templates: TEMPLATES });
    } catch (err) {
        next(err);
    }
});

app.get('/articles', async (req, res, next) => {
    try {
        const settings = await getSettings();
        
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const offset = (page - 1) * limit;
        
        const search = req.query.search || '';
        const category = req.query.category || '';
        
        let queryStr = `
            FROM landing_articles a 
            LEFT JOIN landing_categories c ON a.category_id = c.id 
            WHERE a.is_published = true
        `;
        let params = [];
        
        if (search) {
            params.push(`%${search}%`);
            queryStr += ` AND (a.title ILIKE $${params.length} OR a.seo_description ILIKE $${params.length} OR a.content ILIKE $${params.length})`;
        }
        
        if (category) {
            params.push(category);
            queryStr += ` AND a.category_id = $${params.length}`;
        }
        
        const countRes = await pool.query(`SELECT COUNT(*) ${queryStr}`, params);
        const total = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(total / limit);
        
        const articlesQuery = `
            SELECT a.title, a.slug, a.cover_image, a.seo_description, c.name as category_name, a.created_at
            ${queryStr}
            ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
        const articlesRes = await pool.query(articlesQuery, params);
        
        const catRes = await pool.query('SELECT * FROM landing_categories ORDER BY name ASC');
        
        res.render('articles', { 
            settings, 
            articles: articlesRes.rows,
            categories: catRes.rows,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            selectedCategory: category
        });
    } catch (err) {
        next(err);
    }
});

// --- อัปเดตส่วนดึงบทความสำหรับแสดงในหน้าบทความเดี่ยว ---
app.get('/article/:slug', async (req, res, next) => {
    try {
        const settings = await getSettings();
        
        // 1. ดึงข้อมูลบทความหลัก
        const articleRes = await pool.query(`
            SELECT a.*, c.name as category_name 
            FROM landing_articles a 
            LEFT JOIN landing_categories c ON a.category_id = c.id 
            WHERE a.slug = $1 AND a.is_published = true
        `, [req.params.slug]);

        if (articleRes.rows.length === 0) return res.status(404).send('ไม่พบบทความ');
        const article = articleRes.rows[0];

        // 2. ดึงบทความที่เกี่ยวข้อง 6 บทความ (สุ่ม/เน้นหมวดเดียวกัน ไม่เอาบทความปัจจุบัน)
        const relatedRes = await pool.query(`
            SELECT a.title, a.slug, a.cover_image, a.seo_description, c.name as category_name, a.created_at
            FROM landing_articles a 
            LEFT JOIN landing_categories c ON a.category_id = c.id 
            WHERE a.is_published = true AND a.id != $1
            ORDER BY CASE WHEN a.category_id = $2 THEN 1 ELSE 0 END DESC, RANDOM() 
            LIMIT 6
        `, [article.id, article.category_id || 0]);

        res.render('article', { 
            settings, 
            article: article,
            related_articles: relatedRes.rows 
        });
    } catch (err) {
        next(err);
    }
});

const wakeupLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 3, message: 'Too Many Requests' });
app.get('/wakeup', wakeupLimiter, (req, res) => res.status(200).send('OK'));

app.get('/admin/login', (req, res) => { res.render('login', { error: null }); });

app.post('/admin/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
});

app.get('/admin', requireAuth, async (req, res, next) => {
    try {
        const settings = await getSettings();
        res.render('admin', { settings, templates: TEMPLATES });
    } catch (err) {
        next(err);
    }
});

app.post('/admin/save', requireAuth, upload.fields([
    { name: 'favicon', maxCount: 1 }, { name: 'logo', maxCount: 1 },
    { name: 'stats_img', maxCount: 1 },
    { name: 'seo_thumbnail', maxCount: 1 }, { name: 'banner_img', maxCount: 1 }
]), async (req, res, next) => {
    try {
        const body = req.body;
        
        let cleanFaqList = body.faq_list;
        try {
            let parsedFaq = JSON.parse(body.faq_list || '[]');
            parsedFaq = parsedFaq.map(f => ({ question: f.question, answer: sanitizeHtml(f.answer) }));
            cleanFaqList = JSON.stringify(parsedFaq);
        } catch (e) { }

        let cleanHeroList = body.hero_list;
        try {
            let parsedHero = JSON.parse(body.hero_list || '[]');
            parsedHero = parsedHero.map(h => ({
                template: pickTemplate('hero', h.template, 'split-with-image'),
                badge: (h.badge || '').toString(),
                title: (h.title || '').toString(),
                desc: sanitizeHtml(h.desc || ''),
                image: (h.image || '').toString(),
                buttons: (Array.isArray(h.buttons) ? h.buttons : []).map(b => ({
                    text: (b.text || '').toString(),
                    url: (b.url || '').toString(),
                    style: ['primary', 'secondary', 'link'].includes(b.style) ? b.style : 'primary',
                    size: ['text-sm', 'text-base', 'text-lg'].includes(b.size) ? b.size : 'text-sm'
                }))
            }));
            cleanHeroList = JSON.stringify(parsedHero);
        } catch (e) { }

        let cleanColList = body.col_list;
        try {
            let parsedCol = JSON.parse(body.col_list || '[]');
            parsedCol = parsedCol.map(c => ({
                icon: (c.icon || '').toString(),
                title: (c.title || '').toString(),
                desc: sanitizeHtml(c.desc || ''),
                highlight: c.highlight === true,
                badge: (c.badge || '').toString()
            }));
            cleanColList = JSON.stringify(parsedCol);
        } catch (e) { }

        let cleanGridList = body.grid_list;
        try {
            let parsedGrid = JSON.parse(body.grid_list || '[]');
            parsedGrid = parsedGrid.map(g => ({
                icon: (g.icon || '').toString(),
                title: (g.title || '').toString(),
                desc: (g.desc || '').toString()
            }));
            cleanGridList = JSON.stringify(parsedGrid);
        } catch (e) { }

        const updates = { 
            theme_color: body.theme_color, hero_list: cleanHeroList,
            feature_badge: body.feature_badge, feature_title: body.feature_title, feature_subtitle: body.feature_subtitle,
            col_list: cleanColList, col_template: pickTemplate('features', body.col_template, 'three-column-icons'), col_img_url: body.col_img_url || '',
            footer_text: body.footer_text, facebook_url: body.facebook_url, line_url: body.line_url, facebook_icon: body.facebook_icon, line_icon: body.line_icon,
            grid_badge: body.grid_badge, grid_title: body.grid_title, grid_desc: sanitizeHtml(body.grid_desc),
            grid_list: cleanGridList, grid_template: pickTemplate('features', body.grid_template, 'offset-grid-icons'), grid_img_url: body.grid_img_url || '',
            stats_badge: body.stats_badge, stats_title: body.stats_title, stats_desc: sanitizeHtml(body.stats_desc),
            stat1_label: body.stat1_label, stat1_value: body.stat1_value, stat2_label: body.stat2_label, stat2_value: body.stat2_value,
            stat3_label: body.stat3_label, stat3_value: body.stat3_value, stat4_label: body.stat4_label, stat4_value: body.stat4_value,
            faq_title: body.faq_title, faq_list: cleanFaqList,
            cta_title: body.cta_title, cta_desc: sanitizeHtml(body.cta_desc), cta_btn1_text: body.cta_btn1_text, cta_btn1_url: body.cta_btn1_url, cta_btn2_text: body.cta_btn2_text, cta_btn2_url: body.cta_btn2_url,
            seo_title: body.seo_title, seo_description: body.seo_description, seo_keywords: body.seo_keywords,
            banner_active: body.banner_active === 'on' ? 'true' : 'false', banner_display_type: body.banner_display_type || 'always',
            banner_display_limit: body.banner_display_limit || '1', banner_version: Date.now().toString(), banner_list: body.banner_list || '[]',
            article_cta_title: body.article_cta_title, article_cta_btn_text: body.article_cta_btn_text, article_cta_btn_url: body.article_cta_btn_url
        };

        if (req.files['favicon']) updates.favicon_url = await uploadToR2(req.files['favicon'][0], 'landingpage');
        if (req.files['logo']) updates.logo_url = await uploadToR2(req.files['logo'][0], 'landingpage');
        if (req.files['stats_img']) updates.stats_img_url = await uploadToR2(req.files['stats_img'][0], 'landingpage');
        if (req.files['seo_thumbnail']) updates.seo_thumbnail_url = await uploadToR2(req.files['seo_thumbnail'][0], 'landingpage');
        if (req.files['banner_img']) updates.banner_img_url = await uploadToR2(req.files['banner_img'][0], 'landingpage');

        for (const [key, value] of Object.entries(updates)) {
            await pool.query(
                `INSERT INTO LANDING_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [key, value]
            );
        }
        res.redirect('/admin');
    } catch (error) { next(error); }
});

app.post('/admin/api/upload-image', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' });
        const fileUrl = await uploadToR2(req.file, 'landingpage/thumbnail');
        res.json({ success: true, url: fileUrl });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/admin/api/upload-media', requireAuth, upload.single('media'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'ไม่มีไฟล์อัปโหลด' });
        const fileUrl = await uploadToR2(req.file, 'landingpage');
        res.json({ success: true, url: fileUrl });
    } catch (error) { res.status(500).json({ success: false, message: 'อัปโหลดไม่สำเร็จ' }); }
});

app.post('/admin/api/upload-slide', requireAuth, upload.single('slide_image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'ไม่มีไฟล์อัปโหลด' });
        const fileUrl = await uploadToR2(req.file, 'landingpage');
        res.json({ success: true, url: fileUrl });
    } catch (error) { res.status(500).json({ success: false, message: 'อัปโหลดไม่สำเร็จ' }); }
});

app.get('/admin/api/categories', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM landing_categories ORDER BY id DESC');
    res.json(result.rows);
});
app.post('/admin/api/categories', requireAuth, async (req, res) => {
    await pool.query('INSERT INTO landing_categories (name) VALUES ($1)', [req.body.name]);
    res.json({ success: true });
});
app.delete('/admin/api/categories/:id', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM landing_categories WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.get('/admin/api/articles', requireAuth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const countRes = await pool.query('SELECT COUNT(*) FROM landing_articles');
    const total = parseInt(countRes.rows[0].count);
    const result = await pool.query(`
        SELECT a.id, a.title, a.is_published, a.created_at, c.name as category_name 
        FROM landing_articles a LEFT JOIN landing_categories c ON a.category_id = c.id 
        ORDER BY a.created_at DESC LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ articles: result.rows, totalPages: Math.ceil(total / limit), currentPage: page });
});

app.get('/admin/api/articles/:id', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM landing_articles WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
});

app.post('/admin/api/articles', requireAuth, upload.single('cover_image'), async (req, res) => {
    try {
        let cover_image = null;
        if (req.file) cover_image = await uploadToR2(req.file, 'landingpage/thumbnail');
        
        const { category_id, title, seo_description, content, is_published } = req.body;
        const slug = Math.random().toString(36).substring(2, 15) + '-' + Date.now();
        
        await pool.query(`
            INSERT INTO landing_articles (category_id, title, slug, cover_image, seo_description, content, is_published)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [category_id || null, title, slug, cover_image, seo_description, sanitizeHtml(content), is_published === 'true']);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/admin/api/articles/:id', requireAuth, upload.single('cover_image'), async (req, res) => {
    try {
        const { category_id, title, seo_description, content, is_published } = req.body;
        let query = `UPDATE landing_articles SET category_id=$1, title=$2, seo_description=$3, content=$4, is_published=$5 WHERE id=$6`;
        let params = [category_id || null, title, seo_description, sanitizeHtml(content), is_published === 'true', req.params.id];
        
        if (req.file) {
            const cover_image = await uploadToR2(req.file, 'landingpage/thumbnail');
            query = `UPDATE landing_articles SET category_id=$1, title=$2, seo_description=$3, content=$4, is_published=$5, cover_image=$6 WHERE id=$7`;
            params = [category_id || null, title, seo_description, sanitizeHtml(content), is_published === 'true', cover_image, req.params.id];
        }
        await pool.query(query, params);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/admin/api/articles/:id', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM landing_articles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).send('ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 5MB)');
    }
    res.status(500).send('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));