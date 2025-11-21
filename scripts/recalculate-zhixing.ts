import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { getLongBridgeClient } from '../src/server/longbridge/client';

async function main() {
  const symbol = process.argv[2]?.toUpperCase();
  if (!symbol) {
    throw new Error('请提供需要重新计算的股票代码，例如: npx ts-node scripts/recalculate-zhixing.ts 002594.SZ');
  }

  const stock = await prisma.stock.findFirst({
    where: { symbol },
    select: { id: true },
  });

  if (!stock) {
    throw new Error(`数据库中找不到股票: ${symbol}`);
  }

  const client = getLongBridgeClient();
  const trend = await client.calculateZhixingTrend(symbol);

  if (!trend) {
    throw new Error(`无法计算知行多空趋势线: ${symbol}`);
  }

  const record = await prisma.zhixingTrend.upsert({
    where: { stockId: stock.id },
    update: {
      whiteLine: trend.whiteLine,
      yellowLine: trend.yellowLine,
      previousWhiteLine: trend.previousWhiteLine,
      previousYellowLine: trend.previousYellowLine,
      isGoldenCross: trend.isGoldenCross,
      isDeathCross: trend.isDeathCross,
      date: new Date(trend.timestamp),
    },
    create: {
      stockId: stock.id,
      whiteLine: trend.whiteLine,
      yellowLine: trend.yellowLine,
      previousWhiteLine: trend.previousWhiteLine,
      previousYellowLine: trend.previousYellowLine,
      isGoldenCross: trend.isGoldenCross,
      isDeathCross: trend.isDeathCross,
      date: new Date(trend.timestamp),
    },
  });

  console.log(
    `已更新 ${symbol}: whiteLine=${record.whiteLine}, yellowLine=${record.yellowLine}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
