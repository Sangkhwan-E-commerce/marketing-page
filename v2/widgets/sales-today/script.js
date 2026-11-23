// วาดกราฟรายชั่วโมง + แถบสัดส่วนช่องทางชำระ ด้วย LP.drawChart กลาง (Chart.js — public/js/v2.js)
LP.widget('sales-today', function (card, ctx) {
    var boxes = card.querySelectorAll('[data-chart]');
    for (var i = 0; i < boxes.length; i++) LP.drawChart(boxes[i], ctx, card);
});
