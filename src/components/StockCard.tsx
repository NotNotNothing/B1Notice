import { useState, type MouseEvent } from "react";
import { StockData } from "../types/stock";
import { TrendingUp, TrendingDown, ChevronDown, Activity } from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatBeijingDateTime } from "@/lib/time";

interface StockCardProps {
  data: StockData;
  onClick?: () => void;
  showBBITrendSignal?: boolean;
}

export const StockCard = ({
  data,
  onClick,
  showBBITrendSignal = true,
}: StockCardProps) => {
  const [expandedSignal, setExpandedSignal] = useState<"buy" | "sell" | null>(
    null,
  );

  const isPositive = (data.changePercent ?? 0) >= 0;
  const zhixingTrend = data.zhixingTrend;

  const zhixingStatus = zhixingTrend
    ? zhixingTrend.isGoldenCross
      ? {
          label: "金叉确认",
          description: "白线上穿主力成本线，重点关注放量确认",
          badgeClass:
            "border-amber-400/50 bg-gradient-to-r from-amber-50 via-amber-100 to-orange-50 text-amber-900 shadow-sm dark:from-amber-950/40 dark:via-amber-900/30 dark:to-orange-950/40 dark:text-amber-200",
        }
      : zhixingTrend.isDeathCross
        ? {
            label: "死叉预警",
            description: "白线跌破主力成本线，警惕趋势破坏",
            badgeClass:
              "border-slate-300/50 bg-gradient-to-r from-slate-50 via-slate-100 to-zinc-50 text-slate-800 shadow-sm dark:from-slate-950/40 dark:via-slate-900/30 dark:to-zinc-950/40 dark:text-slate-200",
          }
        : zhixingTrend.whiteLine > zhixingTrend.yellowLine
          ? {
              label: "多头结构",
              description: "白线维持在成本线上方，多头趋势延续",
              badgeClass:
                "border-rose-400/50 bg-gradient-to-r from-rose-50 via-red-50 to-pink-50 text-rose-900 shadow-sm dark:from-rose-950/40 dark:via-red-900/30 dark:to-pink-950/40 dark:text-rose-200",
            }
          : {
              label: "空头结构",
              description: "白线位于成本线下方，保持防守",
              badgeClass:
                "border-emerald-400/50 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 text-emerald-900 shadow-sm dark:from-emerald-950/40 dark:via-green-900/30 dark:to-teal-950/40 dark:text-emerald-200",
            }
    : null;

  const buySignal = data.buySignal;
  const sellSignal = data.sellSignal;
  const showBuySignal = !!buySignal?.hasBuySignal;
  const showSellSignal = !!sellSignal?.hasSellSignal;
  const showBbiSection = !!data.bbi && showBBITrendSignal;
  const bbi = data.bbi;
  const buySignalThreshold = buySignal?.jThreshold ?? 20;

  const toggleSignal = (
    type: "buy" | "sell",
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    setExpandedSignal((prev) => (prev === type ? null : type));
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl border-2 p-5 shadow-sm transition-all duration-300 hover:shadow-xl",
        isPositive
          ? "border-rose-200/60 bg-gradient-to-br from-rose-50/30 via-red-50/20 to-white hover:border-rose-300 dark:from-rose-950/20 dark:via-red-950/10 dark:to-slate-900 dark:hover:border-rose-700"
          : "border-emerald-200/60 bg-gradient-to-br from-emerald-50/30 via-green-50/20 to-white hover:border-emerald-300 dark:from-emerald-950/20 dark:via-green-950/10 dark:to-slate-900 dark:hover:border-emerald-700",
      )}
    >
      {/* 顶部信息 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tracking-wide text-slate-600 dark:text-slate-400">
              {data.symbol}
            </span>
            {data.market && (
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
              >
                {data.market}
              </Badge>
            )}
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {data.name}
          </h3>
          {data.updatedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatBeijingDateTime(data.updatedAt, {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </p>
          )}
        </div>

        {/* 涨跌幅标签 */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 shadow-sm transition-all",
            isPositive
              ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-rose-200/50 dark:shadow-rose-900/30"
              : "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200/50 dark:shadow-emerald-900/30",
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="text-base font-bold">
            {(data.changePercent ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 价格和指标 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0 space-y-1.5 sm:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            当前价格
          </p>
          <p
            className={cn(
              "text-3xl font-bold tracking-tight",
              isPositive
                ? "bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent dark:from-rose-400 dark:to-red-400"
                : "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-green-400",
            )}
          >
            ¥{(data.price ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              白线（短期）
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {zhixingTrend ? zhixingTrend.whiteLine.toFixed(2) : "--"}
            </p>
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              黄线（长期）
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {zhixingTrend ? zhixingTrend.yellowLine.toFixed(2) : "--"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:col-span-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              日线J值
            </p>
            <p
              className={cn(
                "text-xl font-bold tracking-tight",
                data.kdj?.j !== undefined && data.kdj.j < -5
                  ? "bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent dark:from-rose-400 dark:to-red-400"
                  : data.kdj?.j !== undefined && data.kdj.j < 20
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400"
                    : "text-slate-900 dark:text-slate-100",
              )}
            >
              {data.kdj ? data.kdj.j.toFixed(2) : "--"}
            </p>
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              周线J值
            </p>
            <p
              className={cn(
                "text-xl font-bold tracking-tight",
                data.weeklyKdj?.j !== undefined && data.weeklyKdj.j < -5
                  ? "bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent dark:from-rose-400 dark:to-red-400"
                  : data.weeklyKdj?.j !== undefined && data.weeklyKdj.j < 20
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400"
                    : "text-slate-900 dark:text-slate-100",
              )}
            >
              {data.weeklyKdj ? data.weeklyKdj.j.toFixed(2) : "--"}
            </p>
          </div>
        </div>
      </div>

      {/* 信号标签 */}
      {(zhixingStatus || showSellSignal) && (
        <div className="flex flex-wrap gap-2">
          {zhixingStatus && (
            <Badge
              className={cn(
                "border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm",
                zhixingStatus.badgeClass,
              )}
            >
              <Activity className="mr-1.5 h-3 w-3" />
              {zhixingStatus.label}
            </Badge>
          )}
          {showSellSignal && (
            <Badge className="border border-emerald-300/50 bg-gradient-to-r from-emerald-100 via-green-100 to-teal-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm dark:from-emerald-950/50 dark:via-green-950/40 dark:to-teal-950/50 dark:text-emerald-200">
              <TrendingDown className="mr-1.5 h-3 w-3" />
              卖出信号
            </Badge>
          )}
        </div>
      )}

      {/* BBI 趋势 */}
      {showBbiSection && !showBuySignal && bbi && (
        <div
          className={cn(
            "rounded-xl border-2 p-4 shadow-sm backdrop-blur-sm transition-all",
            bbi.aboveBBIConsecutiveDays
              ? "border-rose-300/60 bg-gradient-to-br from-rose-50/50 via-red-50/30 to-pink-50/40 dark:border-rose-700/40 dark:from-rose-950/30 dark:via-red-950/20 dark:to-pink-950/25"
              : bbi.belowBBIConsecutiveDays
                ? "border-emerald-300/60 bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/40 dark:border-emerald-700/40 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/25"
                : "border-slate-200/60 bg-slate-50/50 dark:border-slate-700/40 dark:bg-slate-900/30",
          )}
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/40">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              BBI {bbi.bbi.toFixed(2)}
            </span>
            {bbi.aboveBBIConsecutiveDays && (
              <Badge className="border-rose-300 bg-gradient-to-r from-rose-100 to-red-100 px-2.5 py-1 text-xs font-semibold text-rose-900 dark:border-rose-700 dark:from-rose-950/60 dark:to-red-950/60 dark:text-rose-200">
                连续{bbi.aboveBBIConsecutiveDaysCount || 2}日站上BBI
              </Badge>
            )}
            {bbi.belowBBIConsecutiveDays && (
              <Badge className="border-emerald-300 bg-gradient-to-r from-emerald-100 to-green-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-700 dark:from-emerald-950/60 dark:to-green-950/60 dark:text-emerald-200">
                连续{bbi.belowBBIConsecutiveDaysCount || 2}日跌破BBI
              </Badge>
            )}
            {!bbi.aboveBBIConsecutiveDays && !bbi.belowBBIConsecutiveDays && (
              <Badge className="border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                趋势平衡
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[bbi.ma3, bbi.ma6, bbi.ma12, bbi.ma24].map((ma, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200/60 bg-white/60 p-2.5 text-center shadow-sm backdrop-blur-sm dark:border-slate-700/40 dark:bg-slate-800/60"
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  MA{[3, 6, 12, 24][idx]}
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {ma.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 卖出信号提示 */}
      {showSellSignal && sellSignal && (
        <div className="rounded-xl border-2 border-emerald-300/60 bg-gradient-to-br from-emerald-50/50 via-green-50/40 to-teal-50/30 shadow-sm backdrop-blur-sm transition-all dark:border-emerald-700/40 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-teal-950/20">
          <button
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
            onClick={(event) => toggleSignal("sell", event)}
          >
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/50" />
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                ⚠️ 卖出信号
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                连续{sellSignal.consecutiveDaysBelowWhiteLine}日低于白线
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-emerald-600 transition-transform duration-300 dark:text-emerald-400",
                  expandedSignal === "sell" && "rotate-180",
                )}
              />
            </div>
          </button>

          {expandedSignal === "sell" && (
            <div className="space-y-3 border-t border-emerald-200/60 p-4 dark:border-emerald-700/40">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sellSignal.lastTwoDaysData.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-xl border-2 p-3 shadow-sm backdrop-blur-sm transition-all",
                      day.belowWhiteLine
                        ? "border-emerald-300/60 bg-gradient-to-br from-emerald-50/60 to-green-50/40 dark:border-emerald-700/50 dark:from-emerald-950/50 dark:to-green-950/30"
                        : "border-slate-200/60 bg-white/60 dark:border-slate-700/50 dark:bg-slate-800/50",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {(() => {
                          try {
                            if (!day.date) return "未知日期";
                            let date: Date;
                            if (typeof day.date === "string") {
                              date = day.date.match(/^\d+$/)
                                ? new Date(parseInt(day.date))
                                : new Date(day.date);
                            } else {
                              date = new Date(day.date);
                            }
                            return isNaN(date.getTime())
                              ? "日期无效"
                              : format(date, "MM-dd", { locale: zhCN });
                          } catch (error) {
                            return "格式错误";
                          }
                        })()}
                      </span>
                      <Badge
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-semibold",
                          day.belowWhiteLine
                            ? "border-emerald-300 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-900 dark:border-emerald-700 dark:from-emerald-900/60 dark:to-green-900/60 dark:text-emerald-200"
                            : "border-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 dark:border-amber-700 dark:from-amber-900/60 dark:to-orange-900/60 dark:text-amber-200",
                        )}
                      >
                        {day.belowWhiteLine ? "低于白线" : "高于白线"}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          价格
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {day.price.toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          白线
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {day.whiteLine.toFixed(2)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-emerald-300/60 bg-gradient-to-r from-emerald-100/60 to-green-100/40 p-3 dark:border-emerald-700/50 dark:from-emerald-950/50 dark:to-green-950/30">
                <p className="mb-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  操作建议：
                </p>
                <ul className="space-y-1 text-xs text-emerald-800 dark:text-emerald-300">
                  <li>• 考虑分批减仓或清仓</li>
                  <li>• 密切关注后续走势</li>
                  <li>• 严格执行风控纪律</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 买入信号提示 */}
      {showBuySignal && buySignal && (
        <div className="rounded-xl border-2 border-blue-300/60 bg-gradient-to-br from-blue-50/50 via-indigo-50/40 to-cyan-50/30 shadow-sm backdrop-blur-sm transition-all dark:border-blue-700/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-cyan-950/20">
          <button
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
            onClick={(event) => toggleSignal("buy", event)}
          >
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/50" />
              <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
                💡 买入信号
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-700 dark:text-blue-300">
                J值{buySignal.jValue.toFixed(2)} &lt; 阈值
                {buySignalThreshold.toFixed(2)}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-blue-600 transition-transform duration-300 dark:text-blue-400",
                  expandedSignal === "buy" && "rotate-180",
                )}
              />
            </div>
          </button>

          {expandedSignal === "buy" && (
            <div className="space-y-3 border-t border-blue-200/60 p-4 dark:border-blue-700/40">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "价格>黄线",
                    condition: buySignal.conditions.priceAboveYellow,
                    value: `${buySignal.price.toFixed(2)} > ${buySignal.yellowLine.toFixed(2)}`,
                  },
                  {
                    label: "白线>黄线",
                    condition: buySignal.conditions.whiteAboveYellow,
                    value: `${buySignal.whiteLine.toFixed(2)} > ${buySignal.yellowLine.toFixed(2)}`,
                  },
                  {
                    label: "J值<阈值",
                    condition: buySignal.conditions.jBelowThreshold,
                    value: `${buySignal.jValue.toFixed(2)} < ${buySignalThreshold.toFixed(2)}`,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border-2 p-3 shadow-sm backdrop-blur-sm transition-all",
                      item.condition
                        ? "border-blue-300/60 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:border-blue-700/50 dark:from-blue-950/50 dark:to-indigo-950/30"
                        : "border-slate-200/60 bg-white/60 dark:border-slate-700/50 dark:bg-slate-800/50",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-center gap-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {item.label}
                      </span>
                      <Badge
                        className={cn(
                          "px-2 py-0.5 text-[11px] font-semibold",
                          item.condition
                            ? "border-blue-300 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 dark:border-blue-700 dark:from-blue-900/60 dark:to-indigo-900/60 dark:text-blue-200"
                            : "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                        )}
                      >
                        {item.condition ? "✓" : "✗"}
                      </Badge>
                    </div>
                    <div className="text-center text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-blue-300/60 bg-gradient-to-r from-blue-100/60 to-indigo-100/40 p-3 dark:border-blue-700/50 dark:from-blue-950/50 dark:to-indigo-950/30">
                <p className="mb-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  操作建议：
                </p>
                <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
                  <li>• 可考虑分批建仓</li>
                  <li>• 严格控制仓位</li>
                  <li>• 设置好止损点</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
