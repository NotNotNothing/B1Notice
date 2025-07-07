-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "bbiId" TEXT;

-- CreateTable
CREATE TABLE "Bbi" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "bbi" DOUBLE PRECISION NOT NULL,
    "ma3" DOUBLE PRECISION NOT NULL,
    "ma6" DOUBLE PRECISION NOT NULL,
    "ma12" DOUBLE PRECISION NOT NULL,
    "ma24" DOUBLE PRECISION NOT NULL,
    "aboveBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "belowBBIConsecutiveDays" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bbi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bbi_stockId_date_idx" ON "Bbi"("stockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Bbi_stockId_key" ON "Bbi"("stockId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_bbiId_fkey" FOREIGN KEY ("bbiId") REFERENCES "Bbi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bbi" ADD CONSTRAINT "Bbi_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
