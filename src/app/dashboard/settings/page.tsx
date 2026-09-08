'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, collection, getDocs, writeBatch, query, updateDoc, where, addDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { User as UserProfile, TenantInvite } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserProfile } from '@/hooks/use-user-profile';
import { Shield, ShieldAlert, Users, Building, Mail, CheckCircle2, AlertTriangle, Loader2, UserPlus, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const { profile, role, isAdmin, tenantId, companyName, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Team management state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Invite member state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Accountant' | 'Viewer'>('Viewer');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setEmail(profile.email || user?.email || '');
    }
  }, [profile, user]);

  // Load team users scoped to the current tenant workspace
  const fetchAllUsers = async () => {
    if (!firestore || !isAdmin || !tenantId) return;
    setIsLoadingUsers(true);
    try {
      // Query users for this tenant
      const q = query(collection(firestore, 'users'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      let userList = snap.docs.map(d => d.data() as UserProfile);

      // Fallback: If default workspace and empty, load all users to support legacy records
      if (userList.length === 0 && tenantId === 'default_workspace') {
        const fallbackSnap = await getDocs(query(collection(firestore, 'users')));
        userList = fallbackSnap.docs.map(d => d.data() as UserProfile);
      }

      setAllUsers(userList);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin && tenantId) {
      fetchAllUsers();
    }
  }, [isAdmin, tenantId, firestore]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide an email address.' });
      return;
    }

    setIsSendingInvite(true);
    try {
      const normalizedInviteEmail = inviteEmail.trim().toLowerCase();

      // 1. Create the pending invite in Firestore
      const inviteRef = collection(firestore, 'tenant_invites');
      const inviteDocData: Omit<TenantInvite, 'id'> = {
        email: normalizedInviteEmail,
        tenantId,
        companyName,
        role: inviteRole,
        invitedBy: user?.email || 'Admin',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      await addDoc(inviteRef, inviteDocData);

      // 2. Dispatch the email via Mailcow SMTP API
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedInviteEmail,
          role: inviteRole,
          tenantId,
          companyName,
          invitedByName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      toast({
        title: 'Invitation Sent!',
        description: data.message || `An invitation has been dispatched to ${normalizedInviteEmail}.`,
      });

      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('Viewer');
    } catch (err: any) {
      console.error('Error sending invite:', err);
      toast({
        variant: 'destructive',
        title: 'Invitation Error',
        description: err.message || 'Could not send invitation email.',
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !userDocRef) return;
    setIsSaving(true);
    
    try {
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });

      const userData: Partial<UserProfile> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      
      setDocumentNonBlocking(userDocRef, userData, { merge: true });

      toast({
        title: 'Profile Updated',
        description: 'Your personal information has been saved successfully.',
      });
    } catch (error: any) {
      console.error("Error updating profile: ", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'Admin' | 'Accountant' | 'Viewer') => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only Admins can change user roles.' });
      return;
    }

    setUpdatingUserId(targetUserId);
    try {
      const targetUserRef = doc(firestore, 'users', targetUserId);
      await updateDoc(targetUserRef, { role: newRole });

      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));

      toast({
        title: 'Role Updated',
        description: `User role has been updated to ${newRole}.`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Role Update Failed',
        description: error.message || 'Could not update user role.',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteAllPayments = async () => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'Only Admins can delete payment records.' });
      setIsDeleteAlertOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const batch = writeBatch(firestore);
      const projectsQuery = collection(firestore, 'projects');
      const projectsSnap = await getDocs(projectsQuery);

      let deletedCount = 0;

      for (const projectDoc of projectsSnap.docs) {
        const inflowQuery = collection(firestore, 'projects', projectDoc.id, 'inflowTransactions');
        const inflowSnap = await getDocs(inflowQuery);
        inflowSnap.forEach(inflowDoc => {
          batch.delete(inflowDoc.ref);
          deletedCount++;
        });
      }

      await batch.commit();

      toast({
        title: 'Payments Wiped',
        description: `Successfully removed ${deletedCount} payment records across all projects.`,
      });
    } catch (error: any) {
      console.error("Error deleting payments: ", error);
      toast({
        variant: 'destructive',
        title: 'Wipe Failed',
        description: error.message || 'Could not delete payment records.',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Workspace / Company Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl font-bold tracking-tight text-white">{companyName}</h2>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Multi-Tenant Active
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Workspace ID: <code className="bg-slate-950/60 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px]">{tenantId}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-white/20">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Your Role: {role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account & Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account credentials and personal profile.</CardDescription>
            </div>
            <Badge 
              variant={role === 'Admin' ? 'default' : role === 'Accountant' ? 'secondary' : 'outline'}
              className="px-3 py-1 text-xs font-semibold flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              Role: {role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Email is tied to your login identity. To change it or reset passwords, use the Mailcow SMTP reset option.
              </p>
            </div>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team & Role Management (Admins Only) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Team & Role Management</CardTitle>
                <CardDescription>
                  {isAdmin 
                    ? `Manage member access and invite colleagues to ${companyName}.`
                    : 'View tenant role access permissions.'}
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button 
                size="sm" 
                onClick={() => setIsInviteOpen(true)}
                className="flex items-center gap-1.5 self-start sm:self-auto"
              >
                <UserPlus className="h-4 w-4" />
                Invite Colleague
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <div className="space-y-4">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading team members...
                </div>
              ) : allUsers.length > 0 ? (
                <div className="border rounded-lg overflow-hidden divide-y text-sm">
                  {allUsers.map((u) => (
                    <div key={u.id} className="p-3.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {u.firstName} {u.lastName} {u.id === user?.uid && <span className="text-xs text-muted-foreground font-normal">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={u.role}
                          onValueChange={(val: 'Admin' | 'Accountant' | 'Viewer') => handleRoleChange(u.id, val)}
                          disabled={u.id === user?.uid || updatingUserId === u.id}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No other users found in this tenant directory.</p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-2">
              <p><strong>Your Current Role:</strong> {role}</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Admin:</strong> Complete administrative control, role assignment, project creation/deletion.</li>
                <li><strong>Accountant:</strong> Can create inflows, expenses, receipts, and view financial statements.</li>
                <li><strong>Viewer:</strong> Read-only access to projects, flats, and dashboards.</li>
              </ul>
              <p className="pt-2 text-[11px] text-slate-500">Contact a tenant Administrator if you require elevated privileges.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanent actions affecting the tenant database. Only accessible by Admins.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-white dark:bg-slate-900 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete All Payments</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently wipes all customer cash inflow payment records across all projects.
              </p>
            </div>
            
            {isAdmin ? (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  setTimeout(() => setIsDeleteAlertOpen(true), 0);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Wiping...' : 'Delete All Payments'}
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Admin Privilege Required
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decoupled Page-Level Alert Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently erase every single payment record in the entire database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllPayments}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, permanently delete all payments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Colleague Dialog (Mailcow SMTP Integrated) */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogTitle>Invite Colleague to {companyName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send an email invitation. The recipient will be automatically attached to your company workspace upon signup.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs font-medium">Colleague's Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="pl-9"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isSendingInvite}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role" className="text-xs font-medium">Assigned Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(val: 'Admin' | 'Accountant' | 'Viewer') => setInviteRole(val)}
                disabled={isSendingInvite}
              >
                <SelectTrigger id="invite-role" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full administrative & billing control)</SelectItem>
                  <SelectItem value="Accountant">Accountant (Inflows, expenses & receipts)</SelectItem>
                  <SelectItem value="Viewer">Viewer (Read-only project and sales access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsInviteOpen(false)}
                disabled={isSendingInvite}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSendingInvite}>
                {isSendingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching via Mailcow...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
