-- CreateTable
CREATE TABLE "ZhixingTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "whiteLine" REAL NOT NULL,
    "yellowLine" REAL NOT NULL,
    "previousWhiteLine" REAL NOT NULL,
    "previousYellowLine" REAL NOT NULL,
    "isGoldenCross" BOOLEAN NOT NULL DEFAULT false,
    "isDeathCross" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ZhixingTrend_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for the new table
CREATE INDEX "ZhixingTrend_stockId_date_idx" ON "ZhixingTrend"("stockId", "date");
CREATE UNIQUE INDEX "ZhixingTrend_stockId_key" ON "ZhixingTrend"("stockId");

-- Redefine Quote table to include ZhixingTrend relation
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "changePercent" REAL NOT NULL,
    "dailyKdjId" TEXT,
    "weeklyKdjId" TEXT,
    "bbiId" TEXT,
    "zhixingTrendId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_dailyKdjId_fkey" FOREIGN KEY ("dailyKdjId") REFERENCES "Kdj" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_weeklyKdjId_fkey" FOREIGN KEY ("weeklyKdjId") REFERENCES "Kdj" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_bbiId_fkey" FOREIGN KEY ("bbiId") REFERENCES "Bbi" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_zhixingTrendId_fkey" FOREIGN KEY ("zhixingTrendId") REFERENCES "ZhixingTrend" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" (
    "id",
    "stockId",
    "price",
    "volume",
    "changePercent",
    "dailyKdjId",
    "weeklyKdjId",
    "bbiId",
    "zhixingTrendId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "stockId",
    "price",
    "volume",
    "changePercent",
    "dailyKdjId",
    "weeklyKdjId",
    "bbiId",
    NULL,
    "createdAt",
    "updatedAt"
FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_stockId_idx" ON "Quote"("stockId");
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");
CREATE UNIQUE INDEX "Quote_stockId_key" ON "Quote"("stockId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
