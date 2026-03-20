-- 创建通达信公式库表
CREATE TABLE "TdxFormula" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TdxFormula_pkey" PRIMARY KEY ("id")
);

-- 添加外键约束
ALTER TABLE "TdxFormula" ADD CONSTRAINT "TdxFormula_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 创建唯一索引
CREATE UNIQUE INDEX "TdxFormula_userId_name_key" ON "TdxFormula"("userId", "name");

-- 创建用户ID索引
CREATE INDEX "TdxFormula_userId_idx" ON "TdxFormula"("userId");
