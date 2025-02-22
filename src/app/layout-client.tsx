/*
 * @Author: GodD6366 daichangchun6366@gmail.com
 * @Date: 2025-02-21 22:30:24
 * @LastEditors: GodD6366 daichangchun6366@gmail.com
 * @LastEditTime: 2025-02-21 22:32:55
 * @FilePath: /B1Notice/src/app/layout-client.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    const publicPaths = ['/login', '/register'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!session && !isPublicPath) {
      router.push('/login');
    }
  }, [session, status, pathname, router]);

  if (status === 'loading') {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
      </div>
    );
  }

  return children;
}

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='zh-CN'>
      <head>
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0,user-scalable=no'
        />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <AuthCheck>{children}</AuthCheck>
        </SessionProvider>
        <Toaster richColors position='top-right' />
      </body>
    </html>
  );
}
