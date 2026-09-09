'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function TenantsRouteHandler() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isSuperAdmin, isLoading: isProfileLoading } = useUserProfile();

  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;

    if (!user) {
      // Not logged in -> redirect to login
      router.replace('/login');
      return;
    }

    if (isSuperAdmin) {
      // Authorized root super admin -> proceed to tenant management
      router.replace('/dashboard/tenants');
    } else {
      // Regular workspace user -> redirect to dashboard
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isSuperAdmin, isProfileLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
      <span className="text-xs">Redirecting...</span>
    </div>
  );
}
