import { getQuoteProvider } from "@/server/datasource";
import { NextResponse } from "next/server";

/**
 * 搜索股票 API
 * 支持通过股票代码、中文名称、拼音首字母搜索
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = query.trim().toUpperCase();

    // 获取所有数据源提供者
    const providers = {
      akshare: await getQuoteProvider("akshare").catch(() => null),
      longbridge: await getQuoteProvider("longbridge").catch(() => null),
    };

    const results: Array<{
      symbol: string;
      name: string;
      market: string;
      pinyin?: string;
    }> = [];

    // 搜索港股和美股（LongPort）
    if (providers.longbridge) {
      try {
        // 这里需要调用 LongPort 的搜索接口
        // 由于 LongPort API 可能没有搜索功能，我们需要维护一个股票列表
        // 暂时返回空数组
      } catch (error) {
        console.error("LongPort search error:", error);
      }
    }

    // 搜索A股（AKShare）
    if (providers.akshare) {
      try {
        // 调用 AKShare 的搜索功能
        const response = await fetch(
          `http://localhost:12000/search?q=${encodeURIComponent(searchTerm)}`,
          { signal: AbortSignal.timeout(5000) },
        );

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) {
            results.push(...data.results);
          }
        }
      } catch (error) {
        console.error("AKShare search error:", error);
      }
    }

    // 客户端过滤：支持代码、名称、拼音首字母搜索
    const filteredResults = results.filter((stock) => {
      const symbol = stock.symbol.toUpperCase();
      const name = stock.name.toUpperCase();
      const pinyin = (stock.pinyin || "").toUpperCase();
      const query = searchTerm;

      // 完全匹配股票代码
      if (symbol.includes(query)) return true;

      // 匹配中文名称
      if (name.includes(query)) return true;

      // 匹配拼音首字母
      if (pinyin.includes(query)) return true;

      // 模糊匹配：查询字符串的每个字符都在拼音中出现
      const queryChars = query.split("");
      const allCharsMatch = queryChars.every((char) => pinyin.includes(char));
      if (allCharsMatch) return true;

      return false;
    });

    // 按匹配度排序
    filteredResults.sort((a, b) => {
      const aSymbol = a.symbol.toUpperCase();
      const bSymbol = b.symbol.toUpperCase();
      const aName = a.name.toUpperCase();
      const bName = b.name.toUpperCase();
      const query = searchTerm;

      // 精确匹配代码最优先
      if (aSymbol === query && bSymbol !== query) return -1;
      if (bSymbol === query && aSymbol !== query) return 1;

      // 代码开头匹配
      if (aSymbol.startsWith(query) && !bSymbol.startsWith(query)) return -1;
      if (bSymbol.startsWith(query) && !aSymbol.startsWith(query)) return 1;

      // 名称开头匹配
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (bName.startsWith(query) && !aName.startsWith(query)) return 1;

      // 按代码排序
      return aSymbol.localeCompare(bSymbol);
    });

    // 限制返回结果数量
    const limitedResults = filteredResults.slice(0, 20);

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    console.error("Search stocks error:", error);
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
