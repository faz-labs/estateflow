'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldAlert } from 'lucide-react';

/**
 * Listens for globally emitted 'permission-error' events and gracefully displays
 * a user-friendly modal and notification toast instead of crashing the React application.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();
  const { user } = useUser();
  const [deniedError, setDeniedError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // If user is not logged in, suppress alerts as redirection to /login is taking place
      if (!user) return;

      console.warn('Firestore Permission Violation caught gracefully:', error);

      // 1. Fire a toast notification immediately
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role). Changes cannot be saved.',
      });

      // 2. Open the user-friendly permission dialog
      setDeniedError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  if (!deniedError) return null;

  return (
    <AlertDialog open={!!deniedError} onOpenChange={(open) => { if (!open) setDeniedError(null); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-1">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            Permission Denied: Read-Only Account
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Your user account is assigned to the <strong>Viewer (Read-Only)</strong> role. 
            Viewers have permission to explore projects, customers, receipts, and performance summaries, but cannot create, modify, or delete records.
            <br /><br />
            If you need to make changes, please contact your organization administrator to request an <strong>Accountant</strong> or <strong>Admin</strong> role.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2">
          <AlertDialogAction 
            onClick={() => setDeniedError(null)} 
            className="w-full sm:w-auto text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900"
          >
            Understood
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
