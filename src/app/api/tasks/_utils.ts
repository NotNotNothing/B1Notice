import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/auth.config';

export async function getTaskUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function successResponse<T>(
  data: T,
  message = 'ok',
  status = 200,
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status },
  );
}

export function errorResponse(
  message: string,
  status = 400,
  errorCode = 'REQUEST_FAILED',
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errorCode,
    },
    { status },
  );
}
