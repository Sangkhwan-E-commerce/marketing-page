// 🌟 ชุดตัวเลขรายวัน → ช่วงเวลา + ยอดรวม + จุดของกราฟ (การ์ดสถิติ)
//    daily = [{ d: 'YYYY-MM-DD', n }] ตามเวลาไทย (pos-free-app ส่งมา หรือชุดตัวอย่างใน mock-data.js)
//    ช่วง: all (ตั้งแต่วันแรกที่มีข้อมูล) · this_year · last_year · custom (from–to รวมทั้งสองวัน)
//    จุดของกราฟ: ช่วง ≤ 62 วัน = รายวัน · ≤ 1,100 วัน (~3 ปี) = รายเดือน · ยาวกว่านั้น = รายปี · ช่วงที่ไม่มีบิลเติม 0 ให้กราฟต่อเนื่อง
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS = ['all', 'this_year', 'last_year', 'custom'];

function todayIn(timeZone = 'Asia/Bangkok', now = new Date()) {
    // en-CA = YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const toUtc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const fromUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86400000);
const isDate = (d) => typeof d === 'string' && DATE_RE.test(d) && fromUtc(toUtc(d)) === d;

function periodRange(period, { from, to } = {}, today, firstDay) {
    const year = Number(today.slice(0, 4));
    const start = firstDay && firstDay < today ? firstDay : today;
    switch (period) {
        case 'this_year': return { from: `${year}-01-01`, to: today };
        case 'last_year': return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
        case 'custom': {
            let a = isDate(from) ? from : start;
            let b = isDate(to) ? to : today;
            if (a > b) [a, b] = [b, a];
            return { from: a, to: b };
        }
        default: return { from: start, to: today };
    }
}

function bucketOf(span) {
    if (span <= 62) return 'day';
    if (span <= 1100) return 'month'; // ~3 ปี = ไม่เกิน ~36 แท่ง
    return 'year';
}
const keyOf = (d, bucket) => (bucket === 'day' ? d : bucket === 'month' ? d.slice(0, 7) : d.slice(0, 4));

function nextKey(key, bucket) {
    if (bucket === 'day') return fromUtc(toUtc(key) + 86400000);
    if (bucket === 'month') {
        const y = Number(key.slice(0, 4));
        const m = Number(key.slice(5, 7));
        return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return String(Number(key) + 1);
}

// → { from, to, total, bucket, points: [{ key, value }] }
function summarize(daily, period, range = {}, today = todayIn()) {
    const rows = Array.isArray(daily) ? daily.filter(r => r && isDate(r.d) && Number.isFinite(r.n)) : [];
    const firstDay = rows.length ? rows.reduce((m, r) => (r.d < m ? r.d : m), rows[0].d) : null;
    const { from, to } = periodRange(PERIODS.includes(period) ? period : 'all', range, today, firstDay);
    const bucket = bucketOf(daysBetween(from, to) + 1);
    const sums = new Map();
    let total = 0;
    for (const r of rows) {
        if (r.d < from || r.d > to) continue;
        total += r.n;
        const k = keyOf(r.d, bucket);
        sums.set(k, (sums.get(k) || 0) + r.n);
    }
    const points = [];
    const last = keyOf(to, bucket);
    for (let k = keyOf(from, bucket), guard = 0; guard < 400; k = nextKey(k, bucket), guard++) {
        points.push({ key: k, value: sums.get(k) || 0 });
        if (k === last) break;
    }
    return { from, to, total, bucket, points };
}

module.exports = { PERIODS, DATE_RE, isDate, todayIn, periodRange, summarize };
