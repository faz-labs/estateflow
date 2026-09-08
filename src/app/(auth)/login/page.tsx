'use client';

import { useState } from 'react';
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
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Mail, Lock, UserPlus, LogIn, Building2 } from 'lucide-react';
import type { Tenant, TenantInvite, User as UserProfile } from '@/lib/types';
import { SUPER_ADMIN_EMAILS } from '@/hooks/use-user-profile';
import { ForceChangePasswordModal } from '@/components/auth/force-change-password-modal';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === 'login') {
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
          let userRole: 'Admin' | 'Accountant' | 'Viewer' = 'Admin';

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

          const [fName, lName] = user.displayName?.split(' ') || [user.email?.split('@')[0] || 'User', ''];
          const newUser: UserProfile = {
            id: user.uid,
            email: user.email || normalizedEmail,
            firstName: fName,
            lastName: lName || '',
            role: userRole,
            tenantId: userTenantId,
            companyName: userCompanyName,
            mustChangePassword: false,
          };
          setDocumentNonBlocking(userDocRef, newUser, { merge: true });
        } else {
          const existingData = userDoc.data() as UserProfile;

          // Check if tenant is suspended
          if (existingData.tenantId && existingData.tenantId !== 'platform_root') {
            const tenantDocSnap = await getDoc(doc(firestore, 'tenants', existingData.tenantId));
            if (tenantDocSnap.exists()) {
              const tenantData = tenantDocSnap.data() as Tenant;
              if (tenantData.status === 'suspended') {
                await auth.signOut();
                toast({
                  variant: 'destructive',
                  title: 'Account Suspended',
                  description: 'Your organization access is currently suspended. Please contact admin@remotizedit.online.',
                });
                setIsLoading(false);
                return;
              }
            }
          }

          // Check if user is required to change password on first login
          if (existingData.mustChangePassword) {
            setIsForceChangeOpen(true);
            setIsLoading(false);
            return;
          }
        }

        toast({
          title: 'Login Success',
        });
        setIsRedirecting(true);
        window.location.assign('/dashboard');
        return;

      } else {
        // Explicit Account Creation with Automatic Multi-Tenant Scoping
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(firestore, 'users', user.uid);

        // Check if this email was invited by an existing company Admin
        const invitesQuery = query(
          collection(firestore, 'tenant_invites'),
          where('email', '==', normalizedEmail),
          where('status', '==', 'pending')
        );
        const inviteSnap = await getDocs(invitesQuery);

        let assignedTenantId = '';
        let assignedCompanyName = '';
        let assignedRole: 'Admin' | 'Accountant' | 'Viewer' = 'Viewer';

        if (!inviteSnap.empty) {
          // Join the inviting company!
          const inviteDoc = inviteSnap.docs[0];
          const inviteData = inviteDoc.data() as TenantInvite;
          assignedTenantId = inviteData.tenantId;
          assignedCompanyName = inviteData.companyName;
          assignedRole = inviteData.role;

          // Mark invite accepted
          setDocumentNonBlocking(doc(firestore, 'tenant_invites', inviteDoc.id), {
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
          }, { merge: true });

          toast({
            title: 'Joined Workspace!',
            description: `You have joined ${assignedCompanyName} as ${assignedRole}.`,
          });
        } else {
          // Create a brand new Company / Tenant workspace
          const orgSlug = (companyName.trim() || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16);
          assignedTenantId = `${orgSlug}-${Date.now().toString(36)}`;
          assignedCompanyName = companyName.trim() || 'My Real Estate Company';
          assignedRole = 'Admin'; // First user of an organization is the Admin

          const tenantDocRef = doc(firestore, 'tenants', assignedTenantId);
          const tenantData: Tenant = {
            id: assignedTenantId,
            name: assignedCompanyName,
            ownerUid: user.uid,
            createdAt: new Date().toISOString(),
            plan: 'demo',
            status: 'active',
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            maxProjects: 5,
          };
          setDocumentNonBlocking(tenantDocRef, tenantData, { merge: true });

          toast({
            title: 'Organization Created!',
            description: `Workspace created for ${assignedCompanyName}. You are the Admin.`,
          });
        }

        const userProfile: UserProfile = {
          id: user.uid,
          email: user.email || normalizedEmail,
          firstName: firstName.trim() || 'Admin',
          lastName: lastName.trim() || 'User',
          role: assignedRole,
          tenantId: assignedTenantId,
          companyName: assignedCompanyName,
        };

        setDocumentNonBlocking(userDocRef, userProfile, { merge: false });
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error('Authentication Error:', error);
      let message = error.message;

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        message = 'Invalid email address or password. Please verify your credentials.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email address already exists. Please log in instead.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters long.';
      }

      toast({
        variant: 'destructive',
        title: mode === 'login' ? 'Login Failed' : 'Registration Failed',
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

    setIsSendingReset(true);

    try {
      // Call self-hosted Mailcow SMTP API endpoint
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch reset email.');
      }

      if (data.warning) {
        toast({
          title: 'SMTP Notice',
          description: data.warning,
        });
      } else {
        toast({
          title: 'Email Dispatched',
          description: data.message || `Password reset link sent to ${forgotEmail} via Mailcow SMTP.`,
        });
      }

      setIsForgotOpen(false);
      setForgotEmail('');

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Request Failed',
        description: err.message || 'Could not send reset email through SMTP.',
      });
    } finally {
      setIsSendingReset(false);
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
              {mode === 'login' ? 'Welcome to EstateFlow' : 'Create an Account'}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === 'login' 
                ? 'Enter your credentials to access your SaaS management dashboard'
                : 'Register your details to join EstateFlow'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`text-xs font-semibold py-1.5 rounded-md transition-all ${
                  mode === 'login' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`text-xs font-semibold py-1.5 rounded-md transition-all ${
                  mode === 'register' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-medium">Company / Organization Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        placeholder="Landmark Homes Ltd."
                        className="pl-9"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Tip: If invited by an Admin, simply use your invited email to automatically join your workspace.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@estateflow.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                  {mode === 'login' && (
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
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isLoading || isRedirecting}>
                {isRedirecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to Dashboard...
                  </>
                ) : isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {mode === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Dialog (Mailcow SMTP Integrated) */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your account email. We will send a secure password reset link via your self-hosted Mailcow SMTP server.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-xs font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-9"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isSendingReset}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending via Mailcow...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forced Password Change Modal for First-Time Logins */}
      <ForceChangePasswordModal
        isOpen={isForceChangeOpen}
        onSuccess={() => {
          setIsForceChangeOpen(false);
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
