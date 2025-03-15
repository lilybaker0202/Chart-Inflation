from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import random
import uuid
import json
import pandas as pd
import os

app = Flask(__name__)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# 通胀率数据（保持不变）
inflation_rates = {
    "USD": {1980: 13.5, 1981: 10.4, 1982: 6.2, 1983: 3.2, 1984: 4.4, 1985: 3.5, 1986: 1.9, 1987: 3.6, 1988: 4.1, 1989: 4.8, 1990: 5.4, 1991: 4.2, 1992: 3.0, 1993: 3.0, 1994: 2.6, 1995: 2.8, 1996: 2.9, 1997: 2.3, 1998: 1.5, 1999: 2.2, 2000: 3.4, 2001: 2.8, 2002: 1.6, 2003: 2.3, 2004: 2.7, 2005: 3.4, 2006: 3.2, 2007: 2.9, 2008: 3.8, 2009: -0.3, 2010: 1.6, 2011: 3.1, 2012: 2.1, 2013: 1.5, 2014: 1.6, 2015: 0.1, 2016: 1.3, 2017: 2.1, 2018: 2.4, 2019: 1.8, 2020: 1.3, 2021: 4.7, 2022: 8.0, 2023: 4.1, 2024: 2.8},
    "EUR": {1980: 5.4, 1981: 6.3, 1982: 5.3, 1983: 3.3, 1984: 2.4, 1985: 2.1, 1986: -0.1, 1987: 0.2, 1988: 1.3, 1989: 2.8, 1990: 2.7, 1991: 3.5, 1992: 5.0, 1993: 4.5, 1994: 2.7, 1995: 1.7, 1996: 1.3, 1997: 1.5, 1998: 0.6, 1999: 1.1, 2000: 2.1, 2001: 2.4, 2002: 2.3, 2003: 2.1, 2004: 2.0, 2005: 2.2, 2006: 2.2, 2007: 2.5, 2008: 3.3, 2009: 0.3, 2010: 1.6, 2011: 2.7, 2012: 2.5, 2013: 1.6, 2014: 0.4, 2015: 0.1, 2016: 0.2, 2017: 1.5, 2018: 1.8, 2019: 1.2, 2020: 0.3, 2021: 2.6, 2022: 8.4, 2023: 5.4, 2024: 2.0},
    "GBP": {1980: 16.8, 1981: 12.2, 1982: 8.5, 1983: 5.2, 1984: 4.4, 1985: 5.2, 1986: 3.6, 1987: 4.1, 1988: 4.6, 1989: 5.2, 1990: 7.0, 1991: 7.5, 1992: 4.2, 1993: 2.5, 1994: 2.0, 1995: 2.6, 1996: 2.4, 1997: 1.8, 1998: 1.6, 1999: 1.3, 2000: 0.8, 2001: 1.2, 2002: 1.3, 2003: 1.4, 2004: 1.3, 2005: 2.1, 2006: 2.3, 2007: 2.3, 2008: 3.6, 2009: 2.2, 2010: 3.3, 2011: 4.5, 2012: 2.8, 2013: 2.6, 2014: 1.5, 2015: 0.0, 2016: 0.7, 2017: 2.7, 2018: 2.5, 2019: 1.8, 2020: 0.9, 2021: 2.6, 2022: 9.1, 2023: 7.7, 2024: 3.7},
    "JPY": {1980: 8.0, 1981: 4.6, 1982: 2.7, 1983: 1.9, 1984: 2.2, 1985: 2.0, 1986: 0.6, 1987: 0.1, 1988: 0.7, 1989: 2.3, 1990: 3.1, 1991: 3.3, 1992: 1.6, 1993: 1.3, 1994: 0.7, 1995: -0.1, 1996: 0.1, 1997: 1.7, 1998: 0.7, 1999: -0.3, 2000: -0.7, 2001: -0.7, 2002: -0.9, 2003: -0.3, 2004: 0.0, 2005: -0.3, 2006: 0.2, 2007: 0.1, 2008: 1.4, 2009: -1.4, 2010: -0.7, 2011: -0.3, 2012: 0.0, 2013: 0.4, 2014: 2.7, 2015: 0.8, 2016: -0.1, 2017: 0.5, 2018: 1.0, 2019: 0.5, 2020: 0.1, 2021: -0.2, 2022: 2.5, 2023: 3.2, 2024: 2.0},
    "CNY": {1980: 2.0, 1981: 2.5, 1982: 2.0, 1983: 2.0, 1984: 2.7, 1985: 9.3, 1986: 6.5, 1987: 7.3, 1988: 18.8, 1989: 18.0, 1990: 3.1, 1991: 3.4, 1992: 6.4, 1993: 14.8, 1994: 24.3, 1995: 16.8, 1996: 8.3, 1997: 2.8, 1998: -0.8, 1999: -1.4, 2000: 0.4, 2001: 0.7, 2002: -0.7, 2003: 1.1, 2004: 3.8, 2005: 1.8, 2006: 1.6, 2007: 4.8, 2008: 5.9, 2009: -0.7, 2010: 3.2, 2011: 5.5, 2012: 2.6, 2013: 2.6, 2014: 2.1, 2015: 1.5, 2016: 2.1, 2017: 1.5, 2018: 1.9, 2019: 2.9, 2020: 2.5, 2021: 0.9, 2022: 1.9, 2023: 0.7, 2024: 1.7},
    "CAD": {1980: 10.2, 1981: 12.5, 1982: 10.8, 1983: 5.8, 1984: 4.3, 1985: 4.0, 1986: 4.2, 1987: 4.4, 1988: 4.0, 1989: 5.0, 1990: 4.8, 1991: 5.6, 1992: 1.5, 1993: 1.9, 1994: 0.2, 1995: 2.1, 1996: 1.6, 1997: 1.6, 1998: 1.0, 1999: 1.7, 2000: 2.7, 2001: 2.5, 2002: 2.3, 2003: 2.8, 2004: 1.9, 2005: 2.2, 2006: 2.0, 2007: 2.1, 2008: 2.4, 2009: 0.3, 2010: 1.8, 2011: 2.9, 2012: 1.5, 2013: 0.9, 2014: 1.9, 2015: 1.1, 2016: 1.4, 2017: 1.6, 2018: 2.3, 2019: 1.9, 2020: 0.7, 2021: 3.4, 2022: 6.8, 2023: 3.6, 2024: 2.4},
    "AUD": {1980: 10.1, 1981: 9.5, 1982: 11.4, 1983: 10.0, 1984: 4.0, 1985: 6.7, 1986: 9.1, 1987: 8.5, 1988: 7.3, 1989: 7.6, 1990: 7.2, 1991: 3.3, 1992: 1.0, 1993: 1.8, 1994: 1.9, 1995: 4.6, 1996: 2.7, 1997: 0.2, 1998: 0.9, 1999: 1.4, 2000: 4.5, 2001: 4.4, 2002: 3.0, 2003: 2.7, 2004: 2.3, 2005: 2.7, 2006: 3.6, 2007: 2.4, 2008: 4.3, 2009: 1.8, 2010: 2.9, 2011: 3.4, 2012: 1.7, 2013: 2.5, 2014: 2.5, 2015: 1.5, 2016: 1.3, 2017: 2.0, 2018: 1.9, 2019: 1.6, 2020: 0.9, 2021: 2.8, 2022: 6.6, 2023: 5.8, 2024: 4.0},
    "INR": {1980: 11.9, 1981: 11.9, 1982: 5.9, 1983: 6.4, 1984: 6.1, 1985: 5.6, 1986: 3.5, 1987: 4.7, 1988: 8.8, 1989: 7.9, 1990: 9.1, 1991: 12.6, 1992: 4.8, 1993: 9.8, 1994: 11.3, 1995: 13.0, 1996: 10.8, 1997: 12.8, 1998: 6.8, 1999: 5.7, 2000: 3.6, 2001: 4.4, 2002: 3.5, 2003: 3.1, 2004: 4.6, 2005: 9.3, 2006: 7.9, 2007: 7.8, 2008: 12.0, 2009: 19.6, 2010: 10.1, 2011: 13.7, 2012: 11.0, 2013: 7.4, 2014: 8.6, 2015: 4.5, 2016: 2.9, 2017: 4.1, 2018: 3.9, 2019: 6.7, 2020: 10.7, 2021: 8.9, 2022: 12.1, 2023: 29.2, 2024: 23.6}
}

# 当前汇率（保持不变）
current_exchange_rates = {
    "USD_USD": 1.0,
    "USD_EUR": 0.84,
    "USD_GBP": 0.77,
    "USD_JPY": 110.0,
    "USD_CNY": 7.19,
    "USD_CAD": 1.35,
    "USD_AUD": 1.50,
    "USD_INR": 83.0
}

# 历史事件（保持不变）
historical_events = [
    {"year": 1980, "event": "1980: Rubik’s Cube hits the shelves!"},
    {"year": 1983, "event": "1983: The first mobile phone call is made!"},
    {"year": 1986, "event": "1986: The Challenger tragedy shocks the world."},
    {"year": 1989, "event": "1989: Berlin Wall falls!"},
    {"year": 1991, "event": "1991: The Soviet Union collapses!"},
    {"year": 1995, "event": "1995: eBay launches!"},
    {"year": 1997, "event": "1997: Harry Potter books debut!"},
    {"year": 1999, "event": "1999: Y2K panic!"},
    {"year": 2000, "event": "2000: The world survives Y2K!"},
    {"year": 2001, "event": "2001: 9/11 attacks change the world."},
    {"year": 2004, "event": "2004: Facebook launches!"},
    {"year": 2008, "event": "2008: Global financial crisis hits!"},
    {"year": 2011, "event": "2011: Bitcoin hits $1!"},
    {"year": 2013, "event": "2013: Bitcoin hits $1000!"},
    {"year": 2016, "event": "2016: Brexit shocks the world!"},
    {"year": 2020, "event": "2020: COVID-19 locks down the world!"},
    {"year": 2022, "event": "2022: Inflation hits a 40-year high in the US!"},
    {"year": 2024, "event": "2024: AI takes over the world (kinda)!"}
]

# 读取加密货币数据
def load_crypto_data():
    file_path = os.path.join(os.path.dirname(__file__), 'crypto_data.csv')
    df = pd.read_csv(file_path)
    df['date'] = pd.to_datetime(df['date'])
    return df

# 原有函数（保持不变）
def calculate_inflation_factor(currency, start_year, end_year):
    if currency not in inflation_rates:
        raise ValueError(f"Currency {currency} not found in inflation data.")
    if start_year < 1980 or end_year < 1980 or start_year > 2024 or end_year > 2024:
        raise ValueError("Year out of range (1980-2024).")
    factor = 1.0
    years = range(start_year, end_year + 1) if start_year <= end_year else range(end_year, start_year + 1)
    for year in years:
        rate = inflation_rates[currency].get(year, 0.0)
        if start_year <= end_year:
            factor *= (1 + rate / 100)
        else:
            factor /= (1 + rate / 100) if (1 + rate / 100) != 0 else 1.0
    return factor

def get_exchange_rate(from_currency, to_currency, year):
    if from_currency not in inflation_rates or to_currency not in inflation_rates:
        raise ValueError(f"Invalid currency: {from_currency} or {to_currency}")
    if year < 1980 or year > 2024:
        raise ValueError("Year out of range (1980-2024).")
    if from_currency == to_currency:
        return 1.0
    base_year = 2024
    try:
        from_factor = calculate_inflation_factor(from_currency, year, base_year)
        to_factor = calculate_inflation_factor(to_currency, year, base_year)
        current_rate = current_exchange_rates[f"USD_{to_currency}"] / current_exchange_rates[f"USD_{from_currency}"] if from_currency != "USD" else current_exchange_rates[f"USD_{to_currency}"]
        adjusted_rate = current_rate * (to_factor / from_factor) if from_factor != 0 and to_factor != 0 else current_rate
        return adjusted_rate
    except Exception as e:
        raise ValueError(f"Exchange rate calculation failed: {str(e)}")

def calculate_yearly_values(start_currency, target_currency, start_year, target_year, amount):
    if start_year < 1980 or target_year < 1980 or start_year > 2024 or target_year > 2024:
        raise ValueError("Year out of range (1980-2024).")
    start_values = {}
    target_values = {}
    start_percentages = {}
    target_percentages = {}
    exchange_rate_history = {}
    cumulative_inflation_start = {}
    cumulative_inflation_target = {}
    value_change_start = {}
    value_change_target = {}
    yearly_inflation_start = {}
    yearly_inflation_target = {}
    years = list(range(min(start_year, target_year), max(start_year, target_year) + 1))
    for i, year in enumerate(years):
        try:
            factor = calculate_inflation_factor(start_currency, start_year, year)
            start_value = amount * factor
            start_values[year] = start_value
            rate = get_exchange_rate(start_currency, target_currency, year)
            target_values[year] = start_value * rate if rate else 0.0
            exchange_rate_history[year] = rate
            cumulative_inflation_start[year] = (factor - 1) * 100
            cumulative_inflation_target[year] = (calculate_inflation_factor(target_currency, start_year, year) - 1) * 100
            value_change_start[year] = start_value
            value_change_target[year] = target_values[year]
            yearly_inflation_start[year] = inflation_rates[start_currency].get(year, 0.0)
            yearly_inflation_target[year] = inflation_rates[target_currency].get(year, 0.0)
            if i == 0:
                start_percentages[year] = 0.0
                target_percentages[year] = 0.0
            else:
                prev_year = years[i - 1]
                start_percentages[year] = ((start_values[year] - start_values[prev_year]) / start_values[prev_year]) * 100 if start_values[prev_year] != 0 else 0.0
                target_percentages[year] = ((target_values[year] - target_values[prev_year]) / target_values[prev_year]) * 100 if target_values[prev_year] != 0 else 0.0
        except Exception as e:
            print(f"Error calculating year {year}: {str(e)}")
            start_values[year] = 0.0
            target_values[year] = 0.0
            start_percentages[year] = 0.0
            target_percentages[year] = 0.0
            exchange_rate_history[year] = 0.0
            cumulative_inflation_start[year] = 0.0
            cumulative_inflation_target[year] = 0.0
            value_change_start[year] = 0.0
            value_change_target[year] = 0.0
            yearly_inflation_start[year] = 0.0
            yearly_inflation_target[year] = 0.0
    return (start_values, target_values, start_percentages, target_percentages, exchange_rate_history,
            cumulative_inflation_start, cumulative_inflation_target, value_change_start, value_change_target,
            yearly_inflation_start, yearly_inflation_target)

# 加载经济数据（保持不变）
with open('static/economic_data.json', 'r') as f:
    economic_data = json.load(f)

# 路由
@app.route('/')
def index():
    return render_template('index.html', current_path='/')

@app.route('/chart_inflation')
def chart_inflation():
    random_event = random.choice(historical_events)
    if 'comparison_data' not in session:
        session['comparison_data'] = {}
    return render_template('chart_inflation.html', currencies=["USD", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "INR"], initial_event=random_event, current_path='/chart_inflation')

@app.route('/economic_index')
def economic_index():
    return render_template('economic_index.html', current_path='/economic_index')

@app.route('/crypto_mode')
def crypto_mode():
    df = load_crypto_data()
    tickers = df['ticker'].unique().tolist()
    return render_template('crypto_mode.html', tickers=tickers, current_path='/crypto_mode')

@app.route('/donation')
def donation():
    return render_template('donation.html', current_path='/donation')

@app.route('/economic_data')
def get_economic_data():
    return jsonify(economic_data)

@app.route('/crypto_data/<ticker>')
def get_crypto_data(ticker):
    df = load_crypto_data()
    ticker_data = df[df['ticker'] == ticker][['date', 'close']].to_dict(orient='records')
    return jsonify(ticker_data)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        start_currency = request.form.get('start_currency')
        target_currency = request.form.get('target_currency')
        start_year = request.form.get('start_year')
        amount = request.form.get('amount')
        target_year = request.form.get('target_year')
        mode = request.form.get('mode')
        if not all([start_currency, target_currency, start_year, amount, target_year, mode]):
            return jsonify({"error": "All fields are required"}), 400
        if start_currency not in inflation_rates or target_currency not in inflation_rates:
            return jsonify({"error": f"Invalid currency: {start_currency} or {target_currency}"}), 400
        start_year = int(start_year)
        target_year = int(target_year)
        amount = float(amount)
        mode = int(mode)
        if mode == 1 and start_year <= target_year:
            return jsonify({"error": "Start year must be later than target year for Future to Past mode"}), 400
        elif mode == 2 and start_year >= target_year:
            return jsonify({"error": "Start year must be earlier than target year for Past to Future mode"}), 400
        if start_year < 1980 or target_year < 1980 or start_year > 2024 or target_year > 2024:
            return jsonify({"error": "Year out of range (1980-2024)"}), 400
        if amount <= 0:
            return jsonify({"error": "Amount must be positive"}), 400
        factor = calculate_inflation_factor(start_currency, start_year, target_year)
        start_amount = amount * factor
        rate = get_exchange_rate(start_currency, target_currency, target_year)
        target_amount = start_amount * rate if rate else 0.0
        start_result = f"{start_currency}: {amount:.2f} ({start_year}) = {start_amount:.2f} ({target_year})"
        target_result = f"{target_currency}: {(amount * get_exchange_rate(start_currency, target_currency, start_year)):.2f} ({start_year}) = {target_amount:.2f} ({target_year})"
        (start_values, target_values, start_percentages, target_percentages, exchange_rate_history,
         cumulative_inflation_start, cumulative_inflation_target, value_change_start, value_change_target,
         yearly_inflation_start, yearly_inflation_target) = calculate_yearly_values(
            start_currency, target_currency, start_year, target_year, amount)
        result_id = str(uuid.uuid4())
        result_data = {
            "id": result_id,
            "start_result": start_result,
            "target_result": target_result,
            "start_currency": start_currency,
            "target_currency": target_currency,
            "start_values": start_values,
            "target_values": target_values,
            "start_percentages": start_percentages,
            "target_percentages": target_percentages,
            "exchange_rate_history": exchange_rate_history,
            "cumulative_inflation_start": cumulative_inflation_start,
            "cumulative_inflation_target": cumulative_inflation_target,
            "value_change_start": value_change_start,
            "value_change_target": value_change_target,
            "yearly_inflation_start": yearly_inflation_start,
            "yearly_inflation_target": yearly_inflation_target
        }
        session['comparison_data'][result_id] = result_data
        session.modified = True
        return jsonify({
            "start_result": start_result,
            "target_result": target_result,
            "start_currency": start_currency,
            "target_currency": target_currency,
            "start_values": start_values,
            "target_values": target_values,
            "start_percentages": start_percentages,
            "target_percentages": target_percentages,
            "exchange_rate_history": exchange_rate_history,
            "cumulative_inflation_start": cumulative_inflation_start,
            "cumulative_inflation_target": cumulative_inflation_target,
            "value_change_start": value_change_start,
            "value_change_target": value_change_target,
            "yearly_inflation_start": yearly_inflation_start,
            "yearly_inflation_target": yearly_inflation_target,
            "comparison_id": result_id,
            "comparison_data": session['comparison_data']
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Unexpected error in /calculate: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/switch_event', methods=['GET'])
def switch_event():
    try:
        random_event = random.choice(historical_events)
        return jsonify({"event": random_event["event"]})
    except Exception as e:
        return jsonify({"error": f"Failed to switch event: {str(e)}"}), 500

@app.route('/clear_comparison', methods=['POST'])
def clear_comparison():
    try:
        session['comparison_data'] = {}
        session.modified = True
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": f"Failed to clear comparison: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8080)