-- CreateTable
CREATE TABLE "TaskDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "schedule" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "supportsPause" BOOLEAN NOT NULL DEFAULT true,
    "supportsStop" BOOLEAN NOT NULL DEFAULT true,
    "supportsRetry" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastRunAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastFailedAt" DATETIME,
    "lastStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskDefinitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "runReason" TEXT,
    "retryOfRunId" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "progressCurrent" INTEGER,
    "progressTotal" INTEGER,
    "progressLabel" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "stopRequestedAt" DATETIME,
    "pausedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskRun_taskDefinitionId_fkey" FOREIGN KEY ("taskDefinitionId") REFERENCES "TaskDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaskRun_retryOfRunId_fkey" FOREIGN KEY ("retryOfRunId") REFERENCES "TaskRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskRunEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskRunId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskRunEvent_taskRunId_fkey" FOREIGN KEY ("taskRunId") REFERENCES "TaskRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskDefinition_key_key" ON "TaskDefinition"("key");

-- CreateIndex
CREATE INDEX "TaskDefinition_category_idx" ON "TaskDefinition"("category");

-- CreateIndex
CREATE INDEX "TaskDefinition_isPaused_isEnabled_idx" ON "TaskDefinition"("isPaused", "isEnabled");

-- CreateIndex
CREATE INDEX "TaskRun_taskDefinitionId_createdAt_idx" ON "TaskRun"("taskDefinitionId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskRun_status_createdAt_idx" ON "TaskRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TaskRun_retryOfRunId_idx" ON "TaskRun"("retryOfRunId");

-- CreateIndex
CREATE INDEX "TaskRunEvent_taskRunId_createdAt_idx" ON "TaskRunEvent"("taskRunId", "createdAt");
