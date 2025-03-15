let percentageChart, barChart, exchangeRateChart, cumulativeInflationChart, valueChangeChart, yearlyInflationChart;
let lastData = null;
let comparisonData = null;

function calculate() {
    const mode = document.getElementById('mode').value;
    const start_currency = document.getElementById('start_currency').value;
    const target_currency = document.getElementById('target_currency').value;
    const start_year = document.getElementById('start_year').value;
    const amount = document.getElementById('amount').value;
    const target_year = document.getElementById('target_year').value;

    // 输入验证
    if (!start_year || !amount || !target_year) {
        document.getElementById('start_result').innerText = 'Please fill in all fields';
        document.getElementById('target_result').innerText = '';
        clearCharts();
        document.getElementById('share_section').style.display = 'none';
        return;
    }

    fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `mode=${mode}&start_currency=${start_currency}&target_currency=${target_currency}&start_year=${start_year}&amount=${amount}&target_year=${target_year}`
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                document.getElementById('start_result').innerText = data.error;
                document.getElementById('target_result').innerText = '';
                clearCharts();
                document.getElementById('share_section').style.display = 'none';
            } else {
                document.getElementById('start_result').innerText = data.start_result;
                document.getElementById('target_result').innerText = data.target_result;
                lastData = data;
                updateCharts(data); // 直接更新图表，无动画
                document.getElementById('share_url').value = `https://xxx.com/share/${data.comparison_id}`;
                document.getElementById('share_section').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error during calculation:', error);
            document.getElementById('start_result').innerText = `Error: ${error.message}`;
            document.getElementById('target_result').innerText = '';
            clearCharts();
            document.getElementById('share_section').style.display = 'none';
        });
}

function reset() {
    document.getElementById('mode').value = '1';
    document.getElementById('start_currency').value = 'USD';
    document.getElementById('target_currency').value = 'USD';
    document.getElementById('start_year').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('target_year').value = '';
    document.getElementById('start_result').innerText = '';
    document.getElementById('target_result').innerText = '';
    document.getElementById('comparison_section').style.display = 'none';
    document.getElementById('comparison_start_result').innerText = '';
    document.getElementById('comparison_target_result').innerText = '';
    clearCharts();
    document.getElementById('share_section').style.display = 'none';
    lastData = null;
    comparisonData = null;
}

function switchEvent() {
    fetch('/switch_event')
        .then(response => response.json())
        .then(data => {
            if (data && data.event) {
                document.getElementById('historical-event').innerText = data.event;
            } else {
                document.getElementById('historical-event').innerText = 'Error: Invalid event data.';
            }
        })
        .catch(error => {
            console.error('Error fetching historical event:', error);
            document.getElementById('historical-event').innerText = 'Failed to load historical event.';
        });
}

function saveComparison() {
    const startResult = document.getElementById('start_result').innerText;
    const targetResult = document.getElementById('target_result').innerText;
    if (startResult && targetResult && !startResult.includes('Error') && lastData) {
        comparisonData = { ...lastData };
        document.getElementById('comparison_start_result').innerText = startResult;
        document.getElementById('comparison_target_result').innerText = targetResult;
        document.getElementById('comparison_section').style.display = 'block';
        updateCharts(lastData);
    }
}

function clearComparison() {
    fetch('/clear_comparison', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('comparison_section').style.display = 'none';
                document.getElementById('comparison_start_result').innerText = '';
                document.getElementById('comparison_target_result').innerText = '';
                comparisonData = null;
                if (lastData) {
                    updateCharts(lastData);
                } else {
                    clearCharts();
                }
            }
        })
        .catch(error => {
            console.error('Error clearing comparison:', error);
        });
}

function updateCharts(data) {
    if (!data || !data.start_values || !data.target_values) {
        console.error('Invalid data for charts:', data);
        return;
    }

    const years = Object.keys(data.start_values).map(Number);

    // Yearly Percentage Change Chart
    updateChart('percentage', {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Current Start Currency', data: Object.values(data.start_percentages), borderColor: 'red', fill: false },
                { label: 'Current Target Currency', data: Object.values(data.target_percentages), borderColor: 'blue', fill: false },
                ...(comparisonData && comparisonData.start_percentages ? [{ label: 'Comparison Start Currency', data: Object.values(comparisonData.start_percentages), borderColor: 'green', fill: false }] : []),
                ...(comparisonData && comparisonData.target_percentages ? [{ label: 'Comparison Target Currency', data: Object.values(comparisonData.target_percentages), borderColor: 'purple', fill: false }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Yearly Percentage Change (%)' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } }
        }
    });

    // Purchasing Power Comparison Chart
    updateChart('bar', {
        type: 'bar',
        data: {
            labels: [years[0], years[years.length - 1]],
            datasets: [
                { label: `Current ${data.target_currency} Value`, data: [data.target_values[years[0]], data.target_values[years[years.length - 1]]], backgroundColor: 'blue' },
                ...(comparisonData && comparisonData.target_values ? [{ label: `Comparison ${comparisonData.target_currency} Value`, data: [comparisonData.target_values[years[0]], comparisonData.target_values[years[years.length - 1]]], backgroundColor: 'orange' }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Purchasing Power Comparison' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: data.target_currency } } }
        }
    });

    // Exchange Rate Chart
    updateChart('exchangeRate', {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Current Exchange Rate', data: Object.values(data.exchange_rate_history), borderColor: 'purple', fill: false },
                ...(comparisonData && comparisonData.exchange_rate_history ? [{ label: 'Comparison Exchange Rate', data: Object.values(comparisonData.exchange_rate_history), borderColor: 'brown', fill: false }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Exchange Rate Over Time' } },
            scales: { y: { beginAtZero: false, title: { display: true, text: `${data.start_currency}/${data.target_currency}` } } }
        }
    });

    // Cumulative Inflation Chart
    updateChart('cumulativeInflation', {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Current Start Currency', data: Object.values(data.cumulative_inflation_start), borderColor: 'green', fill: false },
                { label: 'Current Target Currency', data: Object.values(data.cumulative_inflation_target), borderColor: 'orange', fill: false },
                ...(comparisonData && comparisonData.cumulative_inflation_start ? [{ label: 'Comparison Start Currency', data: Object.values(comparisonData.cumulative_inflation_start), borderColor: 'teal', fill: false }] : []),
                ...(comparisonData && comparisonData.cumulative_inflation_target ? [{ label: 'Comparison Target Currency', data: Object.values(comparisonData.cumulative_inflation_target), borderColor: 'pink', fill: false }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Cumulative Inflation Rate (%)' } },
            scales: { y: { title: { display: true, text: '%' } } }
        }
    });

    // Value Change Chart
    updateChart('valueChange', {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                { label: 'Current Start Currency', data: Object.values(data.value_change_start), borderColor: 'red', fill: false },
                { label: 'Current Target Currency', data: Object.values(data.value_change_target), borderColor: 'blue', fill: false },
                ...(comparisonData && comparisonData.value_change_start ? [{ label: 'Comparison Start Currency', data: Object.values(comparisonData.value_change_start), borderColor: 'green', fill: false }] : []),
                ...(comparisonData && comparisonData.value_change_target ? [{ label: 'Comparison Target Currency', data: Object.values(comparisonData.value_change_target), borderColor: 'purple', fill: false }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Currency Value Over Time' } },
            scales: { y: { title: { display: true, text: 'Value' } } }
        }
    });

    // Yearly Inflation Chart
    updateChart('yearlyInflation', {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Current Start Currency', data: Object.values(data.yearly_inflation_start), backgroundColor: 'green' },
                { label: 'Current Target Currency', data: Object.values(data.yearly_inflation_target), backgroundColor: 'orange' },
                ...(comparisonData && comparisonData.yearly_inflation_start ? [{ label: 'Comparison Start Currency', data: Object.values(comparisonData.yearly_inflation_start), backgroundColor: 'teal' }] : []),
                ...(comparisonData && comparisonData.yearly_inflation_target ? [{ label: 'Comparison Target Currency', data: Object.values(comparisonData.yearly_inflation_target), backgroundColor: 'pink' }] : [])
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Yearly Inflation Rate (%)' } },
            scales: { y: { title: { display: true, text: '%' } } }
        }
    });
}

function updateChart(chartType, config) {
    const chartVar = `${chartType}Chart`;
    const chartCanvas = document.getElementById(`${chartType}Chart`).getContext('2d');

    // 销毁旧图表
    if (window[chartVar] && typeof window[chartVar].destroy === 'function') {
        window[chartVar].destroy();
    }

    // 创建新图表
    window[chartVar] = new Chart(chartCanvas, config);
}

function clearCharts() {
    const charts = [
        { name: 'percentageChart', instance: percentageChart },
        { name: 'barChart', instance: barChart },
        { name: 'exchangeRateChart', instance: exchangeRateChart },
        { name: 'cumulativeInflationChart', instance: cumulativeInflationChart },
        { name: 'valueChangeChart', instance: valueChangeChart },
        { name: 'yearlyInflationChart', instance: yearlyInflationChart }
    ];

    charts.forEach(chart => {
        if (chart.instance && typeof chart.instance.destroy === 'function') {
            chart.instance.destroy();
        }
        window[chart.name] = null;
    });

    percentageChart = barChart = exchangeRateChart = cumulativeInflationChart = valueChangeChart = yearlyInflationChart = null;
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
}

function shareOnFacebook() {
    const url = document.getElementById('share_url').value;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareOnX() {
    const url = document.getElementById('share_url').value;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=Check out this inflation calculation!`, '_blank');
}