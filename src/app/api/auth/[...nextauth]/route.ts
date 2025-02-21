/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-21 22:10:05
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-21 22:10:34
 * @FilePath: /B1Notice/src/app/api/auth/[...nextauth]/route.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DefaultSession } from "next-auth";

// 扩展 Session 和 JWT 类型
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("请输入用户名和密码");
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username
          }
        });

        if (!user) {
          throw new Error("用户不存在");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("密码错误");
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

// 使用 Next.js Edge Runtime
export const runtime = 'edge';

// 导出符合 Next.js App Router 规范的处理函数
export const GET = handler;
export const POST = handler;
