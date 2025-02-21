/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-21 22:10:05
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-21 22:10:34
 * @FilePath: /B1Notice/src/app/api/auth/[...nextauth]/route.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import NextAuth from "next-auth/next";
import { authOptions } from "../auth.config";

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
