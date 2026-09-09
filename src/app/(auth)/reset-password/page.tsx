'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Loader2, Lock, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const oobCode = searchParams.get('oobCode');
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [targetEmail, setTargetEmail] = useState<string>(emailParam || '');
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate the code or token on mount
  useEffect(() => {
    async function validate() {
      if (!oobCode && !token) {
        setValidationError('Invalid or missing password reset link. Please request a new link.');
        setIsValidating(false);
        return;
      }

      if (oobCode && auth) {
        try {
          const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
          setTargetEmail(verifiedEmail);
        } catch (err: any) {
          console.error('oobCode verification failed:', err);
          setValidationError('This password reset link has expired or has already been used. Please request a new one.');
        }
      }

      setIsValidating(false);
    }

    validate();
  }, [oobCode, token, auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in both fields.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (oobCode && auth) {
        // Native Firebase Auth reset via oobCode
        await confirmPasswordReset(auth, oobCode, newPassword);
      } else if (token) {
        // Custom token verification via server route
        const res = await fetch('/api/auth/confirm-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Server returned an unexpected response (${res.status}).`);
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to reset password.');
        }
      }

      setIsSuccess(true);
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been changed. You can now log in with your new password.',
      });

      setTimeout(() => {
        router.push('/login');
      }, 2500);

    } catch (err: any) {
      console.error('Password reset confirmation failed:', err);
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: err.message || 'Could not update your password. The link may have expired.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Verifying reset authorization...</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Invalid Reset Link</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{validationError}</p>
        <Link href="/login">
          <Button variant="outline" size="sm" className="mt-2 text-xs">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Password Updated!</h2>
        <p className="text-xs text-muted-foreground">
          Your credentials have been securely updated. Redirecting you to the sign-in page...
        </p>
        <Link href="/login">
          <Button size="sm" className="mt-2 text-xs">
            Sign In Now
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {targetEmail ? (
        <div className="p-2.5 bg-muted rounded-md text-xs">
          Resetting password for: <strong className="text-foreground">{targetEmail}</strong>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="new-password" className="text-xs font-medium">New Password</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="Enter new password (min 6 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password" className="text-xs font-medium">Confirm New Password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Re-type new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="w-full font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving New Password...
          </>
        ) : (
          'Update Password'
        )}
      </Button>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Remember your password? Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="h-10 w-10" />
          <h1 className="text-2xl font-bold tracking-tight">EstateFlow</h1>
          <p className="text-xs text-muted-foreground">
            Enterprise Real Estate Management System
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription className="text-xs">
              Choose a strong password to protect your company's account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }>
              <ResetPasswordContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
