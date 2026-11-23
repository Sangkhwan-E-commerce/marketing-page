// 🌟 ขั้นตอน QR Ordering 4 ขั้น (เจ้าของสั่ง 2026-11-23 ตามภาพตัวอย่าง "QR ordering system: 4 easy steps")
//    เล่าขั้นตอนจริงของระบบใน pos-free-app: ลูกค้าสแกน QR ที่โต๊ะ (/order/:qr_token) → ออเดอร์เด้งที่ร้าน (ป๊อปอัปทุกหน้า + คิวออเดอร์ QR
//    กดยืนยัน หรือเปิด "ข้ามการกดยืนยันออเดอร์") → จอครัว /dp กดรับ-กดเสร็จ → เสิร์ฟ + จ่าย PromptPay ที่โต๊ะ หรือจ่ายที่ POS
//    ⚠️ แก้ข้อความ = ต้องยังตรงกับสิ่งที่ระบบทำได้จริง (ห้ามโฆษณาความสามารถที่ไม่มี)
//    ภาพประกอบวาดด้วย HTML/CSS + Bootstrap Icons ที่เก็บไว้เอง (ไม่ใช้รูป ไม่ใช้ CDN) · รายการอาหาร = mock-data.js QR_ORDER
const opt = (value, th, en) => ({ value, label: { th, en } });
const STEP_KEYS = ['scan', 'received', 'kitchen', 'serve'];

const TEXT = {
    th: {
        name: 'สั่งอาหารผ่าน QR ใน 4 ขั้นตอน',
        description: 'ลูกค้าสแกน QR ที่โต๊ะแล้วสั่งเอง ออเดอร์เด้งที่ร้าน เข้าจอครัว แล้วเสิร์ฟและจ่ายเงินได้ทันที',
        step: 'ขั้นที่',
        steps: {
            scan: { label: 'สแกนและสั่ง', title: 'ลูกค้าสแกน QR ที่โต๊ะ', desc: 'เมนูเปิดบนมือถือ เลือกและกดสั่งเองได้ทันที ไม่ต้องลงแอป' },
            received: { label: 'ร้านรับออเดอร์', title: 'ออเดอร์เด้งขึ้นที่ร้าน', desc: 'พนักงานเห็นแจ้งเตือนทุกหน้าจอ กดยืนยัน หรือตั้งให้ส่งเข้าครัวเอง' },
            kitchen: { label: 'จอครัว (KDS)', title: 'ครัวเห็นรายการทันที', desc: 'แยกจอตามแผนก ครัวกดรับและกดเสร็จ ไม่ต้องจดใบสั่ง' },
            serve: { label: 'เสิร์ฟและชำระ', title: 'เสิร์ฟถึงโต๊ะ จ่ายได้เลย', desc: 'ลูกค้าสแกนจ่าย PromptPay ที่โต๊ะ หรือจ่ายที่เคาน์เตอร์ก็ได้' },
            serve_only: { label: 'เสิร์ฟ', title: 'อาหารเสิร์ฟถึงโต๊ะ', desc: 'ครัวกดเสร็จ พนักงานรู้ทันทีว่าโต๊ะไหนพร้อมเสิร์ฟ' }
        },
        scene: {
            menu: 'เมนู', order: 'สั่งเลย', items: 'รายการ', new_order: 'ออเดอร์ใหม่', confirm: 'ยืนยัน',
            pending: 'รอครัวรับ', cooking: 'กำลังทำ', done: 'เสร็จ', paid: 'ชำระแล้ว', promptpay: 'PromptPay', served: 'เสิร์ฟแล้ว', baht: '฿'
        }
    },
    en: {
        name: 'QR ordering in 4 steps',
        description: 'Guests scan the table QR and order themselves; the order pops up in store, reaches the kitchen screen, then gets served and paid',
        step: 'Step',
        steps: {
            scan: { label: 'Scan & order', title: 'Guest scans the table QR', desc: 'The menu opens on their phone — pick and order, no app needed' },
            received: { label: 'Order received', title: 'The order pops up in store', desc: 'Staff get an alert on any screen — confirm it, or let it go to the kitchen automatically' },
            kitchen: { label: 'Kitchen display', title: 'The kitchen sees it instantly', desc: 'A screen per station — accept and mark done, no handwritten tickets' },
            serve: { label: 'Serve & pay', title: 'Served at the table, paid right away', desc: 'Guests pay by PromptPay at the table, or at the counter' },
            serve_only: { label: 'Food served', title: 'Served at the table', desc: 'When the kitchen marks it done, staff know which table is ready' }
        },
        scene: {
            menu: 'Menu', order: 'Order', items: 'items', new_order: 'New order', confirm: 'Confirm',
            pending: 'Waiting', cooking: 'Cooking', done: 'Done', paid: 'Paid', promptpay: 'PromptPay', served: 'Served', baht: '฿'
        }
    }
};

// ช่องแก้ข้อความแต่ละขั้น (แยกภาษา) — เว้นว่าง = ข้อความเดิม
const stepTextSettings = STEP_KEYS.flatMap((key, i) => [
    { key: `step${i + 1}_title`, type: 'text', localized: true, default: '', maxLength: 50,
        label: { th: `ขั้นที่ ${i + 1}: หัวข้อ`, en: `Step ${i + 1}: heading` },
        hint: { th: `เว้นว่าง = "${TEXT.th.steps[key].title}"${key === 'serve' ? ' (หรือแบบเสิร์ฟอย่างเดียว)' : ''}`, en: `Empty = "${TEXT.en.steps[key].title}"` } },
    { key: `step${i + 1}_desc`, type: 'text', localized: true, default: '', maxLength: 110,
        label: { th: `ขั้นที่ ${i + 1}: คำอธิบาย`, en: `Step ${i + 1}: description` },
        hint: { th: `เว้นว่าง = "${TEXT.th.steps[key].desc}"`, en: `Empty = "${TEXT.en.steps[key].desc}"` } }
]);

module.exports = {
    id: 'qr-ordering-flow',
    category: 'restaurant',
    sizes: ['4x2', '2x2', '4x1', '1x2'],
    defaultSize: '4x2',
    dataSources: ['mock'],
    docPath: '/doc/restaurant/qr-tables',
    tone: 'light',
    settings: [
        { key: 'animate', type: 'boolean', default: true, label: { th: 'ไฮไลต์ทีละขั้นวนไปเรื่อยๆ', en: 'Highlight each step in turn' } },
        { key: 'interval', type: 'number', default: 3, min: 2, max: 10, label: { th: 'เปลี่ยนขั้นทุกกี่วินาที', en: 'Seconds per step' } },
        { key: 'show_scenes', type: 'boolean', default: true, label: { th: 'แสดงภาพประกอบ (มือถือ จอร้าน จอครัว)', en: 'Show the illustrations (phone, store screen, kitchen screen)' },
            hint: { th: 'การ์ด 4x1 และ 1x2 พื้นที่น้อย ไม่แสดงภาพประกอบ', en: '4x1 and 1x2 cards are too small for illustrations' } },
        { key: 'show_desc', type: 'boolean', default: true, label: { th: 'แสดงคำอธิบายใต้หัวข้อ', en: 'Show the description under each heading' } },
        { key: 'show_numbers', type: 'boolean', default: true, label: { th: 'แสดงเลขขั้น', en: 'Show step numbers' } },
        { key: 'palette', type: 'select', default: 'colorful', label: { th: 'สีของแต่ละขั้น', en: 'Step colours' },
            options: [opt('colorful', 'หลายสี (น้ำเงิน เขียว ส้ม แดง)', 'Colourful (blue, green, orange, red)'), opt('accent', 'สีเดียว (สีเน้นของการ์ด)', 'One colour (card accent)')] },
        { key: 'last_step', type: 'select', default: 'serve_pay', label: { th: 'ขั้นสุดท้าย', en: 'Last step' },
            options: [opt('serve_pay', 'เสิร์ฟ + จ่ายเงิน (PromptPay ที่โต๊ะ/เคาน์เตอร์)', 'Serve + pay (PromptPay at the table / counter)'), opt('serve', 'เสิร์ฟอย่างเดียว', 'Serve only')] },
        { key: 'table_no', type: 'number', default: 4, min: 1, max: 999, label: { th: 'เลขโต๊ะในภาพประกอบ', en: 'Table number in the illustrations' } },
        ...stepTextSettings
    ],
    text: TEXT,
    getData({ mock, locale, settings: s, size }) {
        const t = TEXT[locale] || TEXT.th;
        const pick = obj => obj[locale] || obj.th;
        const tableNo = Math.round(Number(s.table_no) || 4);
        const items = mock.QR_ORDER.items.map(i => ({ name: pick(i), qty: i.qty, total: i.qty * i.price }));
        const steps = STEP_KEYS.map((key, i) => {
            const base = key === 'serve' && s.last_step === 'serve' ? t.steps.serve_only : t.steps[key];
            return {
                key,
                no: i + 1,
                label: base.label,
                title: s[`step${i + 1}_title_${locale}`] || base.title,
                desc: s[`step${i + 1}_desc_${locale}`] || base.desc
            };
        });
        return {
            steps,
            table: locale === 'en' ? `Table ${tableNo}` : `โต๊ะ ${tableNo}`,
            items,
            count: items.reduce((sum, i) => sum + i.qty, 0),
            total: items.reduce((sum, i) => sum + i.total, 0),
            pay: s.last_step !== 'serve',
            // การ์ดเล็ก (4x1 = สูงแถวเดียว · 1x2 = แคบ) ไม่มีที่ให้ภาพประกอบ
            scenes: s.show_scenes && (size === '4x2' || size === '2x2'),
            animate: s.animate,
            interval: s.interval,
            scene: t.scene,
            stepWord: t.step
        };
    }
};
