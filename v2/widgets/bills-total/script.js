// วาดกราฟของการ์ดสถิติ (bills-total · sales-total · stores-total ใช้สคริปต์นี้ร่วมกัน) ผ่าน LP.drawChart กลาง (public/js/v2.js)
(function () {
    'use strict';
    function draw(card, ctx) {
        LP.drawChart(card.querySelector('.w-bills-plot[data-chart]'), ctx, card);
    }
    ['bills-total', 'sales-total', 'stores-total'].forEach(function (id) { LP.widget(id, draw); });
})();
