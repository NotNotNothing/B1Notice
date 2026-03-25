CREATE TABLE "MarketScreeningRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "market" TEXT NOT NULL,
    "tradeDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalSymbols" INTEGER NOT NULL DEFAULT 0,
    "snapshotCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "MarketScreeningSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "changePercent" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "dailyK" REAL NOT NULL,
    "dailyD" REAL NOT NULL,
    "dailyJ" REAL NOT NULL,
    "weeklyJ" REAL NOT NULL,
    "bbi" REAL NOT NULL,
    "aboveBBIConsecutiveDaysCount" INTEGER NOT NULL,
    "belowBBIConsecutiveDaysCount" INTEGER NOT NULL,
    "volumeRatio" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScreeningSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketScreeningRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MarketScreeningResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScreeningResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MarketScreeningRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketScreeningResult_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MarketScreeningSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MarketScreeningResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "TradeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "securityName" TEXT,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "tradedAt" DATETIME NOT NULL,
    "note" TEXT,
    "stopLossPrice" REAL,
    "takeProfitPrice" REAL,
    "stopRule" TEXT,
    "isLuZhu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MarketScreeningRun_market_tradeDate_key" ON "MarketScreeningRun"("market", "tradeDate");
CREATE INDEX "MarketScreeningRun_tradeDate_idx" ON "MarketScreeningRun"("tradeDate");
CREATE UNIQUE INDEX "MarketScreeningSnapshot_runId_symbol_key" ON "MarketScreeningSnapshot"("runId", "symbol");
CREATE INDEX "MarketScreeningSnapshot_symbol_idx" ON "MarketScreeningSnapshot"("symbol");
CREATE INDEX "MarketScreeningSnapshot_runId_idx" ON "MarketScreeningSnapshot"("runId");
CREATE UNIQUE INDEX "MarketScreeningResult_runId_userId_symbol_key" ON "MarketScreeningResult"("runId", "userId", "symbol");
CREATE INDEX "MarketScreeningResult_userId_createdAt_idx" ON "MarketScreeningResult"("userId", "createdAt");
CREATE INDEX "TradeRecord_userId_symbol_idx" ON "TradeRecord"("userId", "symbol");
CREATE UNIQUE INDEX "TradeRecord_userId_symbol_side_price_quantity_tradedAt_key" ON "TradeRecord"("userId", "symbol", "side", "price", "quantity", "tradedAt");
