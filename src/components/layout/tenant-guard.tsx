'use client';

import { ReactNode, useEffect } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ForceChangePasswordModal } from '@/components/auth/force-change-password-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function TenantGuard({ children }: { children: ReactNode }) {
  const {
    isSuperAdmin,
    isTenantSuspended,
    isDemoExpired,
    daysRemainingInDemo,
    tenantPlan,
    companyName,
    mustChangePassword,
    isLoading,
  } = useUserProfile();

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  // Redirect to login immediately if user is not authenticated
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_session=; path=/; max-age=0; SameSite=Lax';
    }
    await signOut(auth);
    router.push('/login');
  };

  // 1. Initial Authentication & Profile Loading State
  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: NEVER render children or access-denied UI, keep redirecting
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // 1. Tenant Suspension Wall (Super Admins are exempt)
  if (isTenantSuspended && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
        <Card className="max-w-md w-full border-destructive/40 shadow-xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">Workspace Suspended</CardTitle>
            <CardDescription className="text-xs">
              Access to <strong>{companyName}</strong> has been temporarily suspended by the platform administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              Please contact the platform administrator at{' '}
              <a href="mailto:support@remotizedit.online" className="font-semibold text-primary underline">
                support@remotizedit.online
              </a>{' '}
              to reactivate your company account.
            </p>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-xs">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Demo Trial Expired Wall
  if (isDemoExpired && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/40">
        <Card className="max-w-md w-full border-amber-500/40 shadow-xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-amber-600">Demo Trial Expired</CardTitle>
            <CardDescription className="text-xs">
              Your 15-day evaluation period for <strong>{companyName}</strong> has ended.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              To continue using EstateFlow and restore access to your projects, customers, and financial records, upgrade to our <strong>Pro</strong> or <strong>Ultra</strong> plan.
            </p>
            <div className="p-3 bg-muted rounded-lg text-xs text-center">
              Contact us at <span className="font-semibold text-foreground">admin@remotizedit.online</span> to activate your plan.
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full text-xs">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Forced Password Change Modal if required */}
      <ForceChangePasswordModal isOpen={mustChangePassword} />

      {/* Demo remaining banner */}
      {tenantPlan === 'demo' && daysRemainingInDemo !== null && !isSuperAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Demo Evaluation Mode:</strong> {daysRemainingInDemo} day{daysRemainingInDemo === 1 ? '' : 's'} remaining in your trial.
            </span>
          </div>
          <span className="text-[11px] opacity-80">Contact support@remotizedit.online to upgrade</span>
        </div>
      )}

      {children}
    </>
  );
}
