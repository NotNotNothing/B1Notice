-- DropIndex
DROP INDEX "Stock_symbol_key";

-- CreateIndex
CREATE INDEX "Stock_symbol_idx" ON "Stock"("symbol");
