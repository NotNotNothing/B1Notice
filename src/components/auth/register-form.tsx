'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'

export default function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '注册失败')
      }

      toast.success('注册成功')
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注册失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              placeholder="请输入用户名"
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              disabled={isLoading}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              placeholder="请输入密码"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              placeholder="请再次输入密码"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              required
              className="h-12 text-base"
            />
          </div>
          <Button className="w-full h-12 text-base mt-2" disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
            )}
            注册
          </Button>
        </div>
      </form>
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-6 text-muted-foreground">
            已有账号?
          </span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isLoading} asChild className="w-full h-12 text-base">
        <Link href="/login">登录</Link>
      </Button>
    </div>
  )
}
