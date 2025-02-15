/*
  Warnings:

  - You are about to drop the `KDJRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KDJRecord" DROP CONSTRAINT "KDJRecord_stockId_fkey";

-- DropTable
DROP TABLE "KDJRecord";

-- CreateTable
CREATE TABLE "KdjRecord" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "k" DOUBLE PRECISION NOT NULL,
    "d" DOUBLE PRECISION NOT NULL,
    "j" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KdjRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KdjRecord_stockId_date_idx" ON "KdjRecord"("stockId", "date");

-- AddForeignKey
ALTER TABLE "KdjRecord" ADD CONSTRAINT "KdjRecord_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
