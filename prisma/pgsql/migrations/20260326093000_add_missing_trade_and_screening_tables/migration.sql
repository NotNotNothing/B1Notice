-- CreateTable
CREATE TABLE "MarketScreeningRun" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalSymbols" INTEGER NOT NULL DEFAULT 0,
    "snapshotCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketScreeningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketScreeningSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "dailyK" DOUBLE PRECISION NOT NULL,
    "dailyD" DOUBLE PRECISION NOT NULL,
    "dailyJ" DOUBLE PRECISION NOT NULL,
    "weeklyJ" DOUBLE PRECISION NOT NULL,
    "bbi" DOUBLE PRECISION NOT NULL,
    "aboveBBIConsecutiveDaysCount" INTEGER NOT NULL,
    "belowBBIConsecutiveDaysCount" INTEGER NOT NULL,
    "volumeRatio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScreeningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketScreeningResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScreeningResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "securityName" TEXT,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "tradedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "stopLossPrice" DOUBLE PRECISION,
    "takeProfitPrice" DOUBLE PRECISION,
    "stopRule" TEXT,
    "isLuZhu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketScreeningRun_market_tradeDate_key" ON "MarketScreeningRun"("market", "tradeDate");
CREATE INDEX "MarketScreeningRun_tradeDate_idx" ON "MarketScreeningRun"("tradeDate");
CREATE UNIQUE INDEX "MarketScreeningSnapshot_runId_symbol_key" ON "MarketScreeningSnapshot"("runId", "symbol");
CREATE INDEX "MarketScreeningSnapshot_symbol_idx" ON "MarketScreeningSnapshot"("symbol");
CREATE INDEX "MarketScreeningSnapshot_runId_idx" ON "MarketScreeningSnapshot"("runId");
CREATE UNIQUE INDEX "MarketScreeningResult_runId_userId_symbol_key" ON "MarketScreeningResult"("runId", "userId", "symbol");
CREATE INDEX "MarketScreeningResult_userId_createdAt_idx" ON "MarketScreeningResult"("userId", "createdAt");
CREATE INDEX "TradeRecord_userId_symbol_idx" ON "TradeRecord"("userId", "symbol");
CREATE UNIQUE INDEX "TradeRecord_userId_symbol_side_price_quantity_tradedAt_key" ON "TradeRecord"("userId", "symbol", "side", "price", "quantity", "tradedAt");

-- AddForeignKey
ALTER TABLE "MarketScreeningSnapshot" ADD CONSTRAINT "MarketScreeningSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketScreeningRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketScreeningResult" ADD CONSTRAINT "MarketScreeningResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketScreeningRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketScreeningResult" ADD CONSTRAINT "MarketScreeningResult_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MarketScreeningSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketScreeningResult" ADD CONSTRAINT "MarketScreeningResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TradeRecord" ADD CONSTRAINT "TradeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
