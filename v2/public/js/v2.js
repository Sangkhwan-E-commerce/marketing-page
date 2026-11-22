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

    window.LP = { widget: widget, start: start, format: format, countUp: countUp };
})();
