// วาดกราฟของการ์ดสถิติด้วย Chart.js (bills-total · sales-total · stores-total ใช้สคริปต์นี้ร่วมกัน)
//    สเปกมาจากเซิร์ฟเวอร์ (v2/chart.js buildChartSpec) ใน data-chart — ที่นี่แค่วาด ไม่คำนวณตัวเลขเอง
//    สี = สีของกล่อง .w-bills-chart (สีเน้นของการ์ด หรือสีตัวอักษร) · ลดการเคลื่อนไหว = ไม่มีภาพเคลื่อนไหว
(function () {
    'use strict';

    function withAlpha(color, a) {
        var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(color || '');
        return m ? 'rgba(' + m[1] + ', ' + m[2] + ', ' + m[3] + ', ' + a + ')' : color;
    }

    function draw(card, ctx) {
        var plot = card.querySelector('.w-bills-plot[data-chart]');
        if (!plot || !window.Chart) return;
        var spec;
        try { spec = JSON.parse(plot.getAttribute('data-chart')); } catch (e) { return; }
        if (!spec || !spec.values || spec.values.length < 2) return;
        var canvas = plot.querySelector('canvas');
        var color = window.getComputedStyle(plot.parentElement || plot).color;
        var isBar = spec.type === 'bar';
        var font = window.getComputedStyle(document.body).fontFamily;

        new window.Chart(canvas, {
            type: isBar ? 'bar' : 'line',
            data: {
                labels: spec.labels,
                datasets: [{
                    data: spec.values,
                    borderColor: color,
                    backgroundColor: isBar ? withAlpha(color, 0.85) : withAlpha(color, 0.22),
                    hoverBackgroundColor: isBar ? color : undefined,
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
                animation: ctx.reducedMotion ? false : { duration: 800, easing: 'easeOutCubic' },
                layout: { padding: spec.edge ? 0 : { top: 4 } },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        titleFont: { family: font },
                        bodyFont: { family: font, weight: '700' },
                        callbacks: {
                            title: function (items) { return items.length ? spec.labels[items[0].dataIndex] : ''; },
                            label: function (item) { return spec.tooltips[item.dataIndex] || ''; }
                        }
                    }
                },
                scales: {
                    // กราฟเต็มขอบ: เส้น/พื้นที่ชนขอบซ้าย-ขวาพอดี (offset false) · แท่งยังเว้นครึ่งช่องที่ขอบ
                    x: { display: false, offset: isBar || !spec.edge },
                    y: { display: false, beginAtZero: true, grace: '8%' }
                }
            }
        });
    }

    ['bills-total', 'sales-total', 'stores-total'].forEach(function (id) { LP.widget(id, draw); });
})();
