-- AlterTable
ALTER TABLE "Bbi" ADD COLUMN     "aboveBBIConsecutiveDaysCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "belowBBIConsecutiveDaysCount" INTEGER NOT NULL DEFAULT 0;
