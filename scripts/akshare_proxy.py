#!/usr/bin/env python3
"""
AKShare 数据获取脚本
通过标准 JSON 输入/输出与 Node.js 通信
"""

import sys
import json
import asyncio
import time
from datetime import datetime
from typing import Optional
import pandas as pd

try:
    import akshare as ak
    import requests
    # 设置 requests 超时
    requests.adapters.DEFAULT_RETRIES = 3
except ImportError:
    print(json.dumps({"error": "akshare not installed, run: pip install akshare"}))
    sys.exit(1)

# 请求限流：记录上次请求时间
_last_request_time: float = 0
_request_interval: float = 0.5  # 每个请求之间最少间隔 0.5 秒


def rate_limit():
    """请求限流，避免触发 API 频率限制"""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _request_interval:
        time.sleep(_request_interval - elapsed)
    _last_request_time = time.time()


def safe_api_call(func, *args, max_retries=2, **kwargs):
    """
    安全的 API 调用包装器，带重试机制
    """
    for attempt in range(max_retries):
        try:
            rate_limit()
            return func(*args, **kwargs)
        except Exception as e:
            error_msg = str(e).lower()
            # 检查是否为可重试的错误
            is_retryable = (
                'connection' in error_msg or
                'timeout' in error_msg or
                'remote' in error_msg or
                'network' in error_msg
            )

            if is_retryable and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # 2s, 4s
                print(f"警告: API 调用失败，{wait_time}秒后重试 (尝试 {attempt + 1}/{max_retries}): {e}", file=sys.stderr)
                time.sleep(wait_time)
                continue

            raise e

    return None


def format_symbol(symbol: str, market: str = None) -> str:
    """
    将股票代码转换为 AKShare 格式
    AKShare 使用 6 位代码，需要根据市场添加后缀
    """
    symbol = symbol.replace('.SH', '').replace('.SZ', '').replace('.HK', '').replace('.US', '')
    symbol = symbol.zfill(6)
    return symbol


def get_market_from_code(code: str) -> str:
    """根据代码判断市场"""
    code = code.zfill(6)
    if code.startswith('6'):
        return 'sh'
    elif code.startswith(('0', '3')):
        return 'sz'
    elif code.startswith('5') or code.startswith('9'):
        return 'sh'
    return 'sz'


def get_quote(symbol: str) -> dict:
    """获取实时行情"""
    try:
        code = format_symbol(symbol)
        market = get_market_from_code(code)
        xq_quote = get_quote_from_xq(market.upper(), code)
        if xq_quote is not None:
            return xq_quote

        data = get_quote_from_spot_snapshot(code)
        if data is None:
            return {"error": f"Stock {symbol} not found"}

        price = float(data['最新价'])
        prev_close = float(data['昨收'])
        change_rate = ((price - prev_close) / prev_close * 100) if prev_close > 0 else 0

        return {
            "price": price,
            "volume": float(data['成交量']) if data['成交量'] else 0,
            "changeRate": round(change_rate, 2),
            "nameCn": data['名称'],
            "market": market.upper()
        }
    except Exception as e:
        return {"error": str(e)}


def get_quotes(symbols: list) -> list:
    """批量获取实时行情"""
    try:
        results = []
        df = None

        for symbol in symbols:
            code = format_symbol(symbol)
            market = get_market_from_code(code)

            xq_quote = get_quote_from_xq(market.upper(), code)
            if xq_quote is not None:
                results.append({
                    "symbol": symbol,
                    "price": xq_quote["price"],
                    "volume": xq_quote["volume"],
                    "changePercent": xq_quote["changeRate"],
                    "nameCn": xq_quote["nameCn"],
                    "market": xq_quote["market"],
                    "name": symbol
                })
                continue

            if df is None:
                df = get_spot_snapshot()

            if df is None or df.empty:
                results.append({
                    "symbol": symbol,
                    "error": "Failed to fetch market data"
                })
                continue

            row = df[df['代码'] == code]

            if row.empty:
                results.append({
                    "symbol": symbol,
                    "error": f"Stock {symbol} not found"
                })
                continue

            data = row.iloc[0]
            price = float(data['最新价'])
            prev_close = float(data['昨收'])
            change_rate = ((price - prev_close) / prev_close * 100) if prev_close > 0 else 0

            results.append({
                "symbol": symbol,
                "price": price,
                "volume": float(data['成交量']) if data['成交量'] else 0,
                "changePercent": round(change_rate, 2),
                "nameCn": data['名称'],
                "market": market.upper(),
                "name": symbol
            })

        return results
    except Exception as e:
        return [{"error": str(e)}]


def get_quote_from_xq(market: str, code: str):
    xq_symbol = f"{market}{code}"
    try:
        df = safe_api_call(ak.stock_individual_spot_xq, symbol=xq_symbol)
    except Exception:
        return None

    if df is None or df.empty:
        return None

    values = dict(zip(df['item'], df['value']))

    latest = values.get('最新')
    prev_close = values.get('昨收')
    change_amount = values.get('涨跌')
    change_percent = values.get('涨幅')
    volume = values.get('成交量')
    name = values.get('名称')
    exchange = values.get('交易所', market)

    if latest is None and prev_close is not None and change_amount is not None:
        latest = float(prev_close) + float(change_amount)

    if latest is None or prev_close is None or volume is None or name is None:
        return None

    if change_percent is None:
        change_percent = ((float(latest) - float(prev_close)) / float(prev_close) * 100) if float(prev_close) > 0 else 0

    return {
        "price": float(latest),
        "volume": float(volume),
        "changeRate": round(float(change_percent), 2),
        "nameCn": str(name),
        "market": str(exchange).upper(),
    }


def get_spot_snapshot():
    """获取 A 股实时快照，优先使用更稳定的新浪源，失败时回退东财源"""
    try:
        df = safe_api_call(ak.stock_zh_a_spot)
        if df is not None and not df.empty:
            normalized_df = df.copy()
            normalized_df['代码'] = normalized_df['代码'].astype(str).str.replace(r'^(?:sh|sz|bj)', '', regex=True).str.zfill(6)
            return normalized_df
    except Exception:
        pass

    try:
        df = safe_api_call(ak.stock_zh_a_spot_em)
        if df is not None and not df.empty:
            return df
    except Exception:
        pass

    return None


def get_quote_from_spot_snapshot(code: str):
    df = get_spot_snapshot()
    if df is None or df.empty:
        return None

    row = df[df['代码'] == code]
    if row.empty:
        return None

    return row.iloc[0]


def get_kline(symbol: str, period: str = 'daily', count: int = 100) -> list:
    """获取K线数据"""
    try:
        code = format_symbol(symbol)
        market = get_market_from_code(code)
        daily_symbol = f"{market}{code}"
        df = safe_api_call(ak.stock_zh_a_daily, symbol=daily_symbol)

        if df is None or df.empty:
            return []

        df = df.reset_index()
        if 'date' not in df.columns:
            df = df.rename(columns={df.columns[0]: 'date'})

        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')

        if period == 'weekly':
            weekly_df = (
                df.assign(week=df['date'].dt.to_period('W-FRI'))
                .groupby('week', as_index=False)
                .agg({
                    'date': 'last',
                    'open': 'first',
                    'high': 'max',
                    'low': 'min',
                    'close': 'last',
                    'volume': 'sum',
                })
            )
            df = weekly_df

        df = df.tail(count)

        result = []
        for _, row in df.iterrows():
            timestamp = int(pd.Timestamp(row['date']).timestamp() * 1000)
            result.append({
                "open": float(row['open']),
                "high": float(row['high']),
                "low": float(row['low']),
                "close": float(row['close']),
                "volume": float(row['volume']) if row['volume'] else 0,
                "timestamp": timestamp
            })

        return result
    except Exception as e:
        return [{"error": str(e)}]


def get_stock_info(symbol: str) -> dict:
    """获取股票信息"""
    try:
        code = format_symbol(symbol)
        market = get_market_from_code(code)
        xq_quote = get_quote_from_xq(market.upper(), code)

        if xq_quote is not None:
            return {
                "symbol": symbol,
                "market": xq_quote["market"],
                "nameCn": xq_quote["nameCn"],
                "nameEn": ""
            }

        df = safe_api_call(ak.stock_individual_info_em, symbol=code)
        if df is None:
            return {"error": "Failed to fetch stock info"}

        info = {
            "symbol": symbol,
            "market": market.upper(),
            "nameCn": "",
            "nameEn": ""
        }

        for _, row in df.iterrows():
            if row['item'] == '股票简称':
                info['nameCn'] = row['value']
            elif row['item'] == '行业':
                info['industry'] = row['value']

        return info
    except Exception as e:
        return {"error": str(e)}


def get_universe(market: str = 'A') -> list:
    """获取 A 股股票池"""
    try:
        results = []
        normalized_market = market.upper()
        datasets = []

        if normalized_market in ('A', 'SH'):
            sh_df = safe_api_call(ak.stock_info_sh_name_code)
            if sh_df is not None and not sh_df.empty:
                datasets.append((
                    sh_df,
                    '证券代码',
                    '证券简称',
                    'SH',
                ))

        if normalized_market in ('A', 'SZ'):
            sz_df = safe_api_call(ak.stock_info_sz_name_code)
            if sz_df is not None and not sz_df.empty:
                datasets.append((
                    sz_df,
                    'A股代码',
                    'A股简称',
                    'SZ',
                ))

        if not datasets:
            return []

        for df, code_column, name_column, detected_market in datasets:
            for _, row in df.iterrows():
                code = str(row[code_column]).zfill(6)
                results.append({
                    "symbol": f"{code}.{detected_market}",
                    "name": str(row[name_column]).strip(),
                    "market": detected_market,
                })

        return results
    except Exception as e:
        return {"error": str(e)}


def check_available() -> dict:
    """检查 AKShare 是否可用"""
    try:
        sh_df = safe_api_call(ak.stock_info_sh_name_code)
        if sh_df is not None and not sh_df.empty:
            return {"available": True, "message": "AKShare is working"}

        df = get_spot_snapshot()
        if df is not None and not df.empty:
            return {"available": True, "message": "AKShare is working"}

        return {"available": False, "message": "No data returned from available endpoints"}
    except Exception as e:
        return {"available": False, "message": str(e)}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'check':
        result = check_available()
    elif command == 'quote':
        if len(sys.argv) < 3:
            result = {"error": "Symbol required"}
        else:
            result = get_quote(sys.argv[2])
    elif command == 'quotes':
        if len(sys.argv) < 3:
            result = {"error": "Symbols required (JSON array)"}
        else:
            symbols = json.loads(sys.argv[2])
            result = get_quotes(symbols)
    elif command == 'kline':
        if len(sys.argv) < 3:
            result = {"error": "Symbol required"}
        else:
            period = sys.argv[3] if len(sys.argv) > 3 else 'daily'
            count = int(sys.argv[4]) if len(sys.argv) > 4 else 100
            result = get_kline(sys.argv[2], period, count)
    elif command == 'info':
        if len(sys.argv) < 3:
            result = {"error": "Symbol required"}
        else:
            result = get_stock_info(sys.argv[2])
    elif command == 'universe':
        market = sys.argv[2] if len(sys.argv) > 2 else 'A'
        result = get_universe(market)
    else:
        result = {"error": f"Unknown command: {command}"}
    
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
