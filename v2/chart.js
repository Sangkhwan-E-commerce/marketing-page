// 🌟 กราฟของการ์ด — วาดด้วย Chart.js 4.5.1 ฝั่งเบราว์เซอร์ (เจ้าของตัดสินใหม่ 2026-11-23)
//    เดิมวาด SVG เองฝั่งเซิร์ฟเวอร์ แต่ยืดตามขนาดการ์ดจนจุดกลายเป็นวงรี และไม่ยืดหยุ่น → เปลี่ยนเป็น Chart.js
//    ยอมให้ Google ไม่เห็นกราฟ (อ่านเฉพาะเนื้อหา/ตัวเลข/ช่วงเวลาที่อยู่ในหน้าแล้ว)
//    ฝั่งเซิร์ฟเวอร์คิดตัวเลขทั้งหมด (ช่วงเวลา/รายวัน-เดือน-ปี/ยอดสะสม) แล้วส่ง "สเปก" ให้ widgets/bills-total/script.js วาด
//    ไฟล์ Chart.js: public/vendor/chartjs/4.5.1 (คัดลอกจาก pos-free-app vendor/ — ห้ามใช้ CDN) โหลดเฉพาะหน้าที่มีกราฟ
const CHART_TYPES = ['bar', 'line', 'area'];

// points = [{ label, value, tooltip }] · edge = กราฟเต็มขอบการ์ด (เส้น/พื้นที่ชนขอบซ้าย-ขวา ไม่มีระยะขอบ)
function buildChartSpec(points, type = 'bar', { ariaLabel = '', edge = false } = {}) {
    const list = Array.isArray(points) ? points : [];
    if (list.length < 2) return null;
    return {
        type: CHART_TYPES.includes(type) ? type : 'bar',
        labels: list.map(p => String(p.label)),
        values: list.map(p => Math.max(0, Number(p.value) || 0)),
        tooltips: list.map(p => String(p.tooltip || '')),
        edge: edge === true,
        ariaLabel: String(ariaLabel)
    };
}

module.exports = { CHART_TYPES, buildChartSpec };
