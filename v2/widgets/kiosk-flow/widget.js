// 🌟 ขั้นตอน Self-service Kiosk 4 ขั้น (เจ้าของสั่ง 2026-11-23 ตามภาพตัวอย่าง "Order food → Pay via PromptPay QR → Kitchen order display → Order ready & pickup")
//    เล่าขั้นตอนจริงของระบบใน pos-free-app (บทความ /doc/restaurant/kiosk):
//    ลูกค้าสั่งเองที่ตู้ (เลือกเมนู + ตัวเลือก · เบอร์โทรสะสมแต้ม · โปร/ส่วนลดสมาชิกคิดเอง · นั่งที่ร้าน = ตู้แนะนำไปสแกน QR ที่โต๊ะ ตู้จึงขายแบบนำกลับบ้าน)
//    → จ่าย QR พร้อมเพย์ที่ตู้ (Stripe ของร้าน ปิดบิลเอง) หรือเงินสดที่เคาน์เตอร์ (คิวขึ้นเป็นแท็บที่ POS) → ได้เลขคิว
//    → ออเดอร์ขึ้นจอครัว /dp กดรับ-กดเสร็จ → จอเรียกคิว /kiosk-queue ขึ้น "พร้อมรับ" พร้อมเสียงเรียกคิว → ลูกค้ามารับ
//    ⚠️ แก้ข้อความ = ต้องยังตรงกับสิ่งที่ระบบทำได้จริง (ห้ามโฆษณาความสามารถที่ไม่มี)
//    ภาพประกอบวาดด้วย HTML/CSS + Bootstrap Icons ที่เก็บไว้เอง (ไม่ใช้รูป ไม่ใช้ CDN) · รายการอาหาร = mock-data.js KIOSK_ORDER
//    โครงเดียวกับ qr-ordering-flow (คลาส w-ksk- แทน w-qrf-)
const opt = (value, th, en) => ({ value, label: { th, en } });
const STEP_KEYS = ['order', 'pay', 'kitchen', 'pickup'];

const TEXT = {
    th: {
        name: 'สั่งเองที่ตู้ Kiosk ใน 4 ขั้นตอน',
        description: 'ลูกค้าเลือกเมนูเองที่ตู้ สแกนจ่ายพร้อมเพย์ ออเดอร์เข้าจอครัว แล้วจอเรียกคิวบอกเมื่อพร้อมรับ',
        step: 'ขั้นที่',
        steps: {
            order: { label: 'สั่งที่ตู้', title: 'ลูกค้าเลือกเมนูเองที่ตู้', desc: 'แตะเลือกเมนูและตัวเลือก ใส่เบอร์สะสมแต้ม โปรและส่วนลดสมาชิกคิดให้เอง' },
            pay: { label: 'จ่าย QR พร้อมเพย์', title: 'สแกนจ่าย ระบบปิดบิลเอง', desc: 'จ่ายด้วย QR พร้อมเพย์ที่ตู้ หรือเลือกจ่ายเงินสดที่เคาน์เตอร์ แล้วรับเลขคิว' },
            pay_qr_only: { label: 'จ่าย QR พร้อมเพย์', title: 'สแกนจ่าย ระบบปิดบิลเอง', desc: 'สแกนจ่ายด้วยแอปธนาคาร ได้เลขคิวทันที ไม่ต้องต่อคิวที่แคชเชียร์' },
            kitchen: { label: 'จอครัว (KDS)', title: 'ออเดอร์ขึ้นจอครัวทันที', desc: 'ครัวเห็นรายการพร้อมเลขคิว กดรับและกดเสร็จ ไม่ต้องจดใบสั่ง' },
            pickup: { label: 'พร้อมรับ', title: 'เรียกคิว แล้วมารับได้เลย', desc: 'จอเรียกคิวขึ้นเลขที่พร้อมรับพร้อมเสียงเรียก ลูกค้ามารับที่เคาน์เตอร์' }
        },
        scene: {
            menu: 'เมนู', checkout: 'ชำระเงิน', pay: 'ชำระ', promptpay: 'PromptPay', cash: 'หรือเงินสด',
            paid: 'ชำระแล้ว', queue: 'คิว', pending: 'รอครัวรับ', cooking: 'กำลังทำ', done: 'เสร็จ',
            now_serving: 'พร้อมรับ', baht: '฿'
        }
    },
    en: {
        name: 'Self-service kiosk in 4 steps',
        description: 'Customers order at the kiosk, pay by PromptPay QR, the order reaches the kitchen screen, and the queue screen calls them when it is ready',
        step: 'Step',
        steps: {
            order: { label: 'Order at the kiosk', title: 'Customers pick their own food', desc: 'Tap items and options, add a phone number for points — promotions and member discounts apply automatically' },
            pay: { label: 'Pay by PromptPay QR', title: 'Scan to pay, the bill closes itself', desc: 'Pay by PromptPay QR at the kiosk, or choose cash at the counter, then get a queue number' },
            pay_qr_only: { label: 'Pay by PromptPay QR', title: 'Scan to pay, the bill closes itself', desc: 'Pay with any banking app and get a queue number at once — no cashier line' },
            kitchen: { label: 'Kitchen display', title: 'The order hits the kitchen screen', desc: 'The kitchen sees the items and queue number — accept and mark done, no handwritten tickets' },
            pickup: { label: 'Ready for pickup', title: 'Number called, come and collect', desc: 'The queue screen shows ready numbers with a voice call — customers pick up at the counter' }
        },
        scene: {
            menu: 'Menu', checkout: 'Checkout', pay: 'Pay', promptpay: 'PromptPay', cash: 'or cash',
            paid: 'Paid', queue: 'Queue', pending: 'Waiting', cooking: 'Cooking', done: 'Done',
            now_serving: 'Ready', baht: '฿'
        }
    }
};

// ช่องแก้ข้อความแต่ละขั้น (แยกภาษา) — เว้นว่าง = ข้อความเดิม
const stepTextSettings = STEP_KEYS.flatMap((key, i) => [
    { key: `step${i + 1}_title`, type: 'text', localized: true, default: '', maxLength: 50,
        label: { th: `ขั้นที่ ${i + 1}: หัวข้อ`, en: `Step ${i + 1}: heading` },
        hint: { th: `เว้นว่าง = "${TEXT.th.steps[key].title}"`, en: `Empty = "${TEXT.en.steps[key].title}"` } },
    { key: `step${i + 1}_desc`, type: 'text', localized: true, default: '', maxLength: 110,
        label: { th: `ขั้นที่ ${i + 1}: คำอธิบาย`, en: `Step ${i + 1}: description` },
        hint: { th: `เว้นว่าง = "${TEXT.th.steps[key].desc}"${key === 'pay' ? ' (หรือแบบจ่าย QR อย่างเดียว)' : ''}`, en: `Empty = "${TEXT.en.steps[key].desc}"` } }
]);

module.exports = {
    id: 'kiosk-flow',
    category: 'restaurant',
    sizes: ['4x2', '2x2', '4x1', '1x2'],
    defaultSize: '4x2',
    dataSources: ['mock'],
    docPath: '/doc/restaurant/kiosk',
    tone: 'light',
    settings: [
        { key: 'animate', type: 'boolean', default: true, label: { th: 'ไฮไลต์ทีละขั้นวนไปเรื่อยๆ', en: 'Highlight each step in turn' } },
        { key: 'interval', type: 'number', default: 3, min: 2, max: 10, label: { th: 'เปลี่ยนขั้นทุกกี่วินาที', en: 'Seconds per step' } },
        { key: 'show_scenes', type: 'boolean', default: true, label: { th: 'แสดงภาพประกอบ (ตู้ Kiosk จอครัว จอเรียกคิว)', en: 'Show the illustrations (kiosk, kitchen screen, queue screen)' },
            hint: { th: 'การ์ด 4x1 และ 1x2 พื้นที่น้อย ไม่แสดงภาพประกอบ', en: '4x1 and 1x2 cards are too small for illustrations' } },
        { key: 'show_desc', type: 'boolean', default: true, label: { th: 'แสดงคำอธิบายใต้หัวข้อ', en: 'Show the description under each heading' } },
        { key: 'show_numbers', type: 'boolean', default: true, label: { th: 'แสดงเลขขั้น', en: 'Show step numbers' } },
        { key: 'palette', type: 'select', default: 'colorful', label: { th: 'สีของแต่ละขั้น', en: 'Step colours' },
            options: [opt('colorful', 'หลายสี (น้ำเงิน เขียวอมฟ้า ส้ม เขียว)', 'Colourful (blue, teal, orange, green)'), opt('accent', 'สีเดียว (สีเน้นของการ์ด)', 'One colour (card accent)')] },
        { key: 'payment', type: 'select', default: 'qr_cash', label: { th: 'วิธีจ่ายที่เล่าในขั้นที่ 2', en: 'Payment told in step 2' },
            options: [opt('qr_cash', 'QR พร้อมเพย์ หรือเงินสดที่เคาน์เตอร์', 'PromptPay QR or cash at the counter'), opt('qr', 'QR พร้อมเพย์อย่างเดียว', 'PromptPay QR only')] },
        { key: 'show_voice', type: 'boolean', default: true, label: { th: 'แสดงไอคอนเสียงเรียกคิวในขั้นที่ 4', en: 'Show the voice-call icon in step 4' } },
        { key: 'queue_no', type: 'number', default: 119, min: 1, max: 9999, label: { th: 'เลขคิวในภาพประกอบ', en: 'Queue number in the illustrations' } },
        ...stepTextSettings
    ],
    text: TEXT,
    getData({ mock, locale, settings: s, size }) {
        const t = TEXT[locale] || TEXT.th;
        const pick = obj => obj[locale] || obj.th;
        const queue = Math.round(Number(s.queue_no) || mock.KIOSK_ORDER.queue);
        const items = mock.KIOSK_ORDER.items.map(i => ({ name: pick(i), qty: i.qty, icon: i.icon, total: i.qty * i.price }));
        const cash = s.payment !== 'qr';
        const steps = STEP_KEYS.map((key, i) => {
            const base = key === 'pay' && !cash ? t.steps.pay_qr_only : t.steps[key];
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
            queue,
            items,
            count: items.reduce((sum, i) => sum + i.qty, 0),
            total: items.reduce((sum, i) => sum + i.total, 0),
            cash,
            voice: s.show_voice,
            // การ์ดเล็ก (4x1 = สูงแถวเดียว · 1x2 = แคบ) ไม่มีที่ให้ภาพประกอบ
            scenes: s.show_scenes && (size === '4x2' || size === '2x2'),
            animate: s.animate,
            interval: s.interval,
            scene: t.scene,
            stepWord: t.step
        };
    }
};
