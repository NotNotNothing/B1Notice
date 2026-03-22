import { useState, useEffect, useCallback, useMemo } from "react";
import { StockCard } from "./StockCard";
import { StockData } from "../types/stock";
import { TradeBoard } from "./TradeBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { STOCK_LIST_COLUMN_SIZES } from "@/lib/table-column-utils";

interface StockListProps {
  stocks: StockData[];
  onStocksChange: () => void;
  showBBITrendSignal?: boolean;
}

interface StockSignalApiItem {
  symbol: string;
  buySignal?: {
    hasBuySignal?: boolean;
    conditions?: {
      priceAboveYellow: boolean;
      whiteAboveYellow: boolean;
      jBelowThreshold: boolean;
    };
    whiteLine: number;
    yellowLine: number;
    jValue: number;
    price: number;
    jThreshold?: number;
  } | null;
  sellSignal?: StockData["sellSignal"] | null;
  errors?: {
    sell?: string | null;
  };
}

const formatNumber = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(digits);
};

const formatUpdatedAt = (value?: string) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSignalTags = (stock: StockData) => {
  const tags: Array<{
    label: string;
    className: string;
  }> = [];

  if (stock.sellSignal?.hasSellSignal) {
    tags.push({
      label: "卖出",
      className:
        "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    });
  }

  if (stock.buySignal?.hasBuySignal) {
    tags.push({
      label: "买入",
      className:
        "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    });
  }

  if (stock.zhixingTrend?.isGoldenCross) {
    tags.push({
      label: "金叉",
      className:
        "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    });
  } else if (stock.zhixingTrend?.isDeathCross) {
    tags.push({
      label: "死叉",
      className:
        "border border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    });
  }

  if (stock.bbi?.aboveBBIConsecutiveDays) {
    tags.push({
      label: `站上BBI ${stock.bbi.aboveBBIConsecutiveDaysCount}天`,
      className:
        "border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    });
  } else if (stock.bbi?.belowBBIConsecutiveDays) {
    tags.push({
      label: `跌破BBI ${stock.bbi.belowBBIConsecutiveDaysCount}天`,
      className:
        "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    });
  }

  return tags.slice(0, 3);
};

// 定义表格列
const useStockColumns = (): ColumnDef<StockData>[] => {
  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="股票" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.symbol} · {row.original.market}
            </span>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
        size: STOCK_LIST_COLUMN_SIZES.name.size,
        minSize: STOCK_LIST_COLUMN_SIZES.name.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.name.maxSize,
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="最新价" />
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatNumber(row.original.price)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.price.size,
        minSize: STOCK_LIST_COLUMN_SIZES.price.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.price.maxSize,
      },
      {
        accessorKey: "changePercent",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="涨跌幅" />
        ),
        cell: ({ row }) => {
          const isPositive = row.original.changePercent >= 0;
          return (
            <div
              className={`text-right font-medium ${
                isPositive ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {formatNumber(row.original.changePercent)}%
            </div>
          );
        },
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.changePercent.size,
        minSize: STOCK_LIST_COLUMN_SIZES.changePercent.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.changePercent.maxSize,
      },
      {
        accessorKey: "kdj.j",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="日线 J" />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.kdj?.j)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.dailyJ.size,
        minSize: STOCK_LIST_COLUMN_SIZES.dailyJ.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.dailyJ.maxSize,
      },
      {
        accessorKey: "weeklyKdj.j",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="周线 J" />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.weeklyKdj?.j)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.weeklyJ.size,
        minSize: STOCK_LIST_COLUMN_SIZES.weeklyJ.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.weeklyJ.maxSize,
      },
      {
        accessorKey: "zhixingTrend.whiteLine",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="白线" />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.zhixingTrend?.whiteLine)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.whiteLine.size,
        minSize: STOCK_LIST_COLUMN_SIZES.whiteLine.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.whiteLine.maxSize,
      },
      {
        accessorKey: "zhixingTrend.yellowLine",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="黄线" />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.zhixingTrend?.yellowLine)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.yellowLine.size,
        minSize: STOCK_LIST_COLUMN_SIZES.yellowLine.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.yellowLine.maxSize,
      },
      {
        accessorKey: "bbi.bbi",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="BBI" />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            {formatNumber(row.original.bbi?.bbi)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.bbi.size,
        minSize: STOCK_LIST_COLUMN_SIZES.bbi.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.bbi.maxSize,
      },
      {
        accessorKey: "signals",
        header: "信号",
        cell: ({ row }) => {
          const signalTags = getSignalTags(row.original);
          return (
            <div className="flex flex-wrap gap-1.5">
              {signalTags.length > 0 ? (
                signalTags.map((tag) => (
                  <span
                    key={`${row.original.symbol}-${tag.label}`}
                    className={`rounded-full px-2 py-1 text-xs font-medium ${tag.className}`}
                  >
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: STOCK_LIST_COLUMN_SIZES.signals.size,
        minSize: STOCK_LIST_COLUMN_SIZES.signals.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.signals.maxSize,
      },
      {
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {formatUpdatedAt(row.original.updatedAt)}
          </div>
        ),
        enableSorting: true,
        size: STOCK_LIST_COLUMN_SIZES.updatedAt.size,
        minSize: STOCK_LIST_COLUMN_SIZES.updatedAt.minSize,
        maxSize: STOCK_LIST_COLUMN_SIZES.updatedAt.maxSize,
      },
    ],
    []
  );
};

export const StockList = ({
  stocks,
  onStocksChange,
  showBBITrendSignal = true,
}: StockListProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState("");
  const [newStockMarket, setNewStockMarket] = useState("HK");
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [stocksWithSignals, setStocksWithSignals] =
    useState<StockData[]>(stocks);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      symbol: string;
      name: string;
      market: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<{
    symbol: string;
    name: string;
    market: string;
  } | null>(null);

  // 获取表格列定义
  const columns = useStockColumns();

  const fetchSignals = useCallback(async () => {
    if (stocks.length === 0) return;

    try {
      setIsLoadingSignals(true);
      const response = await fetch("/api/stocks/signals");

      if (!response.ok) {
        throw new Error("获取信号失败");
      }

      const data: { results: StockSignalApiItem[] } = await response.json();

      const stocksWithData: StockData[] = stocks.map((stock) => {
        const apiItem = data.results.find(
          (item) =>
            item.symbol === stock.symbol ||
            item.symbol === stock.symbol.split(".")[0],
        );

        if (!apiItem) return stock;

        return {
          ...stock,
          buySignal: apiItem.buySignal || undefined,
          sellSignal: apiItem.sellSignal || undefined,
          errors: apiItem.errors,
        } as StockData;
      });

      setStocksWithSignals(stocksWithData);
    } catch (error) {
      console.error("获取信号失败:", error);
      toast.error("获取信号失败");
      setStocksWithSignals(stocks);
    } finally {
      setIsLoadingSignals(false);
    }
  }, [stocks]);

  useEffect(() => {
    setStocksWithSignals(stocks);
    if (stocks.length > 0) {
      fetchSignals();
    }
  }, [stocks, fetchSignals]);

  // 搜索股票
  const searchStocks = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/stocks/search?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("搜索失败");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("搜索股票失败:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchStocks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchStocks]);

  const handleAddStock = async () => {
    // 如果有选中的搜索结果，使用它
    if (selectedSearchResult) {
      const symbolParts = selectedSearchResult.symbol.split(".");
      const symbol = symbolParts[0];
      const market =
        symbolParts.length > 1
          ? symbolParts[1].toUpperCase()
          : selectedSearchResult.market;

      await addStockToDB(symbol, market);
      return;
    }

    // 否则使用手动输入的值
    if (!newStockSymbol) {
      toast.error("请输入股票代码或选择股票");
      return;
    }

    const symbolParts = newStockSymbol.split(".");
    const symbol = symbolParts[0];
    const market =
      symbolParts.length > 1 ? symbolParts[1].toUpperCase() : newStockMarket;

    await addStockToDB(symbol, market);
  };

  const addStockToDB = async (symbol: string, market: string) => {
    try {
      setIsAddingStock(true);

      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: `${symbol}.${market}`,
          market: market,
        }),
      });

      if (!response.ok) {
        throw new Error("添加股票失败");
      }

      toast.success("添加股票成功");
      setShowAddStockDialog(false);
      setNewStockSymbol("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      onStocksChange();
    } catch (error) {
      console.error("添加股票失败:", error);
      toast.error("添加股票失败");
    } finally {
      setIsAddingStock(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">股票池</h2>
        <div className="flex gap-2">
          <Button
            onClick={fetchSignals}
            disabled={isLoadingSignals}
            variant="outline"
            size="sm"
          >
            {isLoadingSignals ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            刷新信号
          </Button>

          <Dialog
            open={showAddStockDialog}
            onOpenChange={setShowAddStockDialog}
          >
            <DialogTrigger asChild>
              <Button size="sm">添加股票</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>添加股票</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* 搜索输入框 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">搜索股票</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="输入股票代码、名称或拼音首字母（如：PAYH、平安、000001）"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedSearchResult(null);
                      }}
                      className="pl-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    支持股票代码（000001）、中文名称（平安银行）、拼音首字母（PAYH）
                  </p>
                </div>

                {/* 搜索结果列表 */}
                {searchResults.length > 0 && !selectedSearchResult && (
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        onClick={() => {
                          setSelectedSearchResult(result);
                          setSearchQuery(`${result.name} (${result.symbol})`);
                        }}
                        className="w-full rounded-lg border bg-card p-3 text-left transition-all hover:bg-accent hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{result.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {result.symbol}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.market}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 选中的股票 */}
                {selectedSearchResult && (
                  <div className="rounded-lg border-2 border-primary bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {selectedSearchResult.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedSearchResult.symbol} ·{" "}
                          {selectedSearchResult.market}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSearchResult(null);
                          setSearchQuery("");
                        }}
                      >
                        取消选择
                      </Button>
                    </div>
                  </div>
                )}

                {/* 分隔线 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      或手动输入
                    </span>
                  </div>
                </div>

                {/* 手动输入 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">股票代码</label>
                    <Input
                      placeholder="例如：000001"
                      value={newStockSymbol}
                      onChange={(e) => setNewStockSymbol(e.target.value)}
                      disabled={!!selectedSearchResult}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">市场</label>
                    <Select
                      value={newStockMarket}
                      onValueChange={setNewStockMarket}
                      disabled={!!selectedSearchResult}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HK">港股</SelectItem>
                        <SelectItem value="SH">沪市A股</SelectItem>
                        <SelectItem value="SZ">深市A股</SelectItem>
                        <SelectItem value="US">美股</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAddStock}
                  disabled={
                    isAddingStock || (!selectedSearchResult && !newStockSymbol)
                  }
                  className="w-full"
                >
                  {isAddingStock ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    "添加股票"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              暂无股票
            </p>
            <p className="text-sm text-muted-foreground">
              点击上方"添加股票"按钮开始监控
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* PC 端: 使用 DataTable */}
          <div className="hidden lg:block">
            <DataTable
              columns={columns}
              data={stocksWithSignals}
              searchKey="name"
              searchPlaceholder="搜索股票名称..."
              showColumnToggle={true}
              showPagination={true}
              pageSize={20}
              onRowClick={(row) => setSelectedStock(row)}
            />
          </div>

          {/* 移动端: 保留卡片视图 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {stocksWithSignals.map((stock) => (
              <StockCard
                key={stock.symbol}
                data={stock}
                onClick={() => {
                  setSelectedStock(stock);
                }}
                showBBITrendSignal={showBBITrendSignal}
              />
            ))}
          </div>
        </>
      )}

      {/* 股票详情对话框 */}
      {selectedStock && (
        <Dialog
          open={!!selectedStock}
          onOpenChange={(open) => {
            if (!open) setSelectedStock(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedStock.name} ({selectedStock.symbol})
              </DialogTitle>
            </DialogHeader>
            <StockCard
              data={selectedStock}
              showBBITrendSignal={showBBITrendSignal}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 交易记录对话框 */}
      {selectedStock?.symbol && (
        <Dialog
          open={!!selectedStock}
          onOpenChange={(open) => {
            if (!open) setSelectedStock(null);
          }}
        >
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                交易记录 · {selectedStock.name} ({selectedStock.symbol})
              </DialogTitle>
            </DialogHeader>
            <TradeBoard
              stocks={stocksWithSignals}
              focusSymbol={selectedStock.symbol}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
