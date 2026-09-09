'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function UsersRouteHandler() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      // Not logged in -> redirect to login
      router.replace('/login');
      return;
    }

    // Authenticated user -> redirect to profile & workspace settings
    router.replace('/dashboard/settings');
  }, [user, isUserLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
      <span className="text-xs">Redirecting...</span>
    </div>
  );
}
