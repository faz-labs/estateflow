'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Shield, ShieldAlert, Users, Building, Mail, CheckCircle2, AlertTriangle, Loader2, UserPlus, Building2, Upload, Image as ImageIcon, Phone, MapPin, Globe, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const { profile, role, isAdmin, tenantId, companyName, tenant, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Company Profile / Branding state
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Team management state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Request new user state (provisioned via platform admin)
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestName, setRequestName] = useState('');
  const [requestRole, setRequestRole] = useState<'Admin' | 'Accountant' | 'Viewer'>('Viewer');
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setEmail(profile.email || user?.email || '');
    }
  }, [profile, user]);

  useEffect(() => {
    if (tenant) {
      setCompanyNameInput(tenant.name || companyName || '');
      setCompanyAddress(tenant.address || '');
      setCompanyPhone(tenant.phone || '');
      setCompanyEmail(tenant.email || '');
      setCompanyWebsite(tenant.website || '');
      setCompanyLogo(tenant.logo || '');
    } else if (companyName) {
      setCompanyNameInput(companyName);
    }
  }, [tenant, companyName]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select an image file (PNG, JPG, WebP).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Target maximum dimensions: 400x160 px
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 160;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP with 0.85 quality for minimal size (< 40KB)
        const compressedBase64 = canvas.toDataURL('image/webp', 0.85);

        // Check payload size
        const sizeInKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
        if (sizeInKB > 100) {
          toast({
            variant: 'destructive',
            title: 'Image Too Large',
            description: `Compressed image is ${sizeInKB}KB. Please choose a smaller logo.`,
          });
          return;
        }

        setCompanyLogo(compressedBase64);
        toast({
          title: 'Logo Prepared',
          description: `Optimized to ${width}x${height}px (${sizeInKB}KB). Click "Save Company Details" to apply.`,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !firestore || !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: 'Only Organization Admins can update company branding.',
      });
      return;
    }

    if (!companyNameInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name Required',
        description: 'Please enter a valid company name.',
      });
      return;
    }

    setIsSavingCompany(true);
    try {
      const tenantDocRef = doc(firestore, 'tenants', tenantId);
      await updateDoc(tenantDocRef, {
        name: companyNameInput.trim(),
        address: companyAddress.trim(),
        phone: companyPhone.trim(),
        email: companyEmail.trim(),
        website: companyWebsite.trim(),
        logo: companyLogo || '',
      });

      // Synchronize companyName on current user profile
      if (user) {
        await updateDoc(doc(firestore, 'users', user.uid), {
          companyName: companyNameInput.trim(),
        });
      }

      toast({
        title: 'Company Branding Updated',
        description: 'Company information and logo saved. All future printed receipts and invoices will use this branding.',
      });
    } catch (error: any) {
      console.error('Error updating company profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update company profile.',
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

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

  const handleSendUserRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide an email address.' });
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const normalizedReqEmail = requestEmail.trim().toLowerCase();

      // Submit user access request to Firestore for platform admin review & provisioning
      const reqRef = collection(firestore, 'user_requests');
      await addDoc(reqRef, {
        tenantId,
        companyName,
        requestedByEmail: user?.email || '',
        requestedByName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : user?.displayName || 'User',
        targetEmail: normalizedReqEmail,
        targetName: requestName.trim(),
        targetRole: requestRole,
        notes: requestNotes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Request Submitted!',
        description: `Your request to add ${normalizedReqEmail} as ${requestRole} has been submitted to the platform administrator.`,
      });

      setIsRequestOpen(false);
      setRequestEmail('');
      setRequestName('');
      setRequestNotes('');
      setRequestRole('Viewer');
    } catch (err: any) {
      console.error('Error submitting user request:', err);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: err.message || 'Could not submit user request. Please try again.',
      });
    } finally {
      setIsSubmittingRequest(false);
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

      {/* Company Branding & Receipt Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Company Branding & Invoicing Profile</CardTitle>
                <CardDescription>
                  Configure your company name, logo, and contact information rendered on all payment receipts and invoices.
                </CardDescription>
              </div>
            </div>
            {!isAdmin && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Read-Only (Admin Access Required)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSaveCompany}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyNameInput" className="text-xs font-medium flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" /> Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyNameInput"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  placeholder="e.g. Apex Property Developments Ltd."
                  disabled={!isAdmin || isSavingCompany}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyEmail" className="text-xs font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Invoicing / Support Email
                </Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="e.g. billing@apexdevelopments.com"
                  disabled={!isAdmin || isSavingCompany}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyPhone" className="text-xs font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Company Phone / Hotline
                </Label>
                <Input
                  id="companyPhone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="e.g. +880 1700-000000"
                  disabled={!isAdmin || isSavingCompany}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyWebsite" className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Official Website
                </Label>
                <Input
                  id="companyWebsite"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="e.g. www.apexdevelopments.com"
                  disabled={!isAdmin || isSavingCompany}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyAddress" className="text-xs font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Office / Registered Address
              </Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="e.g. Suite 402, Green Tower, Plot 14, Gulshan-2, Dhaka"
                disabled={!isAdmin || isSavingCompany}
              />
            </div>

            {/* Company Logo Upload & Preview */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /> Company Logo (Printed on Receipts)
              </Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                {companyLogo ? (
                  <div className="relative group bg-white p-3 rounded-md border border-slate-200 flex items-center justify-center min-w-[160px] h-20 shadow-sm">
                    <img
                      src={companyLogo}
                      alt="Company Logo Preview"
                      className="max-h-16 max-w-[200px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-36 rounded-md border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-muted-foreground text-xs p-2">
                    <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                    <span>No Logo Uploaded</span>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={!isAdmin || isSavingCompany}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={!isAdmin || isSavingCompany}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {companyLogo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    {companyLogo && isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCompanyLogo('')}
                        disabled={isSavingCompany}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    PNG, JPG, or WebP. Automatically resized to max 400&times;160px and compressed (&lt;50KB) to ensure zero server load and crisp A4 printing.
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <Button type="submit" size="sm" disabled={isSavingCompany}>
                {isSavingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSavingCompany ? 'Saving Company...' : 'Save Company Details'}
              </Button>
            )}
          </form>
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
                Email is tied to your login identity. To change it or reset passwords, use the Forgot Password option on the sign-in screen.
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
                    ? `Manage member access or submit a request to platform administrator to provision new users for ${companyName}.`
                    : 'View tenant role access permissions.'}
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button 
                size="sm" 
                onClick={() => setIsRequestOpen(true)}
                className="flex items-center gap-1.5 self-start sm:self-auto text-xs"
              >
                <UserPlus className="h-4 w-4" />
                Request User Access
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

      {/* Request User Access Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogTitle>Request User Access for {companyName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              User accounts are provisioned centrally by the platform administrator. Please provide the colleague's email address and choose the designated role below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendUserRequest} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="req-email" className="text-xs font-medium">
                Colleague's Work Email <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="req-email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="pl-9 text-xs"
                  required
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  disabled={isSubmittingRequest}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-name" className="text-xs font-medium">Colleague's Full Name</Label>
              <Input
                id="req-name"
                placeholder="Jane Doe"
                className="text-xs"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                disabled={isSubmittingRequest}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-role" className="text-xs font-medium">
                Requested Workspace Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={requestRole}
                onValueChange={(val: 'Admin' | 'Accountant' | 'Viewer') => setRequestRole(val)}
                disabled={isSubmittingRequest}
              >
                <SelectTrigger id="req-role" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full Administrative & Management Control)</SelectItem>
                  <SelectItem value="Accountant">Accountant (Financial Inflows, Expenses & Receipts)</SelectItem>
                  <SelectItem value="Viewer">Viewer (Read-Only Performance & Project Access)</SelectItem>
                </SelectContent>
              </Select>

              {/* Visual Breakdown of the 3 Roles */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div 
                  onClick={() => setRequestRole('Admin')}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    requestRole === 'Admin' 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> 1. Admin Role
                    </span>
                    {requestRole === 'Admin' && <span className="text-[10px] text-primary font-medium">Selected</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Complete administrative control: update company branding, edit invoice details, oversee team members, and manage all projects and sales.
                  </p>
                </div>

                <div 
                  onClick={() => setRequestRole('Accountant')}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    requestRole === 'Accountant' 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> 2. Accountant Role
                    </span>
                    {requestRole === 'Accountant' && <span className="text-[10px] text-primary font-medium">Selected</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Financial operations: record payments, log vendor expenses, track operating costs, print official A4 receipts, and review cash flows.
                  </p>
                </div>

                <div 
                  onClick={() => setRequestRole('Viewer')}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    requestRole === 'Viewer' 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                      : 'border-slate-200 dark:border-slate-800 bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> 3. Viewer Role (Read-Only)
                    </span>
                    {requestRole === 'Viewer' && <span className="text-[10px] text-primary font-medium">Selected</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Strictly read-only: review project availability, view customer information, and inspect analytical reports. Cannot add, edit, or delete records.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-notes" className="text-xs font-medium">Notes / Justification for Administrator</Label>
              <Input
                id="req-notes"
                placeholder="e.g. Senior property manager joining our Uttara site branch"
                className="text-xs"
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                disabled={isSubmittingRequest}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setIsRequestOpen(false)}
                disabled={isSubmittingRequest}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingRequest}>
                {isSubmittingRequest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  'Send Request to Admin'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
