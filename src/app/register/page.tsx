import { Metadata } from 'next'
import RegisterForm from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: '注册',
  description: '创建新账号',
}

export default function RegisterPage() {
  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>创建账号</h1>
          <p className='text-sm text-muted-foreground'>
            请输入您的账号信息进行注册
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
