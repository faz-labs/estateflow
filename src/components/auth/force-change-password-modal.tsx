'use client';

import { useState } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Lock, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export function ForceChangePasswordModal({ isOpen, onSuccess }: ForceChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in both password fields.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match. Please re-type.' });
      return;
    }

    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'No authenticated session found. Please log in again.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update Firebase Auth user's password
      await updatePassword(auth.currentUser, newPassword);

      // 2. Remove mustChangePassword flag in Firestore profile
      if (firestore) {
        const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          mustChangePassword: false,
          passwordUpdatedAt: new Date().toISOString(),
        });
      }

      toast({
        title: 'Password Updated!',
        description: 'Your permanent password has been set. You now have full access to your workspace.',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      let message = err.message || 'Failed to update password.';
      if (err.code === 'auth/requires-recent-login') {
        message = 'For security reasons, please log out and log in again before changing your password.';
      }
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold">First-Time Login Security</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            You are logged in with temporary credentials provisioned by your platform administrator. For your security, you must set a new permanent password to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new secure password (min 6 chars)"
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
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1 border border-border">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Password Requirements:
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
              <li>Minimum 6 characters</li>
              <li>Include numbers or special characters for stronger security</li>
            </ul>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Credentials...
                </>
              ) : (
                'Set New Password & Enter Workspace'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
