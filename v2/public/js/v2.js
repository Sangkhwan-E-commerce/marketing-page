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

    // ตัวเลขนับขึ้น: <span data-countup="53870" data-decimals="0"></span>
    function countUp(el, duration) {
        var target = Number(el.getAttribute('data-countup'));
        var decimals = Number(el.getAttribute('data-decimals') || 0);
        var opts = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
        if (!isFinite(target)) return;
        if (reducedMotion || !window.requestAnimationFrame) { el.textContent = format(target, opts); return; }
        var start = null;
        var ms = duration || 1100;
        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min(1, (ts - start) / ms);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = format(p < 1 ? target * eased : target, opts);
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
        // กันกรณีเบราว์เซอร์หยุดวาดเฟรม (แท็บพื้นหลัง/เครื่องช้า) — ตัวเลขต้องจบที่ค่าจริงเสมอ
        setTimeout(function () { el.textContent = format(target, opts); }, ms + 200);
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
