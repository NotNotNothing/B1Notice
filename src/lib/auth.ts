import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';

export async function auth() {
  return getServerSession(authOptions);
}
