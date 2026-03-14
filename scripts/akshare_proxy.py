#!/usr/bin/env python3
"""
AKShare 数据获取脚本
通过标准 JSON 输入/输出与 Node.js 通信
"""

import sys
import json
import asyncio
from datetime import datetime

try:
    import akshare as ak
except ImportError:
    print(json.dumps({"error": "akshare not installed, run: pip install akshare"}))
    sys.exit(1)


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
        
        df = ak.stock_zh_a_spot_em()
        row = df[df['代码'] == code]
        
        if row.empty:
            return {"error": f"Stock {symbol} not found"}
        
        data = row.iloc[0]
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
        df = ak.stock_zh_a_spot_em()
        results = []
        
        for symbol in symbols:
            code = format_symbol(symbol)
            market = get_market_from_code(code)
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


def get_kline(symbol: str, period: str = 'daily', count: int = 100) -> list:
    """获取K线数据"""
    try:
        code = format_symbol(symbol)
        market = get_market_from_code(code)
        adjust = ''  # 不复权
        
        if period == 'weekly':
            df = ak.stock_zh_a_hist(symbol=code, period='weekly', adjust=adjust)
        else:
            df = ak.stock_zh_a_hist(symbol=code, period='daily', adjust=adjust)
        
        if df.empty:
            return []
        
        df = df.tail(count)
        
        result = []
        for _, row in df.iterrows():
            timestamp = int(datetime.strptime(str(row['日期']), '%Y-%m-%d').timestamp() * 1000)
            result.append({
                "open": float(row['开盘']),
                "high": float(row['最高']),
                "low": float(row['最低']),
                "close": float(row['收盘']),
                "volume": float(row['成交量']) if row['成交量'] else 0,
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
        
        df = ak.stock_individual_info_em(symbol=code)
        
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


def check_available() -> dict:
    """检查 AKShare 是否可用"""
    try:
        df = ak.stock_zh_a_spot_em()
        if df is not None and not df.empty:
            return {"available": True, "message": "AKShare is working"}
        return {"available": False, "message": "No data returned"}
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
    else:
        result = {"error": f"Unknown command: {command}"}
    
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
