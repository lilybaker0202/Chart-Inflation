document.addEventListener('DOMContentLoaded', () => {
    const tickerButtons = document.querySelectorAll('.ticker-btn');
    let cryptoChart;

    // 颜色池
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f',
        '#e67e22', '#1abc9c', '#34495e', '#d35400', '#7f8c8d'
    ];

    // 初始化图表
    const ctx = document.getElementById('cryptoChart').getContext('2d');
    cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Date' },
                    ticks: { font: { size: 12 } }
                },
                y: {
                    title: { display: true, text: 'Price (USD)' },
                    ticks: { font: { size: 12 } }
                }
            },
            elements: {
                line: {
                    spanGaps: true
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: { size: 14 }
                    }
                }
            }
        }
    });

    // 更新图表函数
    function updateChart() {
        const selectedTickers = Array.from(tickerButtons)
            .filter(btn => btn.classList.contains('active'))
            .map(btn => btn.dataset.ticker);
        if (selectedTickers.length === 0) {
            cryptoChart.data.labels = [];
            cryptoChart.data.datasets = [];
            cryptoChart.update();
            document.getElementById('chart-title').textContent = 'Crypto Price Trends (Select at least one)';
            return;
        }

        // 并行获取所有选中的数据
        Promise.all(selectedTickers.map(ticker =>
            fetch(`/crypto_data/${ticker}`).then(response => response.json())
        ))
            .then(results => {
                const allDates = new Set();
                results.forEach(data => {
                    data.forEach(d => allDates.add(d.date));
                });
                const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
                const labels = sortedDates.map(date => new Date(date).toLocaleDateString());

                const datasets = results.map((data, index) => {
                    const ticker = selectedTickers[index];
                    const priceMap = new Map(data.map(d => [d.date, d.close]));
                    const prices = sortedDates.map(date => {
                        const price = priceMap.get(date);
                        return price !== undefined ? price : null;
                    });
                    return {
                        label: `${ticker} Close Price (USD)`,
                        data: prices,
                        borderColor: colors[index % colors.length],
                        fill: false,
                        tension: 0.1,
                        spanGaps: true
                    };
                });

                cryptoChart.data.labels = labels;
                cryptoChart.data.datasets = datasets;
                cryptoChart.update();
                document.getElementById('chart-title').textContent = `Crypto Price Trends (${selectedTickers.join(', ')})`;
            })
            .catch(error => console.error('Error fetching crypto data:', error));
    }

    // 按钮点击事件
    tickerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            updateChart();
        });
    });

    // 初始加载第一个ticker
    tickerButtons[0].classList.add('active');
    updateChart();
});