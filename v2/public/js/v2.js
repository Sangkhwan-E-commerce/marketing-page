// 🌟 ตัวเรียกสคริปต์ของ Widget — Widget ลงทะเบียนด้วย LP.widget('id', function (el, ctx) { ... })
//    สคริปต์ของการ์ดจะเริ่มเมื่อการ์ดเลื่อนเข้ามาในจอครั้งแรกเท่านั้น หน้าเว็บจะได้ไม่หนัก
//    ctx.reducedMotion = ผู้ชมตั้งเครื่องให้ลดการเคลื่อนไหว → ห้ามทำภาพเคลื่อนไหว แสดงค่าสุดท้ายเลย
(function () {
    'use strict';
    var inits = {};
    var locale = 'th';
    var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function widget(id, init) { inits[id] = init; }

    function format(value, opts) {
        try { return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'th-TH', opts || {}).format(value); }
        catch (e) { return String(value); }
    }

    // รูปแบบตัวเลขสถิติ (ย่อ 8.95k / มากกว่า 8.9k+) — สูตรเดียวกับ v2/format.js ฝั่งเซิร์ฟเวอร์ · ปัดลงเสมอ
    var UNITS = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
    function floorTo(n, d) { var f = Math.pow(10, d); return Math.floor(n * f + 1e-9) / f; }
    function formatStat(value, style) {
        var n = Math.max(0, Math.floor(Number(value) || 0));
        if (style === 'full' || n < 1000) return format(n);
        var unit = UNITS[0];
        for (var i = 0; i < UNITS.length; i++) { if (n >= UNITS[i][0]) { unit = UNITS[i]; break; } }
        var d = style === 'plus' ? 1 : 2;
        var v = floorTo(n / unit[0], d);
        var short = String(v).replace(/\.0+$/, '');
        return short + unit[1] + (style === 'plus' && v * unit[0] !== n ? '+' : '');
    }

    // ตัวเลขนับขึ้น: <span data-countup="53870" data-decimals="0"></span> · data-format="compact|full|plus" = ตัวเลขสถิติ
    function countUp(el, duration) {
        var target = Number(el.getAttribute('data-countup'));
        var decimals = Number(el.getAttribute('data-decimals') || 0);
        var opts = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
        var statStyle = el.getAttribute('data-format');
        var show = function (v) { return statStyle ? formatStat(v, statStyle) : format(v, opts); };
        if (!isFinite(target)) return;
        // ตัวเลขสถิติ: ข้อความที่เซิร์ฟเวอร์วาดมาคือค่าสุดท้าย — จบด้วยข้อความนั้นเสมอ (ตรงกับ v2/format.js เป๊ะ)
        var finalText = statStyle ? el.textContent : show(target);
        if (reducedMotion || !window.requestAnimationFrame) { el.textContent = finalText; return; }
        var start = null;
        var ms = duration || 1100;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / ms);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = p < 1 ? show(target * eased) : finalText;
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
        // กันกรณีเบราว์เซอร์หยุดวาดเฟรม (แท็บพื้นหลัง/เครื่องช้า) — ตัวเลขต้องจบที่ค่าจริงเสมอ
        setTimeout(function () { el.textContent = finalText; }, ms + 200);
    }

    function boot(card) {
        if (card.getAttribute('data-booted')) return;
        card.setAttribute('data-booted', '1');
        var nodes = card.querySelectorAll('[data-countup]');
        for (var i = 0; i < nodes.length; i++) countUp(nodes[i]);
        var init = inits[card.getAttribute('data-widget')];
        if (!init) return;
        try {
            init(card, { locale: locale, reducedMotion: reducedMotion, format: format, countUp: countUp, size: card.getAttribute('data-size') });
        } catch (err) {
            if (window.console) console.error('[v2] widget script failed:', card.getAttribute('data-widget'), err);
        }
    }

    function start(opts) {
        locale = (opts && opts.locale) || 'th';
        var cards = document.querySelectorAll('.lp-card[data-widget]');
        if (!('IntersectionObserver' in window)) {
            for (var i = 0; i < cards.length; i++) boot(cards[i]);
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                boot(entry.target);
            });
        }, { threshold: 0.25 });
        for (var j = 0; j < cards.length; j++) io.observe(cards[j]);
    }

    // ---------- กราฟกลางของทุกการ์ด (Chart.js 4.5.1 — เจ้าของ 2026-11-23: ใช้ Chart.js ทั้งหน้า) ----------
    //    การ์ดใส่ <div data-chart="สเปก"><canvas></canvas></div> (สเปกจาก v2/chart.js) แล้วเรียก LP.drawChart(กล่อง, ctx)
    //    สี = สีตัวอักษรของกล่อง (CSS ของการ์ดตั้งเป็นสีเน้น) · ไม่คำนวณตัวเลขที่นี่ — เซิร์ฟเวอร์คิดมาให้แล้ว
    function withAlpha(color, a) {
        var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(color || '');
        return m ? 'rgba(' + m[1] + ', ' + m[2] + ', ' + m[3] + ', ' + a + ')' : color;
    }
    // ป้ายเหนือแท่งที่เน้น (เช่น "ขายดีสุด")
    var highlightLabelPlugin = {
        id: 'lpHighlightLabel',
        afterDatasetsDraw: function (chart, args, opts) {
            if (!opts || !opts.text || opts.index == null) return;
            var meta = chart.getDatasetMeta(0);
            var bar = meta && meta.data[opts.index];
            if (!bar) return;
            var c = chart.ctx;
            c.save();
            c.font = '700 11px ' + opts.font;
            var w = c.measureText(opts.text).width + 14;
            var x = bar.x - w / 2;
            var y = bar.y - 24;
            c.fillStyle = opts.bg;
            if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, 18, 9); c.fill(); } else { c.fillRect(x, y, w, 18); }
            c.fillStyle = opts.ink;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(opts.text, bar.x, y + 9);
            c.restore();
        }
    };

    function drawChart(box, ctx, card) {
        if (!box || !window.Chart || box.getAttribute('data-drawn')) return null;
        var spec;
        try { spec = JSON.parse(box.getAttribute('data-chart')); } catch (e) { return null; }
        var canvas = box.querySelector('canvas');
        if (!spec || !canvas) return null;
        box.setAttribute('data-drawn', '1');
        var color = window.getComputedStyle(box).color;
        var font = window.getComputedStyle(document.body).fontFamily;
        var animation = ctx && ctx.reducedMotion ? false : { duration: 800, easing: 'easeOutCubic' };
        var tooltip = {
            displayColors: spec.type === 'share',
            titleFont: { family: font },
            bodyFont: { family: font, weight: '700' },
            callbacks: {
                title: function (items) { return items.length && spec.type !== 'share' ? spec.labels[items[0].dataIndex] : ''; },
                label: function (item) { return spec.tooltips[spec.type === 'share' ? item.datasetIndex : item.dataIndex] || ''; }
            }
        };

        // สัดส่วน (เช่น ช่องทางชำระ): แถบแนวนอนแท่งเดียวแบ่งเป็นช่วง · สีของแต่ละช่วงอ่านจากจุดสีใน legend ของการ์ด
        if (spec.type === 'share') {
            var datasets = spec.values.map(function (v, i) {
                var dot = card && spec.colorFrom && spec.colorFrom[i] ? card.querySelector(spec.colorFrom[i]) : null;
                var c = dot ? window.getComputedStyle(dot).backgroundColor : withAlpha(color, 1 - i * 0.25);
                return { data: [v], backgroundColor: c, borderWidth: 0, borderRadius: 6, borderSkipped: false, barPercentage: 1, categoryPercentage: 1 };
            });
            return new window.Chart(canvas, {
                type: 'bar',
                data: { labels: [''], datasets: datasets },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: animation,
                    plugins: { legend: { display: false }, tooltip: tooltip },
                    scales: { x: { display: false, stacked: true, max: spec.values.reduce(function (a, b) { return a + b; }, 0) || 1 }, y: { display: false, stacked: true } }
                }
            });
        }

        var isBar = spec.type === 'bar';
        var hi = typeof spec.highlight === 'number' ? spec.highlight : -1;
        var barColors = isBar && hi >= 0 ? spec.values.map(function (v, i) { return i === hi ? color : withAlpha(color, 0.28); }) : null;
        var tickColor = withAlpha(window.getComputedStyle(card || box).color, 0.6);
        return new window.Chart(canvas, {
            type: isBar ? 'bar' : 'line',
            data: {
                labels: spec.labels,
                datasets: [{
                    data: spec.values,
                    borderColor: color,
                    backgroundColor: barColors || (isBar ? withAlpha(color, 0.85) : withAlpha(color, 0.22)),
                    hoverBackgroundColor: isBar ? (barColors ? barColors.map(function (c, i) { return i === hi ? color : withAlpha(color, 0.45); }) : color) : undefined,
                    fill: spec.type === 'area' ? 'origin' : false,
                    borderWidth: isBar ? 0 : 2,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHitRadius: 14,
                    pointBackgroundColor: color,
                    borderRadius: 6,
                    maxBarThickness: 48,
                    categoryPercentage: 0.8,
                    barPercentage: 0.9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: animation,
                layout: { padding: spec.edge ? 0 : { top: spec.highlightLabel ? 26 : 4 } },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: tooltip,
                    lpHighlightLabel: hi >= 0 && spec.highlightLabel
                        ? { index: hi, text: spec.highlightLabel, font: font, bg: color, ink: window.getComputedStyle(card || box).backgroundColor || '#fff' }
                        : null
                },
                scales: {
                    // กราฟเต็มขอบ: เส้น/พื้นที่ชนขอบซ้าย-ขวาพอดี · แท่งยังเว้นครึ่งช่องที่ขอบ
                    x: {
                        display: spec.xLabels === true, offset: isBar || !spec.edge,
                        grid: { display: false }, border: { display: false },
                        ticks: { color: tickColor, font: { family: font, size: 11 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 6 }
                    },
                    y: { display: false, beginAtZero: true, grace: '8%' }
                }
            },
            plugins: [highlightLabelPlugin]
        });
    }

    window.LP = { widget: widget, start: start, format: format, countUp: countUp, drawChart: drawChart };
})();
