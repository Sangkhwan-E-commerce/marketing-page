// 🌟 การจัดหน้า — รายการ Widget ที่แสดง เรียงตามลำดับ
//    ตอนนี้ใช้ DEFAULT_LAYOUT ในโค้ด · ขั้นต่อไปหน้า Admin "Marketing web" ใน pos-free-app จะเขียนลงตาราง lp_*
//    แล้วเว็บนี้อ่านอย่างเดียว (ส่ง loadPublished เข้า createLayoutSource) — ถ้าอ่านไม่ได้จะกลับมาใช้ค่าในโค้ด
const { resolveSettings } = require('./registry');

const DEFAULT_LAYOUT = [
    { widget: 'sales-today', size: '2x2', mobile: true },
    { widget: 'kitchen-orders', size: '1x2', mobile: true },
    { widget: 'stock-expiry', size: '1x1', mobile: true }
];

// ตัดรายการที่ใช้ไม่ได้ทิ้งเงียบๆ: Widget ที่ไม่มีในโค้ดแล้ว ขนาดที่ Widget ไม่รองรับ ข้อมูลจริงที่ Widget ยังไม่มี
function normalizeLayout(entries, widgets) {
    if (!Array.isArray(entries)) return [];
    const out = [];
    for (const entry of entries) {
        const widget = entry && widgets.get(entry.widget);
        if (!widget) continue;
        if (entry.enabled === false) continue;
        const size = widget.sizes.includes(entry.size) ? entry.size : widget.defaultSize;
        const source = widget.dataSources.includes(entry.source) ? entry.source : widget.dataSources[0];
        out.push({
            key: `${widget.id}-${out.length + 1}`,
            widget,
            size,
            source,
            mobile: entry.mobile !== false,
            settings: resolveSettings(widget, entry.settings || {})
        });
    }
    return out;
}

function createLayoutSource({ widgets, loadPublished = null, logger = console } = {}) {
    return async function getLayout() {
        if (loadPublished) {
            try {
                const published = await loadPublished();
                const layout = normalizeLayout(published, widgets);
                if (layout.length) return layout;
            } catch (err) {
                logger.error('[v2] load layout failed, using default layout:', err.message);
            }
        }
        return normalizeLayout(DEFAULT_LAYOUT, widgets);
    };
}

module.exports = { DEFAULT_LAYOUT, normalizeLayout, createLayoutSource };
