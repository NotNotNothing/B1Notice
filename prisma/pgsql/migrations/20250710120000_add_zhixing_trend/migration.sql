-- CreateTable
CREATE TABLE "ZhixingTrend" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "whiteLine" DOUBLE PRECISION NOT NULL,
    "yellowLine" DOUBLE PRECISION NOT NULL,
    "previousWhiteLine" DOUBLE PRECISION NOT NULL,
    "previousYellowLine" DOUBLE PRECISION NOT NULL,
    "isGoldenCross" BOOLEAN NOT NULL DEFAULT false,
    "isDeathCross" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ZhixingTrend_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ZhixingTrend" ADD CONSTRAINT "ZhixingTrend_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "ZhixingTrend_stockId_key" ON "ZhixingTrend"("stockId");
CREATE INDEX "ZhixingTrend_stockId_date_idx" ON "ZhixingTrend"("stockId", "date");

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "zhixingTrendId" TEXT;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_zhixingTrendId_fkey" FOREIGN KEY ("zhixingTrendId") REFERENCES "ZhixingTrend"("id") ON DELETE SET NULL ON UPDATE CASCADE;
