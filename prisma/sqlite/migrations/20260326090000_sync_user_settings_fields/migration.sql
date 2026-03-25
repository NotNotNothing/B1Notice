-- Sync missing User settings fields that existed in schema but not in migrations
ALTER TABLE "User" ADD COLUMN "showBBITrendSignal" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "buySignalJThreshold" REAL NOT NULL DEFAULT 20.0;
ALTER TABLE "User" ADD COLUMN "b1NotifyEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "b1LastNotifiedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "closingScreenerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "closingScreenerNotifyEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "closingScreenerMaxDailyJ" REAL DEFAULT 20.0;
ALTER TABLE "User" ADD COLUMN "closingScreenerMaxWeeklyJ" REAL DEFAULT 35.0;
ALTER TABLE "User" ADD COLUMN "closingScreenerRequirePriceAboveBBI" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "closingScreenerMinAboveBBIDays" INTEGER DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "closingScreenerMinVolumeRatio" REAL DEFAULT 1.2;
ALTER TABLE "User" ADD COLUMN "closingScreenerLastNotifiedAt" DATETIME;
