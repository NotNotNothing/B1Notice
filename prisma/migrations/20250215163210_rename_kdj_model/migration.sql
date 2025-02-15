/*
  Warnings:

  - You are about to drop the `KdjRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KdjRecord" DROP CONSTRAINT "KdjRecord_stockId_fkey";

-- DropTable
DROP TABLE "KdjRecord";

-- CreateTable
CREATE TABLE "Kdj" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "k" DOUBLE PRECISION NOT NULL,
    "d" DOUBLE PRECISION NOT NULL,
    "j" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kdj_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kdj_stockId_date_idx" ON "Kdj"("stockId", "date");

-- AddForeignKey
ALTER TABLE "Kdj" ADD CONSTRAINT "Kdj_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
