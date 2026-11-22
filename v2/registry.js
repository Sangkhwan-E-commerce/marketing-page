// 🌟 ทะเบียน Widget — อ่านทุกโฟลเดอร์ใน v2/widgets/ เอง เพิ่ม Widget ใหม่ = เพิ่มโฟลเดอร์ ไม่ต้องแก้แผงหลัก
//    โฟลเดอร์หนึ่งตัว: widget.js (ข้อมูลประจำตัว + getData) · view.ejs (หน้าตา) · style.css / script.js (ถ้ามี)
const fs = require('node:fs');
const path = require('node:path');

// ขนาดมาตรฐาน "กว้าง x สูง" นับเป็นช่องของตาราง 4 คอลัมน์ (จอคอม)
const SIZES = ['1x1', '2x1', '1x2', '2x2', '3x1', '4x1']; // 3x1 เพิ่ม 2026-11-22 (เจ้าของ: เผื่อการ์ดกว้างในอนาคต)
const DATA_SOURCES = ['mock', 'live'];
const SETTING_TYPES = ['text', 'select', 'boolean', 'number', 'color', 'date'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

// ช่องตั้งค่าที่ทุกการ์ดมี (กรอบกลางจัดการให้ Widget ไม่ต้องทำเอง) — ต่อท้ายช่องของ Widget เสมอ (group: 'common')
//    เจ้าของสั่ง 2026-11-22: ตั้งค่าได้ละเอียดทุกการ์ด แต่ทุกช่องมีค่าเริ่มต้น · ค่าว่าง = ค่าเริ่มต้น
//    localized: true = เก็บแยกภาษา `${key}_th` / `${key}_en` (หน้า Admin กรอกภาษาที่เลือกอยู่)
//    ⚠️ ไม่มีช่องซ่อนป้าย "ตัวอย่าง"/"ข้อมูลจริง" โดยตั้งใจ — ป้ายบอกคนดูว่าตัวเลขจริงหรือไม่ ต้องแสดงเสมอ
const COMMON_SETTINGS = [
    { key: 'title', type: 'text', localized: true, default: '', maxLength: 60,
        label: { th: 'ชื่อการ์ด', en: 'Card title' },
        hint: { th: 'เว้นว่าง = ใช้ชื่อเดิมของการ์ด', en: 'Empty = the card’s own title' } },
    { key: 'show_title', type: 'boolean', default: true, label: { th: 'แสดงชื่อการ์ด', en: 'Show the title' } },
    { key: 'show_doc_link', type: 'boolean', default: true, label: { th: 'แสดงปุ่มลิงก์ไปคู่มือ', en: 'Show the manual link button' } },
    { key: 'bg_color', type: 'color', default: '',
        label: { th: 'สีพื้นการ์ด (โค้ดสี)', en: 'Card background (colour code)' },
        hint: { th: 'เว้นว่าง = ใช้สีพื้นสำเร็จรูปของการ์ด · ใส่แล้วสีตัวอักษรเลือกขาว/เข้มให้อัตโนมัติ', en: 'Empty = the card preset colour · text colour is chosen automatically' } },
    { key: 'text_color', type: 'color', default: '',
        label: { th: 'สีตัวอักษร (โค้ดสี)', en: 'Text colour (colour code)' },
        hint: { th: 'เว้นว่าง = อัตโนมัติตามสีพื้น', en: 'Empty = automatic for the background' } },
    { key: 'accent_color', type: 'color', default: '',
        label: { th: 'สีเน้น (โค้ดสี)', en: 'Accent colour (colour code)' },
        hint: { th: 'สีของตัวเลข/แท่งกราฟ/สถานะเด่นในการ์ด · เว้นว่าง = สีเดิมของการ์ด', en: 'Colour of the highlighted number, bar or status · empty = the card’s own' } }
].map(s => ({ ...s, group: 'common' }));
const LOCALES = ['th', 'en'];
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const WIDGETS_DIR = path.join(__dirname, 'widgets');

function fail(id, message) {
    throw new Error(`Widget "${id}": ${message}`);
}

// ตรวจข้อมูลประจำตัวให้ครบตั้งแต่เปิดเว็บ — Widget ที่เขียนผิดต้องพังตอน deploy ไม่ใช่ตอนลูกค้าเปิดหน้า
function validateManifest(manifest, folderName) {
    const id = manifest && manifest.id;
    if (id !== folderName) fail(folderName, `id must equal the folder name (got "${id}")`);
    if (!ID_PATTERN.test(id)) fail(id, 'id must be kebab-case a-z 0-9');
    if (!Array.isArray(manifest.sizes) || !manifest.sizes.length) fail(id, 'sizes must be a non-empty array');
    manifest.sizes.forEach(size => { if (!SIZES.includes(size)) fail(id, `unknown size "${size}"`); });
    if (!manifest.sizes.includes(manifest.defaultSize)) fail(id, 'defaultSize must be one of sizes');
    if (!Array.isArray(manifest.dataSources) || !manifest.dataSources.length) fail(id, 'dataSources must be a non-empty array');
    manifest.dataSources.forEach(src => { if (!DATA_SOURCES.includes(src)) fail(id, `unknown data source "${src}"`); });
    if (typeof manifest.getData !== 'function') fail(id, 'getData must be a function');
    LOCALES.forEach(locale => {
        const text = manifest.text && manifest.text[locale];
        if (!text || typeof text.name !== 'string' || !text.name) fail(id, `text.${locale}.name is required`);
    });
    (manifest.settings || []).forEach(setting => {
        if (!setting || !setting.key) fail(id, 'every setting needs a key');
        if (!SETTING_TYPES.includes(setting.type)) fail(id, `setting "${setting.key}" has unknown type "${setting.type}"`);
        if (setting.type === 'select' && (!Array.isArray(setting.options) || !setting.options.length)) {
            fail(id, `select setting "${setting.key}" needs options`);
        }
    });
}

function loadWidgets(dir = WIDGETS_DIR) {
    const widgets = new Map();
    if (!fs.existsSync(dir)) return widgets;
    const folders = fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
        .map(entry => entry.name)
        .sort();
    for (const folder of folders) {
        const widgetDir = path.join(dir, folder);
        const manifest = require(path.join(widgetDir, 'widget.js'));
        validateManifest(manifest, folder);
        const viewPath = path.join(widgetDir, 'view.ejs');
        if (!fs.existsSync(viewPath)) fail(folder, 'view.ejs is missing');
        const stylePath = path.join(widgetDir, 'style.css');
        const scriptPath = path.join(widgetDir, 'script.js');
        widgets.set(manifest.id, {
            ...manifest,
            settings: [...(manifest.settings || []).filter(st => !COMMON_SETTINGS.some(c => c.key === st.key)), ...COMMON_SETTINGS],
            dir: widgetDir,
            viewPath,
            stylePath: fs.existsSync(stylePath) ? stylePath : null,
            scriptPath: fs.existsSync(scriptPath) ? scriptPath : null
        });
    }
    return widgets;
}

// ค่าตั้งต้นของช่องตั้งค่า + ตัดค่าที่ไม่รู้จัก/ผิดชนิดทิ้ง (ค่าจากหลังบ้านเชื่อไม่ได้ 100%)
function resolveSettings(widget, raw = {}) {
    const out = {};
    for (const setting of widget.settings) {
        if (setting.localized) {
            for (const l of LOCALES) {
                const v = raw[`${setting.key}_${l}`];
                out[`${setting.key}_${l}`] = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, setting.maxLength || 200) : setting.default;
            }
            continue;
        }
        const value = raw[setting.key];
        let next = setting.default;
        if (setting.type === 'boolean' && typeof value === 'boolean') next = value;
        if (setting.type === 'number' && Number.isFinite(Number(value)) && value !== '' && value !== null) {
            next = Number(value);
            if (Number.isFinite(setting.min)) next = Math.max(setting.min, next);
            if (Number.isFinite(setting.max)) next = Math.min(setting.max, next);
        }
        if (setting.type === 'select' && setting.options.some(o => o.value === value)) next = value;
        if (setting.type === 'text' && typeof value === 'string') next = value.slice(0, setting.maxLength || 200);
        if (setting.type === 'color' && typeof value === 'string' && HEX_RE.test(value.trim())) next = value.trim().toLowerCase();
        if (setting.type === 'date' && typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value))) next = value;
        out[setting.key] = next;
    }
    return out;
}

// ข้อมูลสาธารณะของ Widget สำหรับหน้า Admin ใน pos-free-app (ไม่มีฟังก์ชัน ไม่มี path ในเครื่อง)
function describeWidgets(widgets) {
    return [...widgets.values()].map(w => ({
        id: w.id,
        category: w.category || 'general',
        sizes: w.sizes,
        defaultSize: w.defaultSize,
        dataSources: w.dataSources,
        docPath: w.docPath || null,
        name: { th: w.text.th.name, en: w.text.en.name },
        description: { th: w.text.th.description || '', en: w.text.en.description || '' },
        settings: w.settings.map(s => ({
            key: s.key,
            type: s.type,
            default: s.default,
            label: s.label || { th: s.key, en: s.key },
            group: s.group || 'widget',
            ...(s.localized ? { localized: true } : {}),
            ...(s.showIf ? { showIf: s.showIf } : {}), // แสดงช่องนี้เฉพาะเมื่อช่อง showIf.key = showIf.value (หน้า Admin)
            ...(s.maxLength ? { maxLength: s.maxLength } : {}),
            ...(s.hint ? { hint: s.hint } : {}),
            ...(s.options ? { options: s.options } : {}),
            ...(Number.isFinite(s.min) ? { min: s.min } : {}),
            ...(Number.isFinite(s.max) ? { max: s.max } : {})
        }))
    }));
}

module.exports = { COMMON_SETTINGS, HEX_RE, SIZES, DATA_SOURCES, LOCALES, loadWidgets, validateManifest, resolveSettings, describeWidgets };
