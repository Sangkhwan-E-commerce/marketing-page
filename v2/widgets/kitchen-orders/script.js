// จำลองจอครัว: ทุกไม่กี่วินาที ออเดอร์ "พร้อมเสิร์ฟ" ใบล่างสุดออกไป ใบอื่นขยับสถานะ และมีออเดอร์ใหม่เข้ามาบนสุด
LP.widget('kitchen-orders', function (card, ctx) {
    var root = card.querySelector('.w-kds');
    if (!root || root.getAttribute('data-animate') !== '1' || ctx.reducedMotion) return;
    var labels = JSON.parse(root.getAttribute('data-labels'));
    var list = root.querySelector('.w-kds-list');
    var waitingEl = root.querySelector('.w-kds-waiting');
    var NEXT = { 'new': 'cooking', cooking: 'ready' };
    var counter = 118;
    var template = list.firstElementChild ? list.firstElementChild.cloneNode(true) : null;
    if (!template) return;

    function setStatus(li, status) {
        li.className = 'w-kds-ticket is-' + status;
        li.querySelector('.w-kds-status').textContent = labels.status[status];
    }

    function tick() {
        if (document.hidden) return;
        var tickets = Array.prototype.slice.call(list.children);
        var leaving = tickets[tickets.length - 1];
        if (leaving && leaving.classList.contains('is-ready')) {
            leaving.classList.add('is-leaving');
            setTimeout(function () { if (leaving.parentNode) leaving.parentNode.removeChild(leaving); }, 400);
        }
        // ใบที่เหลือ: ใหม่ → กำลังทำ, กำลังทำ (เก่าสุด) → พร้อมเสิร์ฟ · เวลารอ +1 นาที
        tickets.forEach(function (li, i) {
            if (li === leaving) return;
            var time = li.querySelector('.w-kds-time');
            var m = parseInt(time.textContent.replace(/\D+/g, ''), 10) || 0;
            time.lastChild.textContent = ' ' + (m + 1) + ' ' + labels.minutes;
            if (li.classList.contains('is-new')) setStatus(li, NEXT['new']);
            else if (li.classList.contains('is-cooking') && i === tickets.length - 2) setStatus(li, NEXT.cooking);
        });
        counter += 1;
        var fresh = template.cloneNode(true);
        setStatus(fresh, 'new');
        fresh.querySelector('.w-kds-no').textContent = 'A-' + counter;
        fresh.querySelector('.w-kds-time').lastChild.textContent = ' 0 ' + labels.minutes;
        fresh.classList.add('is-entering');
        list.insertBefore(fresh, list.firstChild);
        // ใบแม่แบบเป็นออเดอร์แรกเสมอ — สลับรายการอาหารจากใบที่กำลังจะออก จะได้ไม่ซ้ำกันทุกรอบ
        if (leaving) fresh.querySelector('.w-kds-items').innerHTML = leaving.querySelector('.w-kds-items').innerHTML;
        void fresh.offsetWidth; // บังคับวาดสถานะเริ่มก่อน แล้วค่อยเลื่อนเข้า
        fresh.classList.remove('is-entering');
        var waiting = list.querySelectorAll('.is-new, .is-cooking').length;
        waitingEl.textContent = ctx.format(waiting);
    }

    setInterval(tick, 4000);
});
