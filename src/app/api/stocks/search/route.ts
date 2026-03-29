import { getQuoteProvider } from "@/server/datasource";
import { MarketStockInfo } from "@/server/datasource/types";
import { NextResponse } from "next/server";

/**
 * 搜索股票 API
 * 支持通过股票代码、中文名称、拼音首字母搜索
 * 覆盖 A 股（含科创板、北交所）、港股、美股
 */

/**
 * 拼音首字母区间对照表
 * 每个拼音区间的起始汉字，用于 localeCompare 中文排序确定拼音首字母
 * 跳过 I/U/V（中文拼音不使用）
 */
const SECTION_MARKS = "ABCDEFGHJKLMNOPQRSTWXYZ";
const SECTION_STARTS = "阿八嚓哒鹅发旮哈讥咔垃妈拿噢啪七日撒他挖昔压匝";

/**
 * 获取单个汉字的拼音首字母
 * 使用系统中文 locale 排序来确定拼音区间
 */
function getCharPinyin(char: string): string {
  const code = char.charCodeAt(0);
  // 英文字母直接返回大写
  if (code >= 65 && code <= 90) return char;
  if (code >= 97 && code <= 122) return char.toUpperCase();
  // 非中文字符
  if (code < 0x4e00 || code > 0x9fff) return "";

  for (let i = SECTION_STARTS.length - 1; i >= 0; i--) {
    if (char.localeCompare(SECTION_STARTS[i], "zh") >= 0) {
      return SECTION_MARKS[i];
    }
  }
  return "";
}

/**
 * 获取整个字符串的拼音首字母
 */
function getPinyinInitials(str: string): string {
  let result = "";
  for (const char of str) {
    const initial = getCharPinyin(char);
    if (initial) result += initial;
  }
  return result;
}

// 内存缓存
interface StockCache {
  data: Array<MarketStockInfo & { pinyin: string }>;
  expireAt: number;
}

let stockCache: StockCache | null = null;
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 小时

/**
 * 获取 A 股股票池（带缓存 + 拼音预计算）
 */
async function getAStockList(): Promise<Array<MarketStockInfo & { pinyin: string }>> {
  if (stockCache && Date.now() < stockCache.expireAt) {
    return stockCache.data;
  }

  try {
    const provider = await getQuoteProvider("akshare").catch(() => null);
    if (!provider?.getMarketStocks) {
      return stockCache?.data ?? [];
    }

    const stocks = await provider.getMarketStocks("A");
    const enriched = stocks.map((stock) => ({
      ...stock,
      pinyin: getPinyinInitials(stock.name),
    }));

    stockCache = {
      data: enriched,
      expireAt: Date.now() + CACHE_TTL,
    };

    return enriched;
  } catch (error) {
    console.error("[StockSearch] 获取 A 股列表失败:", error);
    return stockCache?.data ?? [];
  }
}

/**
 * 匹配：支持代码、名称、拼音首字母
 */
function matchStock(
  stock: MarketStockInfo & { pinyin: string },
  query: string,
): boolean {
  const symbol = stock.symbol.toUpperCase();
  const symbolCode = symbol.split(".")[0];
  const name = stock.name.toUpperCase();
  const pinyin = stock.pinyin.toUpperCase();

  // 代码匹配
  if (symbolCode.includes(query) || symbol.includes(query)) return true;

  // 中文名称匹配
  if (name.includes(query)) return true;

  // 拼音首字母前缀匹配
  if (pinyin.startsWith(query)) return true;

  // 拼音首字母包含匹配
  if (pinyin.includes(query)) return true;

  return false;
}

/**
 * 按匹配度排序
 */
function sortByRelevance(
  a: MarketStockInfo & { pinyin: string },
  b: MarketStockInfo & { pinyin: string },
  query: string,
): number {
  const aCode = a.symbol.split(".")[0];
  const bCode = b.symbol.split(".")[0];

  // 精确匹配代码最优先
  if (aCode === query && bCode !== query) return -1;
  if (bCode === query && aCode !== query) return 1;

  // 代码开头匹配
  if (aCode.startsWith(query) && !bCode.startsWith(query)) return -1;
  if (bCode.startsWith(query) && !aCode.startsWith(query)) return 1;

  // 拼音开头匹配
  if (a.pinyin.startsWith(query) && !b.pinyin.startsWith(query)) return -1;
  if (b.pinyin.startsWith(query) && !a.pinyin.startsWith(query)) return 1;

  // 名称开头匹配
  if (a.name.startsWith(query) && !b.name.startsWith(query)) return -1;
  if (b.name.startsWith(query) && !a.name.startsWith(query)) return 1;

  return aCode.localeCompare(bCode);
}

/**
 * 港股/美股按需查找
 * 通过 LongPort staticInfo 解析单个股票，避免全量加载
 */
async function searchHKUSByCode(query: string): Promise<MarketStockInfo[]> {
  const results: MarketStockInfo[] = [];

  // 港股：4-5 位数字代码
  const hkPattern = /^\d{4,5}$/;
  if (hkPattern.test(query)) {
    try {
      const provider = await getQuoteProvider("longbridge").catch(() => null);
      if (provider?.getStockInfo) {
        const paddedCode = query.padStart(5, "0");
        const info = await provider.getStockInfo(`${paddedCode}.HK`);
        if (info?.nameCn) {
          results.push({
            symbol: `${paddedCode}.HK`,
            name: info.nameCn,
            market: "HK",
          });
        }
      }
    } catch {
      // 忽略查找失败
    }
  }

  // 美股：1-5 位字母代码
  const usPattern = /^[A-Z]{1,5}$/;
  if (usPattern.test(query)) {
    try {
      const provider = await getQuoteProvider("longbridge").catch(() => null);
      if (provider?.getStockInfo) {
        const info = await provider.getStockInfo(`${query}.US`);
        if (info?.nameCn) {
          results.push({
            symbol: `${query}.US`,
            name: info.nameCn,
            market: "US",
          });
        }
      }
    } catch {
      // 忽略查找失败
    }
  }

  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.trim().toUpperCase();

    // 阶段 1: 搜索 A 股（含科创板 + 北交所）
    const allStocks = await getAStockList();
    const results = allStocks
      .filter((stock) => matchStock(stock, searchTerm))
      .sort((a, b) => sortByRelevance(a, b, searchTerm))
      .slice(0, 20)
      .map(({ pinyin: _, ...stock }) => stock);

    // 阶段 2: A 股结果不足时，尝试港股/美股按需查找
    if (results.length < 3) {
      const hkUsResults = await searchHKUSByCode(searchTerm);
      results.push(...hkUsResults);
    }

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (error) {
    console.error("Search stocks error:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
