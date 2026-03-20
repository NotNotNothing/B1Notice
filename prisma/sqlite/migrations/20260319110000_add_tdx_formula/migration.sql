-- 创建通达信公式库表
CREATE TABLE "TdxFormula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TdxFormula_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 创建唯一索引
CREATE UNIQUE INDEX "TdxFormula_userId_name_key" ON "TdxFormula"("userId", "name");

-- 创建用户ID索引
CREATE INDEX "TdxFormula_userId_idx" ON "TdxFormula"("userId");
