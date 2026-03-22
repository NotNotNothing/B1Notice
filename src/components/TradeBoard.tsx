"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TradeRecord, StopRule } from "@/types/trade";
import { StockData } from "@/types/stock";
import { useTradeRecords } from "@/hooks/useTradeRecords";
import { toast } from "sonner";
import { getBeijingDateAtTime, getBeijingNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { KLineChart } from "./KLineChart";
import { DataTable } from "./ui/data-table";
import { DataTableColumnHeader } from "./ui/data-table-column-header";
import { ColumnDef } from "@tanstack/react-table";
import { TRADE_RECORD_COLUMN_SIZES } from "@/lib/table-column-utils";
import type { ChangeEvent } from "react";

interface TradeBoardProps {
  stocks: StockData[];
  focusSymbol?: string;
}

const formatNumber = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(2);
};

const cleanCell = (raw: string) =>
  raw?.replace(/^="?/, "").replace(/"?$/, "").trim();

const normalizeSymbol = (code: string) => {
  if (!code) return code;
  const normalized = code.toUpperCase().trim();
  if (normalized.includes(".")) return normalized;
  if (normalized.length === 6) {
    if (["6", "5"].includes(normalized[0])) return `${normalized}.SH`;
    if (["0", "2", "3"].includes(normalized[0])) return `${normalized}.SZ`;
  }
  return normalized;
};

const parseTongDaXinText = (text: string): TradeRecord[] => {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const rows = lines.map((line) => line.split("\t").map(cleanCell));
  const header = rows[0] || [];
  const indexMap = {
    date: header.indexOf("发生日期"),
    business: header.indexOf("业务名称"),
    code: header.indexOf("证券代码"),
    name: header.indexOf("证券名称"),
    price: header.indexOf("成交均价"),
    quantity: header.indexOf("成交数量"),
  };

  const requiredIndexes = Object.values(indexMap).every((v) => v >= 0);
  if (!requiredIndexes) return [];

  const allowedBusiness = ["证券买入清算", "证券卖出清算"];
  const records: TradeRecord[] = [];

  rows.slice(1).forEach((cells) => {
    const business = cells[indexMap.business];
    if (!allowedBusiness.includes(business)) return;
    const date = cells[indexMap.date];
    const code = cells[indexMap.code];
    const price = Number(cells[indexMap.price] || 0);
    const qty = Number(cells[indexMap.quantity] || 0);
    if (!date || !code || !qty || !price) return;

    const name = cells[indexMap.name];
    records.push({
      id: "",
      symbol: normalizeSymbol(code),
      securityName: name,
      side: business === "证券买入清算" ? "BUY" : "SELL",
      quantity: qty,
      price,
      tradedAt: `${date} 15:00`,
      note: name ? `导入：通达信对账单（${name}）` : "导入：通达信对账单",
    });
  });

  return records;
};

const parseTongDaXinFile = async (file: File) => {
  const buffer = await file.arrayBuffer();
  let text = "";
  try {
    text = new TextDecoder("gb18030").decode(buffer);
  } catch (error) {
    console.warn("TextDecoder 不支持 gb18030，尝试 UTF-8");
    text = new TextDecoder().decode(buffer);
  }
  return parseTongDaXinText(text);
};

// 定义交易记录表格列
const useTradeRecordColumns = (
  stockMap: Map<string, StockData>
): ColumnDef<TradeRecord>[] => {
  return useMemo(
    () => [
      {
        accessorKey: "symbol",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="股票" />
        ),
        cell: ({ row }) => {
          const stock = stockMap.get(row.original.symbol);
          const displayName =
            row.original.securityName || stock?.name || row.original.symbol;
          return (
            <div className="flex flex-col">
              <span className="font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.symbol}
              </span>
            </div>
          );
        },
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.symbol.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.symbol.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.symbol.maxSize,
      },
      {
        accessorKey: "side",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="方向" />
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.side === "BUY" ? "text-red-500" : "text-emerald-500"
            }
          >
            {row.original.side === "BUY" ? "买入" : "卖出"}
          </span>
        ),
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.side.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.side.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.side.maxSize,
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="成交价" />
        ),
        cell: ({ row }) => (
          <div className="text-right">{formatNumber(row.original.price)}</div>
        ),
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.price.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.price.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.price.maxSize,
      },
      {
        accessorKey: "quantity",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="数量" />
        ),
        cell: ({ row }) => (
          <div className="text-right">{row.original.quantity}</div>
        ),
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.quantity.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.quantity.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.quantity.maxSize,
      },
      {
        accessorKey: "tradedAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="成交时间" />
        ),
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.tradedAt}
          </div>
        ),
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.tradedAt.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.tradedAt.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.tradedAt.maxSize,
      },
      {
        accessorKey: "currentPrice",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="当前价" />
        ),
        cell: ({ row }) => {
          const stock = stockMap.get(row.original.symbol);
          const currentPrice = stock?.price ?? row.original.price;
          return <div className="text-right">{formatNumber(currentPrice)}</div>;
        },
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.currentPrice.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.currentPrice.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.currentPrice.maxSize,
      },
      {
        accessorKey: "pnl",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="盈亏" />
        ),
        cell: ({ row }) => {
          const stock = stockMap.get(row.original.symbol);
          const currentPrice = stock?.price ?? row.original.price;
          const pnl =
            row.original.side === "BUY"
              ? (currentPrice - row.original.price) * row.original.quantity
              : (row.original.price - currentPrice) * row.original.quantity;
          return (
            <div className={cn("text-right font-medium", pnl >= 0 ? "text-up" : "text-down")}>
              {pnl.toFixed(2)}
            </div>
          );
        },
        enableSorting: true,
        size: TRADE_RECORD_COLUMN_SIZES.pnl.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.pnl.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.pnl.maxSize,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="状态" />
        ),
        cell: ({ row }) => (
          <div>
            {row.original.isLuZhu && (
              <Badge variant="secondary" className="text-[11px]">
                已完结
              </Badge>
            )}
          </div>
        ),
        enableSorting: false,
        size: TRADE_RECORD_COLUMN_SIZES.status.size,
        minSize: TRADE_RECORD_COLUMN_SIZES.status.minSize,
        maxSize: TRADE_RECORD_COLUMN_SIZES.status.maxSize,
      },
    ],
    [stockMap]
  );
};

export const TradeBoard = ({ stocks, focusSymbol }: TradeBoardProps) => {
  const { records, addRecord, removeRecord, importRecords, updateRecord } =
    useTradeRecords();
  const [filterSymbol, setFilterSymbol] = useState("");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState("");
  const [tradedAt, setTradedAt] = useState("");
  const [note, setNote] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [stopRule, setStopRule] = useState<StopRule | undefined>(undefined);
  const [excelImporting, setExcelImporting] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const [hasPushDeer, setHasPushDeer] = useState(false);
  const silentWarned = useRef(false);
  const watchedSymbols = useRef<Set<string>>(new Set());

  const stockMap = useMemo(() => {
    const map = new Map<string, StockData>();
    stocks.forEach((stock) => map.set(stock.symbol, stock));
    return map;
  }, [stocks]);

  // 获取表格列定义
  const columns = useTradeRecordColumns(stockMap);

  const chartSymbol = useMemo(() => {
    const focus = focusSymbol ? normalizeSymbol(focusSymbol) : "";
    if (focus) return focus;
    const candidate = normalizeSymbol(filterSymbol.trim());
    if (!candidate) return "";
    if (stockMap.has(candidate)) return candidate;
    if (records.some((record) => record.symbol === candidate)) return candidate;
    return "";
  }, [focusSymbol, filterSymbol, stockMap, records]);

  useEffect(() => {
    if (focusSymbol) {
      setFilterSymbol(focusSymbol.toUpperCase());
    }
  }, [focusSymbol]);

  useEffect(() => {
    watchedSymbols.current = new Set(stocks.map((s) => s.symbol));
  }, [stocks]);

  const ensureWatch = useCallback(async (symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (watchedSymbols.current.has(normalized)) return;
    watchedSymbols.current.add(normalized);
    const [, market] = normalized.split(".");
    try {
      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: normalized,
          market: market || "",
        }),
      });
      if (!response.ok) {
        throw new Error("自动关注失败");
      }
      toast.success(`已自动关注 ${normalized}`);
    } catch (error) {
      console.error("自动关注失败", error);
      watchedSymbols.current.delete(normalized);
      toast.error(`关注 ${normalized} 失败`);
    }
  }, []);

  const resetForm = () => {
    setSymbol("");
    setPrice("");
    setTradedAt("");
    setNote("");
    setSecurityName("");
    setStopLossPrice("");
    setTakeProfitPrice("");
    setStopRule(undefined);
    setSide("BUY");
    setQuantity(100);
  };

  const handleSubmit = async () => {
    if (!symbol || !price || !tradedAt) {
      toast.error("请填写必填字段：代码 / 价格 / 日期时间");
      return;
    }

    const record: TradeRecord = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase(),
      securityName:
        securityName.trim() || stockMap.get(symbol.trim().toUpperCase())?.name,
      side,
      quantity,
      price: Number(price),
      tradedAt,
      note,
      stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
      takeProfitPrice: takeProfitPrice ? Number(takeProfitPrice) : undefined,
      stopRule,
    };

    const added = await addRecord(record);
    if (added) {
      toast.success("已添加交易记录");
      resetForm();
    } else {
      toast.info("记录已存在，未重复添加");
    }
    ensureWatch(record.symbol);
  };

  const handleExcelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setExcelImporting(true);
    try {
      const parsed = await parseTongDaXinFile(file);
      if (!parsed.length) {
        toast.error("未解析到交易数据，确认文件为通达信对账单");
        return;
      }
      const uniqueSymbols = Array.from(new Set(parsed.map((p) => p.symbol)));
      uniqueSymbols.forEach(ensureWatch);
      const { added, success, message } = await importRecords(parsed);
      if (!success) {
        toast.error(message || "导入失败，请重试");
      } else if (added === 0) {
        toast.info("没有新记录，已全部去重");
      } else {
        toast.success(`通达信导入完成，新增 ${added} 条记录（已自动去重）`);
      }
    } catch (error) {
      console.error("通达信导入失败", error);
      toast.error("通达信对账单解析失败");
    } finally {
      setExcelImporting(false);
      event.target.value = "";
    }
  };

  const sendPushDeer = useCallback(
    async (title: string, desp: string) => {
      if (!hasPushDeer) {
        if (!silentWarned.current) {
          toast.error("未配置 PushDeer Key，无法发送推送");
          silentWarned.current = true;
        }
        return;
      }
      try {
        const response = await fetch("/api/user/pushdeer/trade-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, desp }),
        });
        if (!response.ok) {
          throw new Error("PushDeer 推送失败");
        }
      } catch (error) {
        console.error("PushDeer 推送失败", error);
        toast.error("PushDeer 推送失败");
      }
    },
    [hasPushDeer],
  );

  useEffect(() => {
    const fetchPushKey = async () => {
      try {
        const res = await fetch("/api/user/pushdeer");
        if (!res.ok) return;
        const data = await res.json();
        setHasPushDeer(!!data.pushDeerKey);
      } catch (error) {
        console.error("获取 PushDeer Key 失败", error);
      }
    };
    fetchPushKey();
  }, []);

  useEffect(() => {
    const checkCloseAlert = () => {
      const now = getBeijingNow();
      const close = getBeijingDateAtTime(now, 15, 0, 0); // 统一使用北京时间收盘 15:00
      if (now > close) return;
      const minutesToClose = (close.getTime() - now.getTime()) / 60000;
      if (minutesToClose > 10 || minutesToClose < 0) return;

      records.forEach((record) => {
        if (record.isLuZhu) return; // 已完结的订单不再提醒
        if (notifiedIds.current.has(record.id)) return;
        const stock = stockMap.get(record.symbol);
        const currentPrice = stock?.price ?? record.price;
        let reason = "";

        if (record.stopLossPrice && currentPrice <= record.stopLossPrice) {
          reason = `跌破止损价 ${formatNumber(record.stopLossPrice)}`;
        } else if (
          record.stopRule === "whiteLine" &&
          stock?.zhixingTrend &&
          currentPrice <= stock.zhixingTrend.whiteLine
        ) {
          reason = `跌破白线 ${formatNumber(stock.zhixingTrend.whiteLine)}`;
        } else if (
          record.stopRule === "yellowLine" &&
          stock?.zhixingTrend &&
          currentPrice <= stock.zhixingTrend.yellowLine
        ) {
          reason = `跌破黄线 ${formatNumber(stock.zhixingTrend.yellowLine)}`;
        } else if (
          record.takeProfitPrice &&
          currentPrice >= record.takeProfitPrice
        ) {
          reason = `触发止盈价 ${formatNumber(record.takeProfitPrice)}`;
        }

        if (reason) {
          notifiedIds.current.add(record.id);
          const title = `${record.symbol} 需处理：${reason}`;
          const desp = [
            `- 成交价：${formatNumber(record.price)} 数量：${record.quantity}`,
            `- 当前价：${formatNumber(currentPrice)}`,
            record.stopLossPrice
              ? `- 止损价：${formatNumber(record.stopLossPrice)}`
              : null,
            record.takeProfitPrice
              ? `- 止盈价：${formatNumber(record.takeProfitPrice)}`
              : null,
            record.stopRule === "whiteLine" && stock?.zhixingTrend
              ? `- 白线：${formatNumber(stock.zhixingTrend.whiteLine)}`
              : null,
            record.stopRule === "yellowLine" && stock?.zhixingTrend
              ? `- 黄线：${formatNumber(stock.zhixingTrend.yellowLine)}`
              : null,
            `- 方向：${record.side === "BUY" ? "买入" : "卖出"}`,
            record.note ? `- 备注：${record.note}` : null,
          ]
            .filter(Boolean)
            .join("\n");

          sendPushDeer(title, desp);
        }
      });
    };

    const timer = setInterval(checkCloseAlert, 60 * 1000);
    checkCloseAlert();
    return () => clearInterval(timer);
  }, [records, sendPushDeer, stockMap]);

  return (
    <section className="space-y-4">
      {/* 头部：标题与筛选 */}
      <div className="rounded-lg border border-terminal-border-default bg-surface-panel p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">交易记录中心</h3>
            <p className="text-sm text-muted-foreground">
              导入、记录并跟踪每笔订单，收盘前 10 分钟自动提醒需处理的单子
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="按股票过滤（如 600570 或 600570.SH）"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="w-64"
            />
            <Badge variant="outline" className="text-xs">
              本地存储
            </Badge>
          </div>
        </div>
      </div>

      {/* K线图容器 */}
      <div className="rounded-lg border border-terminal-border-default bg-surface-panel p-4 shadow-sm">
        <KLineChart symbol={chartSymbol} records={records} />
      </div>

      {/* 两列布局：录入区 + 导入区 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 交易录入区 */}
        <div className="rounded-lg border border-terminal-border-default bg-surface-panel p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold">新增/编辑交易</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="代码（如 600519.SH）"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <div className="flex items-center gap-1 rounded-md border border-terminal-border-default bg-surface-base p-1">
                <Button
                  type="button"
                  variant={side === "BUY" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSide("BUY")}
                >
                  买入
                </Button>
                <Button
                  type="button"
                  variant={side === "SELL" ? "destructive" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSide("SELL")}
                >
                  卖出
                </Button>
              </div>
              <Input
                type="number"
                placeholder="数量"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="成交价"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                placeholder="证券名称（可选）"
                value={securityName}
                onChange={(e) => setSecurityName(e.target.value)}
              />
              <Input
                type="datetime-local"
                placeholder="成交时间"
                value={tradedAt}
                onChange={(e) => setTradedAt(e.target.value)}
              />
              <Input
                placeholder="备注（可选）"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="col-span-2"
              />
              <Input
                type="number"
                placeholder="止损价（可选）"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder="止盈价（可选）"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(e.target.value)}
              />
            </div>
            <Tabs
              value={stopRule || "none"}
              onValueChange={(value) =>
                setStopRule(value === "none" ? undefined : (value as StopRule))
              }
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="none" className="text-xs">
                  不跟随均线
                </TabsTrigger>
                <TabsTrigger value="whiteLine" className="text-xs">
                  跌破白线止损
                </TabsTrigger>
                <TabsTrigger value="yellowLine" className="text-xs">
                  跌破黄线止损
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button onClick={handleSubmit} className="mt-4 w-full">
            保存记录
          </Button>
        </div>

        {/* 通达信导入区 */}
        <div className="rounded-lg border border-terminal-border-default bg-surface-panel p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold">对账单导入</h4>
          <div className="space-y-3 rounded-lg border border-terminal-border-subtle bg-surface-base p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>通达信对账单（.xls/.txt）</span>
              <Badge variant="info" className="text-xs">
                自动去重 + 自动关注
              </Badge>
            </div>
            <label className="block cursor-pointer rounded-md border border-terminal-border-default bg-surface-panel px-4 py-3 text-sm transition hover:border-terminal-border-emphasis">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  选择文件
                </span>
                <span className="text-muted-foreground">
                  {excelImporting ? "导入中..." : "点击选择文件"}
                </span>
              </div>
              <Input
                type="file"
                accept=".xls,.txt"
                onChange={handleExcelImport}
                disabled={excelImporting}
                className="mt-2 hidden"
              />
            </label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              仅提取”证券买入清算/证券卖出清算”，编码自动识别 GB18030 /
              UTF-8，导入后自动去重并把未关注的股票加入关注列表
            </p>
          </div>
        </div>
      </div>

      {/* 交易记录列表 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">最近交易</h4>

        {records.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-terminal-border-default bg-surface-panel text-sm text-muted-foreground">
            暂无记录，先添加或导入吧
          </div>
        ) : (
          <>
            {/* PC 端：表格 */}
            <div className="hidden lg:block">
              <DataTable
                columns={columns}
                data={records.filter((record) => {
                  if (!filterSymbol.trim()) return true;
                  const key = filterSymbol.trim().toUpperCase();
                  return (
                    record.symbol.toUpperCase().includes(key) ||
                    (record.securityName || "").toUpperCase().includes(key)
                  );
                })}
                searchKey="symbol"
                searchPlaceholder="搜索股票代码或名称..."
                pageSize={20}
              />
            </div>

            {/* 移动端：卡片 */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 lg:hidden">
              {records
                .filter((record) => {
                  if (!filterSymbol.trim()) return true;
                  const key = filterSymbol.trim().toUpperCase();
                  return (
                    record.symbol.toUpperCase().includes(key) ||
                    (record.securityName || "").toUpperCase().includes(key)
                  );
                })
                .map((record) => {
                const stock = stockMap.get(record.symbol);
                const currentPrice = stock?.price ?? record.price;
                const pnl =
                  record.side === "BUY"
                    ? (currentPrice - record.price) * record.quantity
                    : (record.price - currentPrice) * record.quantity;
                const handleStopChange = (
                  field: "stopLossPrice" | "takeProfitPrice",
                  value: string,
                ) => {
                  updateRecord(record.id, (prev) => ({
                    ...prev,
                    [field]: value ? Number(value) : undefined,
                  }));
                };

                const handleStopRuleChange = (value: StopRule | undefined) => {
                  updateRecord(record.id, (prev) => ({
                    ...prev,
                    stopRule: value,
                  }));
                };

                const displayName =
                  record.securityName ||
                  stock?.name ||
                  record.note?.replace(/导入：通达信对账单（(.+)）/, "$1");

                const toggleLuZhu = () => {
                  updateRecord(record.id, (prev) => ({
                    ...prev,
                    isLuZhu: !prev.isLuZhu,
                  }));
                };

                return (
                  <div
                    key={record.id}
                    className="rounded-lg border border-terminal-border-default bg-surface-panel p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.tradedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.isLuZhu && (
                          <Badge variant="secondary" className="text-[11px]">
                            卤煮 · 已完结
                          </Badge>
                        )}
                        <Badge
                          variant={
                            record.side === "BUY" ? "success" : "destructive"
                          }
                          className="text-xs"
                        >
                          {record.side === "BUY" ? "买入" : "卖出"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-surface-base p-2">
                        <p className="text-[11px] text-muted-foreground">
                          成交价 / 数量
                        </p>
                        <p className="font-semibold">
                          {formatNumber(record.price)} · {record.quantity}
                        </p>
                      </div>
                      <div className="rounded-md bg-surface-base p-2">
                        <p className="text-[11px] text-muted-foreground">
                          当前价 / 盈亏
                        </p>
                        <p
                          className={cn(
                            "font-semibold",
                            pnl >= 0 ? "text-up" : "text-down",
                          )}
                        >
                          {formatNumber(currentPrice)} · {pnl.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {record.stopLossPrice && (
                        <span className="rounded-full bg-down-bg px-2 py-1 text-down">
                          止损 {formatNumber(record.stopLossPrice)}
                        </span>
                      )}
                      {record.takeProfitPrice && (
                        <span className="rounded-full bg-task-pending-bg px-2 py-1 text-task-pending">
                          止盈 {formatNumber(record.takeProfitPrice)}
                        </span>
                      )}
                      {record.stopRule === "whiteLine" && (
                        <span className="rounded-full bg-alert-info-bg px-2 py-1 text-alert-info">
                          跌破白线止损
                        </span>
                      )}
                      {record.stopRule === "yellowLine" && (
                        <span className="rounded-full bg-alert-info-bg px-2 py-1 text-alert-info">
                          跌破黄线止损
                        </span>
                      )}
                      {record.note && (
                        <span className="rounded-full bg-surface-base px-2 py-1 text-muted-foreground">
                          {record.note}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          止损价
                        </p>
                        <Input
                          type="number"
                          value={record.stopLossPrice ?? ""}
                          onChange={(e) =>
                            handleStopChange("stopLossPrice", e.target.value)
                          }
                          placeholder="未设置"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          止盈价
                        </p>
                        <Input
                          type="number"
                          value={record.takeProfitPrice ?? ""}
                          onChange={(e) =>
                            handleStopChange("takeProfitPrice", e.target.value)
                          }
                          placeholder="未设置"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          均线止损
                        </p>
                        <Tabs
                          value={record.stopRule || "none"}
                          onValueChange={(val) =>
                            handleStopRuleChange(
                              val === "none" ? undefined : (val as StopRule),
                            )
                          }
                          className="w-full"
                        >
                          <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="none" className="text-[11px]">
                              无
                            </TabsTrigger>
                            <TabsTrigger
                              value="whiteLine"
                              className="rounded-md text-[11px]"
                            >
                              白线
                            </TabsTrigger>
                            <TabsTrigger
                              value="yellowLine"
                              className="text-[11px]"
                            >
                              黄线
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {record.side === "BUY" && (
                        <Button
                          size="sm"
                          variant={record.isLuZhu ? "outline" : "secondary"}
                          className="text-[12px]"
                          onClick={toggleLuZhu}
                        >
                          {record.isLuZhu ? "恢复进行中" : "标记为卤煮"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-down hover:bg-down-bg"
                        onClick={() => removeRecord(record.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
