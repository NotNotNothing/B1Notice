import { StockData } from "../types/stock";
import { AlertList, AlertListRef } from "./AlertList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUpDown,
  TrendingUp,
  TrendingDown,
  Plus,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { AlertForm } from "./AlertForm";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AlertPanelProps {
  stocks: StockData[];
}

export const AlertPanel = ({ stocks }: AlertPanelProps) => {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const alertListRefs = useRef<{ [key: string]: AlertListRef }>({});

  const handleAddAlert = (stock: StockData) => {
    setSelectedStock(stock);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedStock(null);
  };

  const handleAlertSaved = (stockSymbol: string) => {
    // 刷新对应股票的AlertList
    const alertListRef = alertListRefs.current[stockSymbol];
    if (alertListRef) {
      alertListRef.fetchMonitors();
    }
  };

  const getStockToneClass = (stock: StockData) => {
    if (!stock.changePercent || stock.changePercent === 0) {
      return "border-terminal-border-default before:bg-gradient-to-br before:from-slate-100/60 before:via-white/70 before:to-white/40 dark:border-terminal-border-default dark:before:from-slate-900/40 dark:before:via-slate-900/60 dark:before:to-slate-900/30";
    }
    if (stock.changePercent > 0) {
      return "border-rose-200 before:bg-gradient-to-br before:from-rose-100/70 before:via-white/80 before:to-white/40 dark:border-rose-900/50 dark:before:from-rose-900/40 dark:before:via-slate-900/60 dark:before:to-slate-900/30";
    }
    return "border-emerald-200 before:bg-gradient-to-br before:from-emerald-100/70 before:via-white/80 before:to-white/40 dark:border-emerald-900/50 dark:before:from-emerald-900/40 dark:before:via-slate-900/60 dark:before:to-slate-900/30";
  };

  const getStockIcon = (stock: StockData) => {
    if (!stock.changePercent) return TrendingUpDown;
    if (stock.changePercent > 0) return TrendingUp;
    if (stock.changePercent < 0) return TrendingDown;
    return TrendingUpDown;
  };

  return (
    <div className="space-y-6">
      <div className="panel-shell relative overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
              Alert Design
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              让提醒规则更像一个可维护的观察面，而不是零散开关。
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              先选关键标的，再组合价格、趋势和结构条件，减少重复盯盘，也让提醒逻辑更容易回看。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Coverage
              </div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {stocks.length} 只股票可配置
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-xl border-terminal-border-default bg-white/70 px-4 text-foreground shadow-sm dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
            >
              <Settings className="mr-2 h-4 w-4" />
              批量设置
            </Button>
          </div>
        </div>
      </div>

      {stocks.length === 0 ? (
        <Card className="rounded-3xl border border-terminal-border-default bg-white/90 text-center shadow-sm backdrop-blur dark:border-terminal-border-default dark:bg-surface-panel/80">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10">
            <AlertTriangle className="h-12 w-12 text-muted-foreground dark:text-muted-foreground" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              暂无股票数据
            </h3>
            <p className="text-sm text-muted-foreground dark:text-slate-300">
              请先添加股票到监控列表，然后设置相应的指标监控规则
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {stocks.map((stock) => {
            const Icon = getStockIcon(stock);
            return (
              <Card
                key={stock.symbol}
                className={cn(
                  'relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border bg-white/82 p-4 text-slate-900 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:content-[""] sm:p-6 dark:bg-surface-panel/80 dark:text-slate-100',
                  getStockToneClass(stock),
                )}
              >
                <CardHeader className="space-y-0 p-0 pb-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          stock.changePercent && stock.changePercent > 0
                            ? "bg-rose-100/80 text-rose-600 dark:bg-rose-900/30 dark:text-rose-200"
                            : stock.changePercent && stock.changePercent < 0
                              ? "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200"
                              : "bg-surface-panel/80 text-muted-foreground dark:bg-slate-800/60 dark:text-slate-300",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            stock.changePercent && stock.changePercent > 0
                              ? "text-rose-600 dark:text-rose-200"
                              : stock.changePercent && stock.changePercent < 0
                                ? "text-emerald-600 dark:text-emerald-200"
                                : "text-muted-foreground dark:text-slate-300",
                          )}
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                          {stock.name}
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground dark:text-slate-300">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground dark:text-slate-300">
                            {stock.symbol}
                          </span>
                          {stock.price && (
                            <span className="text-xs font-medium text-foreground dark:text-slate-200">
                              ¥{stock.price.toFixed(2)}
                            </span>
                          )}
                          {stock.changePercent && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                stock.changePercent > 0
                                  ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200"
                                  : stock.changePercent < 0
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200"
                                    : "bg-surface-base text-foreground dark:bg-slate-800 dark:text-slate-300",
                              )}
                            >
                              {stock.changePercent > 0 ? "+" : ""}
                              {stock.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Dialog
                      open={
                        showDialog && selectedStock?.symbol === stock.symbol
                      }
                      onOpenChange={setShowDialog}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddAlert(stock)}
                          className="flex h-9 items-center gap-2 rounded-md border-terminal-border-default bg-white/70 px-3 text-xs font-medium text-foreground shadow-sm hover:bg-white/90 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4" />
                          <span>添加监控</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="mx-auto max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto rounded-3xl border-terminal-border-default bg-white/95 backdrop-blur dark:border-terminal-border-default dark:bg-surface-panel/95">
                        <DialogHeader>
                          <DialogTitle>添加监控规则</DialogTitle>
                          <DialogDescription>
                            为 {stock.name} ({stock.symbol}) 设置监控规则
                          </DialogDescription>
                        </DialogHeader>
                        {selectedStock && (
                          <AlertForm
                            stock={selectedStock}
                            onClose={handleCloseDialog}
                            onSaved={() =>
                              handleAlertSaved(selectedStock.symbol)
                            }
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-0">
                  <AlertList
                    symbol={stock.symbol}
                    ref={(ref) => {
                      if (ref) {
                        alertListRefs.current[stock.symbol] = ref;
                      }
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
