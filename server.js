const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ตั้งค่า View Engine เป็น EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ตั้งค่า Session สำหรับระบบ Login
app.use(session({
    secret: 'lullapos-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ==========================================
// 1. ตั้งค่า Database (PostgreSQL)
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // จำเป็นสำหรับ Render
});

// สร้างตารางและข้อมูลเริ่มต้นอัตโนมัติ
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS LANDING_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT
        );
    `);
    
    // ข้อมูล Default กรณีรันครั้งแรก
    const defaultSettings = {
        favicon_url: 'https://via.placeholder.com/32',
        logo_url: 'https://via.placeholder.com/150x50?text=Logo',
        theme_color: 'rgb(244 97 100 / 98%)',
        
        hero_badge: 'POS ระบบยุคใหม่เพื่อร้านค้าทุกขนาด',
        hero_title: 'Lullapos โตไปด้วยกัน จ่ายตามจริง',
        hero_desc: 'จุดเริ่มต้นจากหัวใจคนชนบท สู่ระบบจัดการร้านค้าที่ทรงพลัง เลิกแบกรับต้นทุนรายเดือนที่แสนแพง ให้คุณเริ่มใช้ฟรี และจ่ายเพียงเศษสตางค์เมื่อธุรกิจคุณเติบโต',
        hero_img_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
        
        feature_title: 'ความฝันเล็กๆ สู่การเปลี่ยนแปลงที่ยิ่งใหญ่',
        feature_subtitle: 'หัวใจของการทำธุรกิจ ไม่ควรถูกจำกัดด้วยขนาดของร้านหรือทำเลที่ตั้ง Lullapos จึงเกิดมาเพื่อทลายกำแพงนั้น',
        col1_title: 'สร้างจากหัวใจคนชนบท',
        col1_desc: 'คุณอภิลักษณ์ แสงขวัญ ตั้งใจสร้างระบบนี้เพื่อให้ร้านค้าเล็กๆ นอกเมือง มีเครื่องมือดีๆ ใช้ในราคาที่สู้ไหว',
        col1_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"></path></svg>`,
        col2_title: 'ใช้ฟรี 1,000 ออเดอร์แรก',
        col2_desc: 'ให้คุณเริ่มต้นปรับตัวเข้าสู่เทคโนโลยีได้ทันทีโดยไม่มีความเสี่ยง ไม่ถึงพันบิล ไม่ต้องเสียเงินแม้แต่บาทเดียว',
        col2_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"></path></svg>`,
        col3_title: 'ยุติธรรม จ่ายเพียง 5 สตางค์',
        col3_desc: 'เมื่อถึงเวลาเติบโต ออเดอร์ที่ 1,001 เป็นต้นไป จ่ายแค่ 5 สตางค์/ออเดอร์ เดือนไหนเงียบจ่ายน้อย แฟร์ที่สุด',
        col3_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        
        footer_text: '© 2026 Lullapos.com. โตไปด้วยกัน จ่ายตามจริง.',
        facebook_url: 'https://facebook.com/',
        line_url: 'https://line.me/th/',

        grid_badge: 'ฟีเจอร์ที่ตอบโจทย์',
        grid_title: 'ฟีเจอร์ครบครัน สำหรับจัดการร้านค้า',
        grid_desc: 'ทุกสิ่งที่คุณต้องการในการบริหารร้านค้าให้อยู่หมัด รวบรวมไว้ในระบบเดียว ใช้งานง่าย ไม่ซับซ้อน',
        grid1_title: 'ทำงานบนคลาวด์ 100%',
        grid1_desc: 'ไม่ต้องติดตั้งโปรแกรม ข้อมูลไม่หายแม้อุปกรณ์พัง เข้าถึงร้านค้าได้จากทุกที่ทุกเวลา',
        grid1_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"></path></svg>`,
        grid2_title: 'ความปลอดภัยสูงสุด',
        grid2_desc: 'ปกป้องข้อมูลยอดขายและข้อมูลลูกค้าของคุณด้วยมาตรฐานความปลอดภัยระดับสากล',
        grid2_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"></path></svg>`,
        grid3_title: 'อัปเดตข้อมูลแบบเรียลไทม์',
        grid3_desc: 'สต๊อกสินค้าและยอดขายซิงค์ตรงกันทุกอุปกรณ์ทันที ไม่ต้องรอกดรีเฟรช',
        grid3_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>`,
        grid4_title: 'ระบบจัดการสิทธิ์พนักงาน',
        grid4_desc: 'กำหนดสิทธิ์การเข้าถึงเมนูต่างๆ ของพนักงานแต่ละคนได้อย่างอิสระและปลอดภัย',
        grid4_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33"></path></svg>`,
        // เพิ่มฟีเจอร์ที่ 5 และ 6 ตรงนี้
        grid5_title: 'รายงานยอดขายอัจฉริยะ',
        grid5_desc: 'สรุปยอดขายรายวัน รายเดือน พร้อมกราฟที่เข้าใจง่าย ช่วยให้คุณวิเคราะห์ธุรกิจได้แม่นยำ',
        grid5_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"></path></svg>`,
        grid6_title: 'รองรับการชำระเงินหลายรูปแบบ',
        grid6_desc: 'เงินสด โอนเงิน พร้อมเพย์ หรือบัตรเครดิต ครอบคลุมทุกความต้องการของลูกค้ายุคใหม่',
        grid6_icon: `<svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"></path></svg>`,

        btn_text: 'สมัครใช้งานฟรี',
        btn_url: '#',
        btn_size: 'text-sm',

        stats_badge: 'ภารกิจของเรา',
        stats_title: 'สถิติที่เติบโตไปพร้อมกับคุณ',
        stats_desc: 'Lullapos มุ่งมั่นที่จะเป็นส่วนหนึ่งในความสำเร็จของร้านค้าขนาดเล็ก เราพร้อมสนับสนุนคุณด้วยระบบที่เสถียร ใช้งานง่าย และยุติธรรมที่สุด เพื่อให้คุณโฟกัสกับการขายได้อย่างเต็มที่',
        stats_img_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80',
        stat1_label: 'ร้านค้าที่ไว้วางใจ', stat1_value: '8,000+',
        stat2_label: 'ค่าธรรมเนียมแรกเข้า', stat2_value: '0 ฿',
        stat3_label: 'ระบบเสถียร (Uptime)', stat3_value: '99.9%',
        stat4_label: 'ประหยัดต้นทุนเฉลี่ย', stat4_value: '100%'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
        await pool.query(
            `INSERT INTO LANDING_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
            [key, value]
        );
    }
    console.log("Database initialized");
}
initDB();

// ฟังก์ชันดึงการตั้งค่าทั้งหมด
async function getSettings() {
    const res = await pool.query('SELECT key, value FROM LANDING_settings');
    const settings = {};
    res.rows.forEach(row => { settings[row.key] = row.value; });
    return settings;
}

// ==========================================
// 2. ตั้งค่า Cloudflare R2 & อัปโหลดไฟล์ (Multer)
// ==========================================
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

const upload = multer({ storage: multer.memoryStorage() }); // เก็บไฟล์ใน Memory ก่อนส่งขึ้น R2

async function uploadToR2(file) {
    const fileExt = path.extname(file.originalname);
    const fileName = `landing_${Date.now()}${fileExt}`; // ตั้งชื่อไฟล์ใหม่กันซ้ำ
    
    await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

// ==========================================
// 3. ระบบ Admin Auth Middleware
// ==========================================
function requireAuth(req, res, next) {
    if (req.session.isLoggedIn) return next();
    res.redirect('/admin/login');
}

// ==========================================
// 4. Routes (เส้นทางของเว็บ)
// ==========================================

// หน้าเว็บหลัก
app.get('/', async (req, res) => {
    const settings = await getSettings();
    res.render('index', { settings });
});

// หน้า Login
app.get('/admin/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
});

// หน้า Admin Dashboard
app.get('/admin', requireAuth, async (req, res) => {
    const settings = await getSettings();
    res.render('admin', { settings });
});

// บันทึกข้อมูลและอัปโหลดรูป
app.post('/admin/save', requireAuth, upload.fields([
    { name: 'favicon', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'hero_img', maxCount: 1 },
    { name: 'stats_img', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            theme_color,
            hero_badge, hero_title, hero_desc,
            feature_title, feature_subtitle,
            col1_title, col1_desc, col1_icon, // เพิ่ม icon
            col2_title, col2_desc, col2_icon, // เพิ่ม icon
            col3_title, col3_desc, col3_icon, // เพิ่ม icon
            footer_text, facebook_url, line_url,
            grid_badge, grid_title, grid_desc,
            grid1_title, grid1_desc, grid1_icon, // เพิ่ม icon
            grid2_title, grid2_desc, grid2_icon, // เพิ่ม icon
            grid3_title, grid3_desc, grid3_icon, // เพิ่ม icon
            grid4_title, grid4_desc, grid4_icon, // เพิ่ม icon
            grid5_title, grid5_desc, grid5_icon, 
            grid6_title, grid6_desc, grid6_icon,
            btn_text, btn_url, btn_size,
            stats_badge, stats_title, stats_desc,
            stat1_label, stat1_value, stat2_label, stat2_value,
            stat3_label, stat3_value, stat4_label, stat4_value
        } = req.body;
        
        const updates = { 
            theme_color,
            hero_badge, hero_title, hero_desc,
            feature_title, feature_subtitle,
            col1_title, col1_desc, col1_icon, 
            col2_title, col2_desc, col2_icon, 
            col3_title, col3_desc, col3_icon, 
            footer_text, facebook_url, line_url,
            grid_badge, grid_title, grid_desc,
            grid1_title, grid1_desc, grid1_icon, 
            grid2_title, grid2_desc, grid2_icon, 
            grid3_title, grid3_desc, grid3_icon, 
            grid4_title, grid4_desc, grid4_icon, 
            grid5_title, grid5_desc, grid5_icon, 
            grid6_title, grid6_desc, grid6_icon, 
            btn_text, btn_url, btn_size,
            stats_badge, stats_title, stats_desc,
            stat1_label, stat1_value, stat2_label, stat2_value,
            stat3_label, stat3_value, stat4_label, stat4_value
        };

        if (req.files['favicon']) updates.favicon_url = await uploadToR2(req.files['favicon'][0]);
        if (req.files['logo']) updates.logo_url = await uploadToR2(req.files['logo'][0]);
        if (req.files['hero_img']) updates.hero_img_url = await uploadToR2(req.files['hero_img'][0]);
        if (req.files['stats_img']) updates.stats_img_url = await uploadToR2(req.files['stats_img'][0]);

        for (const [key, value] of Object.entries(updates)) {
            await pool.query(
                `INSERT INTO LANDING_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [key, value]
            );
        }
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.send("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));