-- CreateTable
CREATE TABLE "Bbi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "bbi" REAL NOT NULL,
    "ma3" REAL NOT NULL,
    "ma6" REAL NOT NULL,
    "ma12" REAL NOT NULL,
    "ma24" REAL NOT NULL,
    "aboveBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "belowBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bbi_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_dailyKdjId_fkey" FOREIGN KEY ("dailyKdjId") REFERENCES "Kdj" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_weeklyKdjId_fkey" FOREIGN KEY ("weeklyKdjId") REFERENCES "Kdj" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_bbiId_fkey" FOREIGN KEY ("bbiId") REFERENCES "Bbi" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("changePercent", "createdAt", "dailyKdjId", "id", "price", "stockId", "updatedAt", "volume", "weeklyKdjId") SELECT "changePercent", "createdAt", "dailyKdjId", "id", "price", "stockId", "updatedAt", "volume", "weeklyKdjId" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_stockId_idx" ON "Quote"("stockId");
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");
CREATE UNIQUE INDEX "Quote_stockId_key" ON "Quote"("stockId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Bbi_stockId_date_idx" ON "Bbi"("stockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Bbi_stockId_key" ON "Bbi"("stockId");
