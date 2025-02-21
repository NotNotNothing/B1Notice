/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-21 22:10:33
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-21 22:35:34
 * @FilePath: /B1Notice/src/app/login/page.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Metadata } from 'next'
import LoginForm from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: '登录',
  description: '登录您的账号',
}

export default function LoginPage() {
  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>账号登录</h1>
          <p className='text-sm text-muted-foreground'>
            请输入您的账号信息进行登录
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
