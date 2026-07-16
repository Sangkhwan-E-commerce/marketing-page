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
        theme_color: 'rgb(244 97 100 / 98%)', // เพิ่มบรรทัดนี้เข้ามา
        hero_badge: 'POS ระบบยุคใหม่เพื่อร้านค้าทุกขนาด',
        // ... (ตัวแปรเดิมอื่นๆ ยังอยู่ครบ)
        favicon_url: 'https://via.placeholder.com/32',
        logo_url: 'https://via.placeholder.com/150x50?text=Logo',
        hero_badge: 'POS ระบบยุคใหม่เพื่อร้านค้าทุกขนาด',
        hero_title: 'Lullapos โตไปด้วยกัน จ่ายตามจริง',
        hero_desc: 'จุดเริ่มต้นจากหัวใจคนชนบท สู่ระบบจัดการร้านค้าที่ทรงพลัง เลิกแบกรับต้นทุนรายเดือนที่แสนแพง ให้คุณเริ่มใช้ฟรี และจ่ายเพียงเศษสตางค์เมื่อธุรกิจคุณเติบโต',
        hero_img_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
        
        // เพิ่มตัวแปรสำหรับ 3 คอลัมน์
        feature_title: 'ความฝันเล็กๆ สู่การเปลี่ยนแปลงที่ยิ่งใหญ่',
        feature_subtitle: 'หัวใจของการทำธุรกิจ ไม่ควรถูกจำกัดด้วยขนาดของร้านหรือทำเลที่ตั้ง Lullapos จึงเกิดมาเพื่อทลายกำแพงนั้น',
        col1_title: 'สร้างจากหัวใจคนชนบท',
        col1_desc: 'คุณอภิลักษณ์ แสงขวัญ ตั้งใจสร้างระบบนี้เพื่อให้ร้านค้าเล็กๆ นอกเมือง มีเครื่องมือดีๆ ใช้ในราคาที่สู้ไหว',
        col2_title: 'ใช้ฟรี 1,000 ออเดอร์แรก',
        col2_desc: 'ให้คุณเริ่มต้นปรับตัวเข้าสู่เทคโนโลยีได้ทันทีโดยไม่มีความเสี่ยง ไม่ถึงพันบิล ไม่ต้องเสียเงินแม้แต่บาทเดียว',
        // ... (ตัวแปรเดิม)
        col3_title: 'ยุติธรรม จ่ายเพียง 5 สตางค์',
        col3_desc: 'เมื่อถึงเวลาเติบโต ออเดอร์ถึง 1,000 ค่อยจ่ายแค่ 5 สตางค์/ออเดอร์ เดือนไหนเงียบจ่ายน้อย แฟร์ที่สุด',
        
        // เพิ่มตัวแปร Footer
        footer_text: '© 2026 Lullapos.com. โตไปด้วยกัน จ่ายตามจริง.',
        facebook_url: 'https://facebook.com/',
        line_url: 'https://line.me/th/',

        // เพิ่มตัวแปรสำหรับ Grid Feature (4 ข้อ)
        grid_badge: 'ฟีเจอร์ที่ตอบโจทย์',
        grid_title: 'ฟีเจอร์ครบครัน สำหรับจัดการร้านค้า',
        grid_desc: 'ทุกสิ่งที่คุณต้องการในการบริหารร้านค้าให้อยู่หมัด รวบรวมไว้ในระบบเดียว ใช้งานง่าย ไม่ซับซ้อน',
        grid1_title: 'ทำงานบนคลาวด์ 100%',
        grid1_desc: 'ไม่ต้องติดตั้งโปรแกรม ข้อมูลไม่หายแม้อุปกรณ์พัง เข้าถึงร้านค้าได้จากทุกที่ทุกเวลา',
        grid2_title: 'ความปลอดภัยสูงสุด',
        grid2_desc: 'ปกป้องข้อมูลยอดขายและข้อมูลลูกค้าของคุณด้วยมาตรฐานความปลอดภัยระดับสากล',
        grid3_title: 'อัปเดตข้อมูลแบบเรียลไทม์',
        grid3_desc: 'สต๊อกสินค้าและยอดขายซิงค์ตรงกันทุกอุปกรณ์ทันที ไม่ต้องรอกดรีเฟรช',
        grid4_title: 'ระบบจัดการสิทธิ์พนักงาน',
        grid4_desc: 'กำหนดสิทธิ์การเข้าถึงเมนูต่างๆ ของพนักงานแต่ละคนได้อย่างอิสระและปลอดภัย'
        
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
    { name: 'hero_img', maxCount: 1 }
]), async (req, res) => {
    try {
        // รับค่าจาก Form ให้เพิ่ม theme_color เข้ามาด้วย
        // รับค่าจาก Form
        // รับค่าจาก Form
        const { 
            theme_color,
            hero_badge, hero_title, hero_desc,
            feature_title, feature_subtitle,
            col1_title, col1_desc, col2_title, col2_desc, col3_title, col3_desc,
            footer_text, facebook_url, line_url,
            // เพิ่มตัวแปร Grid Feature ตรงนี้
            grid_badge, grid_title, grid_desc,
            grid1_title, grid1_desc, grid2_title, grid2_desc,
            grid3_title, grid3_desc, grid4_title, grid4_desc
        } = req.body;
        
        const updates = { 
            theme_color,
            hero_badge, hero_title, hero_desc,
            feature_title, feature_subtitle,
            col1_title, col1_desc, col2_title, col2_desc, col3_title, col3_desc,
            footer_text, facebook_url, line_url,
            // เพิ่มตัวแปร Grid Feature ตรงนี้
            grid_badge, grid_title, grid_desc,
            grid1_title, grid1_desc, grid2_title, grid2_desc,
            grid3_title, grid3_desc, grid4_title, grid4_desc
        };

        // ถ้ามีไฟล์แนบมา ให้อัปโหลดขึ้น R2 แล้วอัปเดต URL (เหมือนเดิม)
        if (req.files['favicon']) updates.favicon_url = await uploadToR2(req.files['favicon'][0]);
        if (req.files['logo']) updates.logo_url = await uploadToR2(req.files['logo'][0]);
        if (req.files['hero_img']) updates.hero_img_url = await uploadToR2(req.files['hero_img'][0]);

        // บันทึกลงฐานข้อมูล (เหมือนเดิม)
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