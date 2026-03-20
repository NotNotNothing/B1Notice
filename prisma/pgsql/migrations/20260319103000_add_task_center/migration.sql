-- CreateTable
CREATE TABLE "TaskDefinition" (
    "id" TEXT NOT NULL,
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
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRun" (
    "id" TEXT NOT NULL,
    "taskDefinitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "runReason" TEXT,
    "retryOfRunId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "progressCurrent" INTEGER,
    "progressTotal" INTEGER,
    "progressLabel" TEXT,
    "summary" TEXT,
    "metadata" TEXT,
    "stopRequestedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRunEvent" (
    "id" TEXT NOT NULL,
    "taskRunId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRunEvent_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "TaskRun" ADD CONSTRAINT "TaskRun_taskDefinitionId_fkey" FOREIGN KEY ("taskDefinitionId") REFERENCES "TaskDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRun" ADD CONSTRAINT "TaskRun_retryOfRunId_fkey" FOREIGN KEY ("retryOfRunId") REFERENCES "TaskRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRunEvent" ADD CONSTRAINT "TaskRunEvent_taskRunId_fkey" FOREIGN KEY ("taskRunId") REFERENCES "TaskRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
