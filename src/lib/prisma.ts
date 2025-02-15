/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-15 13:46:45
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-15 13:47:24
 * @FilePath: /B1Notice/b1notice/src/lib/prisma.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
