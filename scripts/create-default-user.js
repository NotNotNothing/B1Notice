const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        username: 'admin',
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
    console.log('默认用户创建成功:', user.username);
    console.log('用户名: admin');
    console.log('密码: admin123');
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('用户已存在');
    } else {
      console.error('创建用户失败:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultUser();
