'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Apple } from 'lucide-react';

interface UserSettingsProps {
  username: string;
}

export function UserSettings({ username }: UserSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pushDeerKey, setPushDeerKey] = useState('');
  const [showBBITrendSignal, setShowBBITrendSignal] = useState(true);
  const [buySignalJThreshold, setBuySignalJThreshold] = useState(20.0);

  useEffect(() => {
    // 获取当前用户的设置
    const fetchUserSettings = async () => {
      try {
        // 获取 PushDeer Key
        const pushdeerResponse = await fetch('/api/user/pushdeer');
        if (pushdeerResponse.ok) {
          const pushdeerData = await pushdeerResponse.json();
          setPushDeerKey(pushdeerData.pushDeerKey || '');
        }

        // 获取BBI趋势信号设置
        const bbiResponse = await fetch('/api/user/bbi-settings');
        if (bbiResponse.ok) {
          const bbiData = await bbiResponse.json();
          setShowBBITrendSignal(bbiData.showBBITrendSignal);
          setBuySignalJThreshold(bbiData.buySignalJThreshold);
        }
      } catch (error) {
        console.error('获取用户设置失败:', error);
      }
    };

    if (isOpen) {
      fetchUserSettings();
    }
  }, [isOpen]);

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('新密码和确认密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '修改密码失败');
      }

      toast.success('密码修改成功');
      setIsOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePushDeerKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/pushdeer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushDeerKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新 PushDeer Key 失败');
      }

      toast.success('PushDeer Key 更新成功');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新 PushDeer Key 失败',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBBITrendSignal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/bbi-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showBBITrendSignal,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新BBI趋势信号设置失败');
      }

      toast.success('BBI趋势信号设置更新成功');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新BBI趋势信号设置失败',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBuySignalThreshold = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/bbi-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buySignalJThreshold,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新买入信号设置失败');
      }

      toast.success('买入信号设置更新成功');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新买入信号设置失败',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPushDeer = async () => {
    if (!pushDeerKey) {
      toast.error('请先输入 PushDeer Key');
      return;
    }

    setIsTestingPush(true);
    try {
      const response = await fetch('/api/user/pushdeer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushDeerKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '测试推送失败');
      }

      toast.success('测试推送发送成功，请查看手机通知');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '测试推送失败');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>{username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              账号设置
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>账号设置</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              {/* <div className='space-y-4'>
                <div>
                  <Label htmlFor='currentPassword'>当前密码</Label>
                  <Input
                    id='currentPassword'
                    type='password'
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='newPassword'>新密码</Label>
                  <Input
                    id='newPassword'
                    type='password'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='confirmPassword'>确认新密码</Label>
                  <Input
                    id='confirmPassword'
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleUpdatePassword}
                  disabled={
                    isLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  修改密码
                </Button>
              </div> */}

              {/* BBI趋势信号设置 */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='bbi-setting' className='text-base'>
                      BBI趋势信号
                    </Label>
                    <p className='text-sm text-gray-500'>
                      控制是否在股票卡片上显示BBI趋势信号信息
                    </p>
                  </div>
                  <Switch
                    id='bbi-setting'
                    checked={showBBITrendSignal}
                    onCheckedChange={setShowBBITrendSignal}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleUpdateBBITrendSignal}
                  disabled={isLoading}
                  className='w-full'
                >
                  保存BBI趋势信号设置
                </Button>
              </div>

              {/* 买入信号设置 */}
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='j-threshold' className='text-base'>
                    买入信号J值阈值
                  </Label>
                  <p className='text-sm text-gray-500'>
                    当J值低于此阈值时触发买入信号（默认20）
                  </p>
                  <Input
                    id='j-threshold'
                    type='number'
                    min='0'
                    max='100'
                    step='0.1'
                    value={buySignalJThreshold}
                    onChange={(e) => setBuySignalJThreshold(parseFloat(e.target.value))}
                    placeholder='请输入J值阈值'
                  />
                </div>
                <Button
                  onClick={handleUpdateBuySignalThreshold}
                  disabled={isLoading}
                  className='w-full'
                >
                  保存买入信号设置
                </Button>
              </div>

              <div className='space-y-4'>
                <div>
                  <Label htmlFor='pushDeerKey'>
                    配置 PushDeer Key
                    <Link
                      className='ml-2 text-blue-500'
                      href='https://apps.apple.com/cn/app/pushdeer/id1596771139?platform=iphone'
                      target='_blank'
                    >
                      苹果安装
                    </Link>
                    <Link
                      className='ml-2 text-blue-500'
                      href='https://github.com/easychen/pushdeer/releases'
                      target='_blank'
                    >
                      安卓安装
                    </Link>
                  </Label>
                  <Input
                    id='pushDeerKey'
                    className='mt-2 h-12 text-base'
                    value={pushDeerKey}
                    onChange={(e) => setPushDeerKey(e.target.value)}
                    placeholder='请输入 PushDeer Key'
                  />
                </div>
                <div className='flex gap-2'>
                  <Button
                    onClick={handleUpdatePushDeerKey}
                    disabled={isLoading || !pushDeerKey}
                    className='flex-1'
                  >
                    更新 PushDeer Key
                  </Button>
                  <Button
                    onClick={handleTestPushDeer}
                    disabled={isTestingPush || !pushDeerKey}
                    variant="secondary"
                    className='flex-1'
                  >
                    {isTestingPush ? '发送中...' : '测试推送'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <DropdownMenuItem onClick={handleLogout}>退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
