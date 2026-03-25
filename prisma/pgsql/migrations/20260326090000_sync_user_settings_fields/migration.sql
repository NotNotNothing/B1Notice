-- Sync missing User settings fields that existed in schema but not in migrations
ALTER TABLE "User"
ADD COLUMN "showBBITrendSignal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "buySignalJThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
ADD COLUMN "b1NotifyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "b1LastNotifiedAt" TIMESTAMP(3),
ADD COLUMN "closingScreenerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "closingScreenerNotifyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "closingScreenerMaxDailyJ" DOUBLE PRECISION DEFAULT 20.0,
ADD COLUMN "closingScreenerMaxWeeklyJ" DOUBLE PRECISION DEFAULT 35.0,
ADD COLUMN "closingScreenerRequirePriceAboveBBI" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "closingScreenerMinAboveBBIDays" INTEGER DEFAULT 1,
ADD COLUMN "closingScreenerMinVolumeRatio" DOUBLE PRECISION DEFAULT 1.2,
ADD COLUMN "closingScreenerLastNotifiedAt" TIMESTAMP(3);
