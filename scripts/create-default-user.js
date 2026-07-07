const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultUser() {
  const username = process.env.DEFAULT_ADMIN_USERNAME;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('⚠️  DEFAULT_ADMIN_USERNAME 或 DEFAULT_ADMIN_PASSWORD 未设置，跳过默认用户创建');
    await prisma.$disconnect();
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: '管理员',
        role: 'ADMIN',
        showBBITrendSignal: true,
        buySignalJThreshold: 20.0,
        b1NotifyEnabled: false,
        closingScreenerEnabled: false,
        closingScreenerNotifyEnabled: false,
        dataSource: 'akshare'
      }
    });
    console.log('✅ 默认管理员创建成功');
    console.log(`   用户名: ${username}`);
    console.log(`   密码: ${password}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  用户已存在，跳过创建');
    } else {
      console.error('❌ 创建用户失败:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultUser();
