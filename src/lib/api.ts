import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

interface AuthenticatedUser {
  id: string;
  username: string;
  name?: string | null;
}

export async function requireUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }
  
  return {
    id: session.user.id,
    username: session.user.username,
    name: session.user.name,
  };
}

export function apiSuccess<T>(data?: T, message?: string): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return NextResponse.json(response);
}

export function apiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
    },
    { status: statusCode }
  );
}

export function unauthorizedError(message: string = '未登录'): NextResponse<ApiResponse> {
  return apiError(message, 401, 'UNAUTHORIZED');
}

export function notFoundError(message: string = '资源不存在'): NextResponse<ApiResponse> {
  return apiError(message, 404, 'NOT_FOUND');
}

export function badRequestError(message: string, details?: unknown): NextResponse<ApiResponse> {
  return apiError(message, 400, 'BAD_REQUEST', details);
}

export function forbiddenError(message: string = '无权限访问'): NextResponse<ApiResponse> {
  return apiError(message, 403, 'FORBIDDEN');
}

export function createdSuccess<T>(data?: T, message: string = '创建成功'): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: 201 }
  );
}

export async function withAuth<T>(
  handler: (user: AuthenticatedUser) => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  const user = await requireUser();

  if (!user) {
    return unauthorizedError() as NextResponse<ApiResponse<T>>;
  }

  return handler(user);
}
