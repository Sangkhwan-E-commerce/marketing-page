// ไฮไลต์ทีละขั้น 1 → 2 → 3 → 4 วนไป (ภาพเคลื่อนไหวในแต่ละขั้นอยู่ใน style.css ใต้ .is-playing .is-active)
//    ผู้ชมตั้งลดการเคลื่อนไหว / ปิดใน Admin = ภาพนิ่งครบทุกขั้น ไม่ไฮไลต์ · โครงเดียวกับ qr-ordering-flow
LP.widget('kiosk-flow', function (card, ctx) {
    var root = card.querySelector('.w-ksk');
    if (!root || root.getAttribute('data-animate') !== '1' || ctx.reducedMotion) return;
    var steps = root.querySelectorAll('.w-ksk-step');
    if (!steps.length) return;
    var current = -1;

    function next() {
        if (document.hidden) return;
        if (current >= 0) steps[current].classList.remove('is-active');
        current = (current + 1) % steps.length;
        steps[current].classList.add('is-active');
    }

    root.classList.add('is-playing');
    next();
    var seconds = Math.min(10, Math.max(2, Number(root.getAttribute('data-interval')) || 3));
    setInterval(next, seconds * 1000);
});
