-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bbi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "bbi" REAL NOT NULL,
    "ma3" REAL NOT NULL,
    "ma6" REAL NOT NULL,
    "ma12" REAL NOT NULL,
    "ma24" REAL NOT NULL,
    "aboveBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "belowBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "aboveBBIConsecutiveDaysCount" INTEGER NOT NULL DEFAULT 0,
    "belowBBIConsecutiveDaysCount" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bbi_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bbi" ("aboveBBIConsecutiveDays", "bbi", "belowBBIConsecutiveDays", "createdAt", "date", "id", "ma12", "ma24", "ma3", "ma6", "stockId", "updatedAt") SELECT "aboveBBIConsecutiveDays", "bbi", "belowBBIConsecutiveDays", "createdAt", "date", "id", "ma12", "ma24", "ma3", "ma6", "stockId", "updatedAt" FROM "Bbi";
DROP TABLE "Bbi";
ALTER TABLE "new_Bbi" RENAME TO "Bbi";
CREATE INDEX "Bbi_stockId_date_idx" ON "Bbi"("stockId", "date");
CREATE UNIQUE INDEX "Bbi_stockId_key" ON "Bbi"("stockId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
