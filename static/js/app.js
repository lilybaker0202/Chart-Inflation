document.addEventListener('DOMContentLoaded', () => {
    // 通用颜色池，保留艺术样式
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f',
        '#e67e22', '#1abc9c', '#34495e', '#d35400', '#7f8c8d'
    ];

    // 初始化图表，确保元素存在
    let cryptoChart = initializeChart('cryptoChart', 'Crypto Price Trends');
    let economicChart = initializeChart('economicChart', 'Economic Indicator Trends');
    let inflationChart = initializeChart('inflationChart', 'Inflation Trends');

    // 初始化图表函数
    function initializeChart(chartId, defaultTitle) {
        const ctxElement = document.getElementById(chartId);
        if (!ctxElement) {
            console.error(`Chart element with ID ${chartId} not found!`);
            return null;
        }
        const ctx = ctxElement.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Date' }, ticks: { font: { size: 12 } } },
                    y: { title: { display: true, text: 'Value' }, ticks: { font: { size: 12 } } }
                },
                elements: { line: { spanGaps: true, tension: 0.1 } },
                plugins: { legend: { labels: { font: { size: 14 } } } }
            }
        });
        const chartTitleElement = document.getElementById('chart-title');
        if (chartTitleElement) {
            chartTitleElement.textContent = defaultTitle;
        }
        return chart;
    }

    // 更新图表函数（通用，适配不同数据格式）
    function updateChart(chart, chartTitleElement, selectedItems, dataFetcher, labelMapper, valueKey = 'value') {
        if (!chart || !chartTitleElement) {
            console.error('Chart or chart title element not initialized!');
            return;
        }

        if (selectedItems.length === 0 || selectedItems.includes('show_all')) {
            chart.data.labels = [];
            chart.data.datasets = [];
            chart.update();
            chartTitleElement.textContent = `${chartTitleElement.id.replace('chart-title', '')} (Select an item or Show All)`;
            return;
        }

        Promise.all(selectedItems.filter(item => item !== 'show_all').map(item => dataFetcher(item)))
            .then(results => {
                console.log('Fetched data:', results); // 调试：打印数据
                const allDates = new Set();
                results.forEach(data => {
                    if (data && data.labels) { // Economic Index格式
                        data.labels.forEach(d => allDates.add(d));
                    } else if (data && data.length) { // Crypto Mode格式
                        data.forEach(d => allDates.add(d.date));
                    }
                });
                const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
                const labels = sortedDates.map(date => new Date(date).toLocaleDateString());

                const datasets = results.map((data, index) => {
                    const item = selectedItems.filter(item => item !== 'show_all')[index];
                    let values;
                    if (data.labels) { // Economic Index格式
                        const valueMap = new Map(data.labels.map((label, i) => [label, data.data[i]]));
                        values = sortedDates.map(date => valueMap.get(date) || null);
                    } else { // Crypto Mode格式
                        const valueMap = new Map(data.map(d => [d.date, d[valueKey] || d.close]));
                        values = sortedDates.map(date => valueMap.get(date) || null);
                    }
                    return {
                        label: labelMapper(item),
                        data: values,
                        borderColor: colors[index % colors.length],
                        fill: false,
                        tension: 0.1,
                        spanGaps: true
                    };
                });

                chart.data.labels = labels;
                chart.data.datasets = datasets;
                chart.update();
                chartTitleElement.textContent = `${chartTitleElement.id.replace('chart-title', '')} (${selectedItems.filter(item => item !== 'show_all').join(', ')})`;
            })
            .catch(error => console.error(`Error fetching ${chartTitleElement.id} data:`, error));
    }

    // Crypto Mode
    if (document.querySelector('#crypto_mode')) {
        const cryptoButtons = document.querySelectorAll('#crypto_mode .ticker-btn');
        cryptoButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const selectedTickers = Array.from(cryptoButtons)
                    .filter(btn => btn.classList.contains('active'))
                    .map(btn => btn.dataset.ticker);
                updateChart(cryptoChart, document.getElementById('chart-title'), selectedTickers, ticker => fetch(`/crypto_data/${ticker}`).then(res => res.json()), ticker => `${ticker} Close Price (USD)`, 'close');
            });
        });
        cryptoButtons[0].classList.add('active');
        updateChart(cryptoChart, document.getElementById('chart-title'), ['ADA'], ticker => fetch(`/crypto_data/${ticker}`).then(res => res.json()), ticker => `${ticker} Close Price (USD)`, 'close');
    }

    // Economic Index
    if (document.querySelector('#economic_index')) {
        const economicButtons = document.querySelectorAll('#economic_index .ticker-btn');
        economicButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const selectedIndicators = Array.from(economicButtons)
                    .filter(btn => btn.classList.contains('active'))
                    .map(btn => btn.dataset.ticker);
                updateChart(economicChart, document.getElementById('chart-title'), selectedIndicators, indicator => fetch(`/economic_data`).then(res => res.json()).then(data => data[indicator]), indicator => {
                    const labels = { gdp_growth: 'GDP Growth Rate (%)', inflation_rate: 'Inflation Rate (CPI) (%)', unemployment_rate: 'Unemployment Rate (%)', sp500_index: 'S&P 500 Index', federal_funds_rate: 'Federal Funds Rate (%)', trade_balance: 'Trade Balance (Billions of USD)' };
                    return labels[indicator] || indicator;
                }, 'data');
            });
        });
        economicButtons[0].classList.add('active');
        updateChart(economicChart, document.getElementById('chart-title'), ['gdp_growth'], indicator => fetch(`/economic_data`).then(res => res.json()).then(data => data[indicator]), indicator => {
            const labels = { gdp_growth: 'GDP Growth Rate (%)', inflation_rate: 'Inflation Rate (CPI) (%)', unemployment_rate: 'Unemployment Rate (%)', sp500_index: 'S&P 500 Index', federal_funds_rate: 'Federal Funds Rate (%)', trade_balance: 'Trade Balance (Billions of USD)' };
            return labels[indicator] || indicator;
        }, 'data');
    }

    // Chart Inflation
    if (document.querySelector('#chart_inflation')) {
        const inflationButtons = document.querySelectorAll('#chart_inflation .ticker-btn');
        let currentInflationChartData = null;

        inflationButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const selectedCharts = Array.from(inflationButtons)
                    .filter(btn => btn.classList.contains('active'))
                    .map(btn => btn.dataset.ticker);
                if (selectedCharts.length === 0 || selectedCharts.includes('show_all')) {
                    inflationChart.data.labels = [];
                    inflationChart.data.datasets = [];
                    document.getElementById('chart-title').textContent = 'Inflation Trends (Select a chart or Show All)';
                    inflationChart.update();
                    return;
                }
                if (currentInflationChartData) {
                    renderInflationChart(selectedCharts);
                } else {
                    document.getElementById('chart-title').textContent = 'Inflation Trends (Please calculate first)';
                }
            });
        });

        function renderInflationChart(selectedCharts) {
            if (!currentInflationChartData) {
                console.error('No inflation data available to render charts');
                return;
            }
            const years = Object.keys(currentInflationChartData.start_values).map(Number);
            const dataMap = {
                percentage_change: { labels: years, data: Object.values(currentInflationChartData.start_percentages), label: 'Start Currency Percentage Change (%)', borderColor: colors[0] },
                value_comparison: { labels: [years[0], years[years.length - 1]], data: [currentInflationChartData.start_values[years[0]], currentInflationChartData.start_values[years[years.length - 1]]], label: 'Start Currency Value', borderColor: colors[1] },
                exchange_rate: { labels: years, data: Object.values(currentInflationChartData.exchange_rate_history), label: 'Exchange Rate', borderColor: colors[2] },
                cumulative_inflation: { labels: years, data: Object.values(currentInflationChartData.cumulative_inflation_start), label: 'Cumulative Inflation Start (%)', borderColor: colors[3] },
                value_change: { labels: years, data: Object.values(currentInflationChartData.value_change_start), label: 'Value Change Start', borderColor: colors[4] },
                yearly_inflation: { labels: years, data: Object.values(currentInflationChartData.yearly_inflation_start), label: 'Yearly Inflation Start (%)', borderColor: colors[5] }
            };

            const datasets = selectedCharts.filter(chart => chart !== 'show_all').map((chart, index) => ({
                label: dataMap[chart].label,
                data: dataMap[chart].data,
                borderColor: dataMap[chart].borderColor,
                fill: false,
                tension: 0.1,
                spanGaps: true
            }));

            inflationChart.data.labels = dataMap[selectedCharts[0]].labels;
            inflationChart.data.datasets = datasets;
            inflationChart.update();
            document.getElementById('chart-title').textContent = `Inflation Trends (${selectedCharts.filter(chart => chart !== 'show_all').join(', ')})`;
        }

        // Chart Inflation原有功能
        window.calculate = function() {
            const mode = document.getElementById('mode').value;
            const startCurrency = document.getElementById('start_currency').value;
            const targetCurrency = document.getElementById('target_currency').value;
            const startYear = document.getElementById('start_year').value;
            const amount = document.getElementById('amount').value;
            const targetYear = document.getElementById('target_year').value;

            if (!startYear || !amount || !targetYear) {
                document.getElementById('start_result').innerText = 'Please fill in all fields';
                document.getElementById('target_result').innerText = '';
                inflationChart.data.labels = [];
                inflationChart.data.datasets = [];
                inflationChart.update();
                document.getElementById('share_section').style.display = 'none';
                return;
            }

            // 调整为正确的URL，并使用POST方法，与script.js一致
            fetch('/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `mode=${mode}&start_currency=${startCurrency}&target_currency=${targetCurrency}&start_year=${startYear}&amount=${amount}&target_year=${targetYear}`
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}, Status Text: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        document.getElementById('start_result').textContent = data.error;
                        document.getElementById('target_result').textContent = '';
                        inflationChart.data.labels = [];
                        inflationChart.data.datasets = [];
                        inflationChart.update();
                        document.getElementById('share_section').style.display = 'none';
                    } else {
                        document.getElementById('start_result').textContent = `Start Value: ${data.start_result}`;
                        document.getElementById('target_result').textContent = `Target Value: ${data.target_result}`;
                        currentInflationChartData = data;
                        const selectedCharts = Array.from(inflationButtons)
                            .filter(btn => btn.classList.contains('active'))
                            .map(btn => btn.dataset.ticker);
                        if (selectedCharts.length > 0 && !selectedCharts.includes('show_all')) {
                            renderInflationChart(selectedCharts);
                        } else {
                            renderInflationChart(['percentage_change']);
                        }
                        document.getElementById('share_section').style.display = 'block';
                        document.getElementById('share_url').value = `https://xxx.com/share/${data.comparison_id}`;
                    }
                })
                .catch(error => {
                    console.error('Error calculating inflation:', error);
                    document.getElementById('start_result').textContent = `Error: ${error.message}`;
                    document.getElementById('target_result').textContent = '';
                    inflationChart.data.labels = [];
                    inflationChart.data.datasets = [];
                    inflationChart.update();
                    document.getElementById('share_section').style.display = 'none';
                });
        };

        window.reset = function() {
            document.getElementById('start_result').textContent = '';
            document.getElementById('target_result').textContent = '';
            document.getElementById('comparison_section').style.display = 'none';
            document.getElementById('share_section').style.display = 'none';
            inflationChart.data.labels = [];
            inflationChart.data.datasets = [];
            inflationChart.update();
            document.getElementById('chart-title').textContent = 'Inflation Trends (Please calculate)';
            currentInflationChartData = null;
            inflationButtons.forEach(btn => btn.classList.remove('active'));
            inflationButtons[0].classList.add('active');
        };

        window.saveComparison = function() {
            const startResult = document.getElementById('start_result').textContent;
            const targetResult = document.getElementById('target_result').textContent;
            if (startResult && targetResult) {
                document.getElementById('comparison_start_result').textContent = startResult;
                document.getElementById('comparison_target_result').textContent = targetResult;
                document.getElementById('comparison_section').style.display = 'block';
            }
        };

        window.clearComparison = function() {
            document.getElementById('comparison_section').style.display = 'none';
        };

        window.switchEvent = function() {
            fetch('/next_event').then(res => res.json()).then(data => {
                document.getElementById('historical-event').textContent = data.event;
            });
        };

        window.shareOnFacebook = function() {
            const url = document.getElementById('share_url').value;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        };

        window.shareOnX = function() {
            const url = document.getElementById('share_url').value;
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
        };
    }
});