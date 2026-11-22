// 🌟 กราฟเล็กของการ์ด (SVG วาดเองฝั่งเซิร์ฟเวอร์ — ไม่ใช้ไลบรารี/CDN · Google และคนปิด JS ก็เห็นกราฟ)
//    types: bar · line · area · สีใช้ currentColor → CSS ของการ์ดกำหนดด้วย var(--w-accent, ...)
//    viewBox 100×40 ยืดเต็มกล่อง (preserveAspectRatio none) · เส้นไม่ยืดตาม (vector-effect non-scaling-stroke)
const CHART_TYPES = ['bar', 'line', 'area'];

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r2 = (n) => Math.round(n * 100) / 100;

// points = [{ label, value, title }] · label = ข้อความใต้กราฟ · title = ข้อความตอนชี้ (แสดงเป็น <title>)
function renderChart(points, type = 'bar', { ariaLabel = '' } = {}) {
    const W = 100;
    const H = 40;
    const list = Array.isArray(points) ? points : [];
    if (!list.length) return '';
    const max = Math.max(1, ...list.map(p => p.value));
    const step = W / list.length;
    const y = (v) => r2(H - (v / max) * (H - 2));
    let body;
    if (type === 'line' || type === 'area') {
        const xy = list.map((p, i) => [r2(step * i + step / 2), y(p.value)]);
        const line = xy.map(([px, py]) => `${px},${py}`).join(' ');
        const area = type === 'area'
            ? `<path class="w-chart-area" d="M${xy[0][0]},${H} L${line.replace(/ /g, ' L')} L${xy[xy.length - 1][0]},${H} Z" fill="currentColor" fill-opacity="0.22"/>`
            : '';
        const dots = list.length <= 31
            ? xy.map(([px, py], i) => `<circle class="w-chart-dot" cx="${px}" cy="${py}" r="0.9" fill="currentColor"><title>${esc(list[i].title || '')}</title></circle>`).join('')
            : '';
        body = `${area}<polyline class="w-chart-line" points="${line}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${dots}`;
    } else {
        const bw = r2(Math.max(0.6, step * 0.68));
        body = list.map((p, i) => {
            const top = y(p.value);
            const h = r2(Math.max(0.4, H - top));
            return `<rect class="w-chart-bar" x="${r2(step * i + (step - bw) / 2)}" y="${r2(H - h)}" width="${bw}" height="${h}" rx="0.8" fill="currentColor"><title>${esc(p.title || '')}</title></rect>`;
        }).join('');
    }
    return `<svg class="w-chart w-chart-${type}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(ariaLabel)}">${body}</svg>`;
}

module.exports = { CHART_TYPES, renderChart };
