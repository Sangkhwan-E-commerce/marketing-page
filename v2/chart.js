// 🌟 สเปกกราฟของการ์ด — วาดด้วย Chart.js 4.5.1 ฝั่งเบราว์เซอร์ที่ LP.drawChart (public/js/v2.js) จุดเดียว
//    เจ้าของตัดสิน 2026-11-23: ใช้ Chart.js ทั้งหน้า (SVG ที่วาดเองยืดตามการ์ดจนจุดเป็นวงรี ไม่ยืดหยุ่น)
//    ยอมให้ Google ไม่เห็นกราฟ — อ่านเฉพาะเนื้อหา/ตัวเลข/ช่วงเวลาที่อยู่ในหน้าแล้ว
//    ฝั่งเซิร์ฟเวอร์คิดตัวเลขทั้งหมด แล้วส่งสเปกนี้ใน data-chart="…" · การ์ดใหม่ที่มีกราฟ = สร้างสเปกด้วยฟังก์ชันในไฟล์นี้
//    ไฟล์ Chart.js: public/vendor/chartjs/4.5.1 (คัดลอกจาก pos-free-app vendor/ — ห้ามใช้ CDN) โหลดเฉพาะหน้าที่มีกราฟ
const CHART_TYPES = ['bar', 'line', 'area'];

// points = [{ label, value, tooltip }]
//    edge = กราฟเต็มขอบการ์ด · highlight = ลำดับแท่งที่เน้น (สีเต็ม แท่งอื่นจาง) · highlightLabel = ป้ายเหนือแท่งที่เน้น
//    xLabels = แสดงป้ายแกนนอนใต้กราฟ (ปกติไม่แสดง — การ์ดสถิติใช้ป้ายวันที่ HTML ของตัวเอง)
function buildChartSpec(points, type = 'bar', { ariaLabel = '', edge = false, highlight = null, highlightLabel = '', xLabels = false } = {}) {
    const list = Array.isArray(points) ? points : [];
    if (list.length < 2) return null;
    const spec = {
        type: CHART_TYPES.includes(type) ? type : 'bar',
        labels: list.map(p => String(p.label)),
        values: list.map(p => Math.max(0, Number(p.value) || 0)),
        tooltips: list.map(p => String(p.tooltip || '')),
        edge: edge === true,
        ariaLabel: String(ariaLabel)
    };
    if (Number.isInteger(highlight) && highlight >= 0 && highlight < list.length) {
        spec.highlight = highlight;
        if (highlightLabel) spec.highlightLabel = String(highlightLabel);
    }
    if (xLabels === true) spec.xLabels = true;
    return spec;
}

// สัดส่วน (แถบแนวนอนแท่งเดียวแบ่งเป็นช่วง) · segments = [{ value, tooltip, colorFrom }]
//    colorFrom = CSS selector ของจุดสีใน legend ของการ์ด (สีช่วงนั้นตามจุดสี — แก้สีที่ CSS ที่เดียว)
function buildShareSpec(segments, { ariaLabel = '' } = {}) {
    const list = Array.isArray(segments) ? segments.filter(s => s && Number(s.value) > 0) : [];
    if (!list.length) return null;
    return {
        type: 'share',
        labels: list.map(s => String(s.label || '')),
        values: list.map(s => Number(s.value)),
        tooltips: list.map(s => String(s.tooltip || '')),
        colorFrom: list.map(s => String(s.colorFrom || '')),
        ariaLabel: String(ariaLabel)
    };
}

module.exports = { CHART_TYPES, buildChartSpec, buildShareSpec };
