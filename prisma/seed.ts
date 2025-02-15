const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

interface StockSeedData {
  symbol: string;
  name: string;
  market: string;
}

const stockData: StockSeedData[] = [
  { symbol: '002594.SZ', name: '比亚迪', market: 'SZ' },
  { symbol: '600570.SH', name: '恒生电子', market: 'SH' },
  { symbol: '600519.SH', name: '贵州茅台', market: 'SH' },
  { symbol: '000776.SZ', name: '广发证券', market: 'SZ' },
  { symbol: '601127.SH', name: '赛力斯', market: 'SH' },
  { symbol: '600030.SH', name: '中信证券', market: 'SH' },
  { symbol: '00700.HK', name: '腾讯控股', market: 'HK' },
  { symbol: '01810.HK', name: '小米集团', market: 'HK' },
  { symbol: '02331.HK', name: '李宁', market: 'HK' },
  { symbol: 'BABA.US', name: '阿里巴巴', market: 'US' },
  { symbol: 'NVDA.US', name: '英伟达', market: 'US' },
  { symbol: 'AAPL.US', name: '苹果', market: 'US' },
  { symbol: 'MSFT.US', name: '微软', market: 'US' },
  { symbol: 'JD.US', name: '京东', market: 'US' },
];

async function main() {
  console.log('开始初始化股票数据...');

  for (const stock of stockData) {
    await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      update: {
        name: stock.name,
        market: stock.market,
      },
      create: stock,
    });
  }

  console.log('股票数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化过程中发生错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
