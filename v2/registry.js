// 🌟 ทะเบียน Widget — อ่านทุกโฟลเดอร์ใน v2/widgets/ เอง เพิ่ม Widget ใหม่ = เพิ่มโฟลเดอร์ ไม่ต้องแก้แผงหลัก
//    โฟลเดอร์หนึ่งตัว: widget.js (ข้อมูลประจำตัว + getData) · view.ejs (หน้าตา) · style.css / script.js (ถ้ามี)
const fs = require('node:fs');
const path = require('node:path');

// ขนาดมาตรฐาน "กว้าง x สูง" นับเป็นช่องของตาราง 4 คอลัมน์ (จอคอม)
const SIZES = ['1x1', '2x1', '1x2', '2x2', '4x1'];
const DATA_SOURCES = ['mock', 'live'];
const SETTING_TYPES = ['text', 'select', 'boolean', 'number'];
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
            settings: manifest.settings || [],
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
            ...(s.options ? { options: s.options } : {}),
            ...(Number.isFinite(s.min) ? { min: s.min } : {}),
            ...(Number.isFinite(s.max) ? { max: s.max } : {})
        }))
    }));
}

module.exports = { SIZES, DATA_SOURCES, LOCALES, loadWidgets, validateManifest, resolveSettings, describeWidgets };
