// 🌟 รูปแบบตัวเลขของการ์ดสถิติ — ⚠️ ปัด "ลง" เสมอ ห้ามปัดขึ้น (ตัวเลขบนหน้าเว็บต้องไม่เกินของจริง)
//    full: 8,950 · compact: 8.95k / 1.23M · plus: 8.9k+ / 1.2M+ (ต่ำกว่า 1,000 แสดงเลขเต็ม)
//    ⚠️ public/js/v2.js มีสูตรเดียวกันสำหรับตัวเลขนับขึ้นฝั่งเบราว์เซอร์ — แก้ที่นี่ต้องแก้ที่นั่นด้วย
const FORMATS = ['compact', 'full', 'plus'];
const UNITS = [{ v: 1e9, s: 'B' }, { v: 1e6, s: 'M' }, { v: 1e3, s: 'k' }];

function floorTo(n, decimals) {
    const f = 10 ** decimals;
    return Math.floor(n * f + 1e-9) / f;
}

function formatStat(value, format = 'compact', locale = 'th') {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    const full = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'th-TH').format(n);
    if (format === 'full' || n < 1000) return full;
    const unit = UNITS.find(u => n >= u.v);
    const decimals = format === 'plus' ? 1 : 2;
    const short = String(floorTo(n / unit.v, decimals)).replace(/\.0+$/, '');
    const exact = floorTo(n / unit.v, decimals) * unit.v === n;
    return `${short}${unit.s}${format === 'plus' && !exact ? '+' : ''}`;
}

module.exports = { FORMATS, formatStat };
