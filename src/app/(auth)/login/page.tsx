'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';
import type { Tenant, TenantInvite, User as UserProfile } from '@/lib/types';
import { SUPER_ADMIN_EMAILS, useUserProfile } from '@/hooks/use-user-profile';
import { ForceChangePasswordModal } from '@/components/auth/force-change-password-modal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Forced password change modal on first login
  const [isForceChangeOpen, setIsForceChangeOpen] = useState(false);

  // Forgot password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { isSuperAdmin, isLoading: isProfileLoading } = useUserProfile();

  // If already authenticated, redirect straight to their workspace
  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (user) {
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_session=true; path=/; max-age=2592000; SameSite=Lax';
      }
      if (isSuperAdmin) {
        router.replace('/dashboard/tenants');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, isSuperAdmin, isProfileLoading, router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

      // Ensure user document exists in Firestore and has tenant metadata
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (isSuperAdminEmail) {
        // Provision or upgrade Super Admin automatically
        if (!userDoc.exists() || (userDoc.data() as UserProfile).role !== 'SuperAdmin') {
          const superUserProfile: UserProfile = {
            id: user.uid,
            email: normalizedEmail,
            firstName: normalizedEmail.split('@')[0],
            lastName: '(SuperAdmin)',
            role: 'SuperAdmin',
            tenantId: 'platform_root',
            companyName: 'Platform SuperAdmin',
            mustChangePassword: false,
          };
          setDocumentNonBlocking(userDocRef, superUserProfile, { merge: true });
        }

        toast({
          title: 'Login Success',
        });
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_session=true; path=/; max-age=2592000; SameSite=Lax';
        }
        setIsRedirecting(true);
        window.location.assign('/dashboard/tenants');
        return;
      }

      if (!userDoc.exists()) {
        // Check if there was an invite for this user
        const invitesQuery = query(
          collection(firestore, 'tenant_invites'),
          where('email', '==', normalizedEmail),
          where('status', '==', 'pending')
        );
        const inviteSnap = await getDocs(invitesQuery);

        let userTenantId = 'default_workspace';
        let userCompanyName = 'Default Workspace';
        let userRole: 'Admin' | 'Accountant' | 'Viewer' = 'Viewer';

        if (!inviteSnap.empty) {
          const inviteDoc = inviteSnap.docs[0];
          const inviteData = inviteDoc.data() as TenantInvite;
          userTenantId = inviteData.tenantId;
          userCompanyName = inviteData.companyName;
          userRole = inviteData.role;
          setDocumentNonBlocking(doc(firestore, 'tenant_invites', inviteDoc.id), {
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
          }, { merge: true });
        }

        const [firstNameVal, lastNameVal] = user.displayName?.split(' ') || [normalizedEmail.split('@')[0], ''];
        const userProfile: UserProfile = {
          id: user.uid,
          email: user.email || normalizedEmail,
          firstName: firstNameVal || 'User',
          lastName: lastNameVal || '',
          role: userRole,
          tenantId: userTenantId,
          companyName: userCompanyName,
          mustChangePassword: false,
        };
        setDocumentNonBlocking(userDocRef, userProfile, { merge: true });
      } else {
        const userData = userDoc.data() as UserProfile;

        // Check if tenant is suspended
        if (userData.tenantId && userData.tenantId !== 'platform_root') {
          const tenantDoc = await getDoc(doc(firestore, 'tenants', userData.tenantId));
          if (tenantDoc.exists()) {
            const tenantData = tenantDoc.data() as Tenant;
            if (tenantData.status === 'suspended') {
              throw new Error('Your organization workspace access has been suspended. Please contact platform support.');
            }
          }
        }

        // Check if user is forced to change password at first login
        if (userData.mustChangePassword) {
          setIsForceChangeOpen(true);
          setIsLoading(false);
          return;
        }
      }

      toast({
        title: 'Login Success',
      });
      if (typeof document !== 'undefined') {
        document.cookie = 'auth_session=true; path=/; max-age=2592000; SameSite=Lax';
      }
      setIsRedirecting(true);
      window.location.assign('/dashboard');
      return;

    } catch (error: any) {
      console.error('Authentication Error:', error);
      let message = error.message;

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = 'Invalid email address or password. Please verify your credentials.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later or reset your password.';
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
      return;
    }

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    // 1. Optimistic instant UI response: Close modal and confirm immediately
    setIsForgotOpen(false);
    setForgotEmail('');
    toast({
      title: 'Reset Link Sent',
      description: `A password reset link has been sent to ${normalizedEmail}. Please check your inbox.`,
    });

    // 2. Dispatch the email in the background
    try {
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
        .then(async (response) => {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
              console.error('Password reset background error:', data.error);
            }
          }
        })
        .catch((err) => {
          console.error('Background password reset error:', err);
        });
    } catch (err: any) {
      console.error('Password Reset Error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center items-center mb-3">
              <Logo className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Welcome to EstateFlow
            </CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access your management dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@company.com"
                    className="pl-9"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotOpen(true);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    className="pl-9"
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isLoading || isRedirecting}>
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to Dashboard...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> Sign In to Dashboard
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Dialog (Firebase Authentication) */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your account email. We will send a secure password reset link to your email address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-medium">Account Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="user@company.com"
                  className="pl-9"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isSendingReset}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsForgotOpen(false)}
                disabled={isSendingReset}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSendingReset}>
                {isSendingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Force Change Password Dialog on First Login */}
      <ForceChangePasswordModal
        isOpen={isForceChangeOpen}
        onSuccess={() => {
          setIsForceChangeOpen(false);
          toast({ title: 'Welcome!', description: 'Password updated. Redirecting to your dashboard...' });
          window.location.assign('/dashboard');
        }}
      />
    </div>
  );
}
