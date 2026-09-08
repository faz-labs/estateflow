'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, TenantNotice, User as UserProfile, SubscriptionPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Users,
  ShieldCheck,
  PlusCircle,
  UserPlus,
  Loader2,
  Bell,
  Copy,
  Check,
  Power,
  Clock,
  AlertCircle,
  Trash2,
  Send,
  Eye,
} from 'lucide-react';

export default function SuperAdminTenantsPage() {
  const { isSuperAdmin, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);

  // 1. Create Tenant Dialog State
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<'demo' | 'pro' | 'ultra'>('demo');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // 2. Add / Provision User Dialog State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userTenantId, setUserTenantId] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Accountant' | 'Viewer'>('Accountant');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // 3. Broadcast Notice Dialog State
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeTenantId, setNoticeTenantId] = useState('all');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'info' | 'warning' | 'urgent'>('info');
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  // 4. View Members Dialog State
  const [selectedTenantForUsers, setSelectedTenantForUsers] = useState<Tenant | null>(null);

  // 5. Manage Notices Dialog State
  const [isManageNoticesOpen, setIsManageNoticesOpen] = useState(false);

  // Auto-generate slug for newTenantId
  const handleTenantNameChange = (name: string) => {
    setNewTenantName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 18);
    setNewTenantId(slug ? `${slug}-${Date.now().toString(36).slice(-4)}` : '');
  };

  // Load All Tenants, Users, and Notices
  const loadData = async () => {
    if (!firestore) return;
    setIsLoadingData(true);
    try {
      const [tenantsSnap, usersSnap, noticesSnap] = await Promise.all([
        getDocs(query(collection(firestore, 'tenants'))),
        getDocs(query(collection(firestore, 'users'))),
        getDocs(query(collection(firestore, 'notices'), orderBy('createdAt', 'desc'))),
      ]);

      const loadedTenants: Tenant[] = tenantsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || d.id,
          ownerUid: data.ownerUid || '',
          createdAt: data.createdAt || new Date().toISOString(),
          plan: data.plan || 'pro',
          status: data.status || 'active',
          expiresAt: data.expiresAt,
          maxProjects: data.maxProjects,
        } as Tenant;
      });

      const loadedUsers: UserProfile[] = usersSnap.docs.map((d) => d.data() as UserProfile);
      const loadedNotices: TenantNotice[] = noticesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TenantNotice[];

      setTenants(loadedTenants);
      setUsers(loadedUsers);
      setNotices(loadedNotices);
    } catch (err: any) {
      console.error('Error fetching SuperAdmin data:', err);
      toast({
        variant: 'destructive',
        title: 'Data Fetch Error',
        description: err.message || 'Could not load data from Firestore.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, firestore]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTenantId(text);
    setTimeout(() => setCopiedTenantId(null), 2000);
    toast({ title: 'Copied!', description: 'Tenant ID copied to clipboard.' });
  };

  // 1. Create Tenant & Optionally Provision Initial Admin
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Tenant name and ID are required.' });
      return;
    }

    setIsCreatingTenant(true);
    try {
      const tenantDocRef = doc(firestore, 'tenants', newTenantId);

      // Calculate plan parameters
      let expiresAt: string | undefined = undefined;
      let maxProjects = 999999; // Default ultra

      if (newTenantPlan === 'demo') {
        expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        maxProjects = 5;
      } else if (newTenantPlan === 'pro') {
        maxProjects = 10;
      }

      const tenantData: Tenant = {
        id: newTenantId,
        name: newTenantName.trim(),
        ownerUid: user?.uid || 'superadmin',
        createdAt: new Date().toISOString(),
        plan: newTenantPlan,
        status: 'active',
        expiresAt,
        maxProjects,
      };

      await setDoc(tenantDocRef, tenantData);

      // If initial admin credentials were provided, provision them directly
      if (adminEmail.trim() && adminPassword) {
        try {
          await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: adminEmail.trim(),
              password: adminPassword,
              firstName: adminFirstName.trim() || 'Admin',
              lastName: adminLastName.trim() || '',
              role: 'Admin',
              tenantId: newTenantId,
              companyName: newTenantName.trim(),
            }),
          });
        } catch (provErr) {
          console.warn('Initial admin provisioning note:', provErr);
        }
      }

      toast({
        title: 'Tenant Workspace Provisioned!',
        description: `"${newTenantName}" has been created with plan: ${newTenantPlan.toUpperCase()}.`,
      });

      setIsCreateTenantOpen(false);
      setNewTenantName('');
      setNewTenantId('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminFirstName('');
      setAdminLastName('');
      loadData();
    } catch (err: any) {
      console.error('Error creating tenant:', err);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: err.message || 'Could not provision workspace.',
      });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  // 2. Add User with Password to Tenant
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userPassword || !userTenantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Email, password, and tenant are required.' });
      return;
    }

    if (userPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters.' });
      return;
    }

    setIsAddingUser(true);
    try {
      const targetTenant = tenants.find((t) => t.id === userTenantId);
      const companyName = targetTenant ? targetTenant.name : 'Workspace';

      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail.trim(),
          password: userPassword,
          firstName: userFirstName.trim() || 'User',
          lastName: userLastName.trim() || '',
          role: userRole,
          tenantId: userTenantId,
          companyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      // Also ensure Firestore document has mustChangePassword flag
      if (data.uid) {
        await setDoc(doc(firestore, 'users', data.uid), {
          id: data.uid,
          email: userEmail.trim().toLowerCase(),
          firstName: userFirstName.trim() || 'User',
          lastName: userLastName.trim() || '',
          role: userRole,
          tenantId: userTenantId,
          companyName,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      toast({
        title: 'User Account Created!',
        description: `${userEmail} has been added. They will be required to change their password on first login.`,
      });

      setIsAddUserOpen(false);
      setUserEmail('');
      setUserPassword('');
      setUserFirstName('');
      setUserLastName('');
      setUserTenantId('');
      loadData();
    } catch (err: any) {
      console.error('Error adding user:', err);
      toast({
        variant: 'destructive',
        title: 'Provisioning Failed',
        description: err.message || 'Could not create user account.',
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  // 3. Toggle Tenant Access (Active <-> Suspended)
  const handleToggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const tenantDocRef = doc(firestore, 'tenants', tenantId);
      await updateDoc(tenantDocRef, { status: newStatus });

      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, status: newStatus as any } : t))
      );

      toast({
        title: newStatus === 'active' ? 'Tenant Activated' : 'Tenant Suspended',
        description: `Access for tenant ${tenantId} is now ${newStatus.toUpperCase()}.`,
      });
    } catch (err: any) {
      console.error('Error toggling tenant status:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Could not update tenant status.',
      });
    }
  };

  // 4. Broadcast Notice to Tenant(s)
  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
      return;
    }

    setIsSendingNotice(true);
    try {
      const noticeDocData: Omit<TenantNotice, 'id'> = {
        tenantId: noticeTenantId,
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        priority: noticePriority,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || 'SuperAdmin',
      };

      await addDoc(collection(firestore, 'notices'), noticeDocData);

      const targetLabel = noticeTenantId === 'all'
        ? 'All Tenants (Broadcast)'
        : tenants.find((t) => t.id === noticeTenantId)?.name || noticeTenantId;

      toast({
        title: 'Notice Dispatched!',
        description: `Notice sent to ${targetLabel}. Users will see it in their notification panel.`,
      });

      setIsNoticeOpen(false);
      setNoticeTitle('');
      setNoticeMessage('');
      setNoticeTenantId('all');
      loadData();
    } catch (err: any) {
      console.error('Error sending notice:', err);
      toast({
        variant: 'destructive',
        title: 'Notice Error',
        description: err.message || 'Could not send notice.',
      });
    } finally {
      setIsSendingNotice(false);
    }
  };

  // 5. Delete a Notice
  const handleDeleteNotice = async (noticeId: string) => {
    try {
      await deleteDoc(doc(firestore, 'notices', noticeId));
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      toast({ title: 'Notice Deleted', description: 'The notice has been removed.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Super Admin access...
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-destructive">Super Admin Access Required</h2>
        <p className="text-xs text-muted-foreground">
          This portal is reserved for root platform administrators (<code>anonto.kings9@gmail.com</code> or <code>admin@remotizedit.online</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 text-white border border-amber-500/30 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Super Admin Control Hub</h1>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-semibold">
              Root Authority
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Authenticated as <strong>{user?.email}</strong>. Manage SaaS tenants, subscription tiers, access locks, and tenant notices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={() => setIsCreateTenantOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold flex items-center gap-1.5 shadow"
          >
            <PlusCircle className="h-4 w-4" /> Create Tenant
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddUserOpen(true)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNoticeOpen(true)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center gap-1.5"
          >
            <Send className="h-4 w-4" /> Send Notice
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsManageNoticesOpen(true)}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1"
          >
            <Bell className="h-3.5 w-3.5" /> Notices ({notices.length})
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" /> Total Tenants
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{tenants.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              {tenants.filter((t) => t.status !== 'suspended').length} active, {tenants.filter((t) => t.status === 'suspended').length} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" /> Demo Tiers (15d)
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {tenants.filter((t) => t.plan === 'demo').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Evaluation trial workspaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Pro & Ultra Tiers
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {tenants.filter((t) => t.plan === 'pro' || t.plan === 'ultra' || t.plan === 'enterprise').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Active commercial clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-500" /> Total Users
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{users.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Platform accounts provisioned</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Tenants</CardTitle>
              <CardDescription>
                Manage company workspaces, toggle active/suspended access, and configure subscription tiers.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoadingData}>
              {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading tenant database...
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/20 space-y-3">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No tenants created yet.</p>
              <p className="text-xs text-muted-foreground">
                Click "Create Tenant" above to provision your first client company.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Tenant ID</TableHead>
                    <TableHead>Subscription Plan</TableHead>
                    <TableHead>Access Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => {
                    const tenantUsers = users.filter((u) => u.tenantId === t.id);
                    const isSuspended = t.status === 'suspended';

                    // Demo expiration calculation
                    let demoStatus = '';
                    if (t.plan === 'demo' && t.expiresAt) {
                      const diffDays = Math.ceil(
                        (new Date(t.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      demoStatus = diffDays > 0 ? `${diffDays}d left` : 'Expired';
                    }

                    return (
                      <TableRow key={t.id} className={isSuspended ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                            {isSuspended && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Suspended
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                              {t.id}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(t.id)}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              title="Copy Tenant ID"
                            >
                              {copiedTenantId === t.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                t.plan === 'ultra'
                                  ? 'default'
                                  : t.plan === 'pro'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[11px] capitalize"
                            >
                              {t.plan || 'Demo'}
                              {t.plan === 'pro' ? ' (10 Projects)' : ''}
                              {t.plan === 'ultra' ? ' (Unlimited)' : ''}
                            </Badge>
                            {demoStatus && (
                              <span className={`text-[10px] font-medium ${demoStatus === 'Expired' ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                {demoStatus}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Button
                            size="sm"
                            variant={isSuspended ? 'destructive' : 'outline'}
                            onClick={() => handleToggleTenantStatus(t.id, t.status)}
                            className="h-7 text-xs flex items-center gap-1.5"
                          >
                            <Power className="h-3 w-3" />
                            {isSuspended ? 'Turn On Access' : 'Turn Off Access'}
                          </Button>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tenantUsers.length} member{tenantUsers.length === 1 ? '' : 's'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSelectedTenantForUsers(t)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Users
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Create New Tenant                                           */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <Building2 className="h-5 w-5" />
            </div>
            <DialogTitle>Provision New Tenant Workspace</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an isolated company environment and choose their subscription plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name" className="text-xs font-medium">Company / Tenant Name</Label>
              <Input
                id="tenant-name"
                placeholder="e.g., Apex Properties Ltd."
                value={newTenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                required
                disabled={isCreatingTenant}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tenant-id" className="text-xs font-medium">Unique Tenant ID</Label>
              <Input
                id="tenant-id"
                placeholder="apex-properties-xyz"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                required
                disabled={isCreatingTenant}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Internal unique slug scoping all documents for this tenant.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tenant-plan" className="text-xs font-medium">Subscription Tier</Label>
              <Select
                value={newTenantPlan}
                onValueChange={(val: 'demo' | 'pro' | 'ultra') => setNewTenantPlan(val)}
                disabled={isCreatingTenant}
              >
                <SelectTrigger id="tenant-plan" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo Plan (15-Day Trial &bull; Up to 5 projects)</SelectItem>
                  <SelectItem value="pro">Pro Plan (Up to 10 Projects &bull; Standard Support)</SelectItem>
                  <SelectItem value="ultra">Ultra Plan (Unlimited Projects &bull; Full Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 border-t space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Initial Tenant Admin (Optional)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="admin-fname" className="text-xs">First Name</Label>
                  <Input
                    id="admin-fname"
                    placeholder="John"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    disabled={isCreatingTenant}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-lname" className="text-xs">Last Name</Label>
                  <Input
                    id="admin-lname"
                    placeholder="Doe"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    disabled={isCreatingTenant}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-medium">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@company.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={isCreatingTenant}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-pass" className="text-xs font-medium">Temporary Password</Label>
                <Input
                  id="admin-pass"
                  type="password"
                  placeholder="Initial temporary password (min 6 chars)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isCreatingTenant}
                />
                <p className="text-[11px] text-muted-foreground">
                  The user will be required to change this password on their first login.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateTenantOpen(false)}
                disabled={isCreatingTenant}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingTenant} className="bg-amber-600 hover:bg-amber-700 text-white">
                {isCreatingTenant ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning...
                  </>
                ) : (
                  'Create Tenant'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Add User to Tenant                                          */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <UserPlus className="h-5 w-5" />
            </div>
            <DialogTitle>Add User to Tenant Workspace</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provision an account with email and temporary password. They will be forced to change password on first login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-tenant" className="text-xs font-medium">Target Tenant</Label>
              <Select
                value={userTenantId}
                onValueChange={setUserTenantId}
                required
                disabled={isAddingUser}
              >
                <SelectTrigger id="add-tenant" className="text-xs">
                  <SelectValue placeholder="Select target tenant..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="user-fname" className="text-xs">First Name</Label>
                <Input
                  id="user-fname"
                  placeholder="First name"
                  value={userFirstName}
                  onChange={(e) => setUserFirstName(e.target.value)}
                  disabled={isAddingUser}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user-lname" className="text-xs">Last Name</Label>
                <Input
                  id="user-lname"
                  placeholder="Last name"
                  value={userLastName}
                  onChange={(e) => setUserLastName(e.target.value)}
                  disabled={isAddingUser}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-medium">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@company.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
                disabled={isAddingUser}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password" className="text-xs font-medium">Temporary Password</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Temporary password (min 6 chars)"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
                disabled={isAddingUser}
              />
              <p className="text-[11px] text-muted-foreground">
                Upon first login, the user will be locked until they set their permanent password.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-medium">Role</Label>
              <Select
                value={userRole}
                onValueChange={(val: 'Admin' | 'Accountant' | 'Viewer') => setUserRole(val)}
                disabled={isAddingUser}
              >
                <SelectTrigger id="user-role" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full company control)</SelectItem>
                  <SelectItem value="Accountant">Accountant (Inflows, expenses & receipts)</SelectItem>
                  <SelectItem value="Viewer">Viewer (Read-only access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddUserOpen(false)}
                disabled={isAddingUser}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isAddingUser}>
                {isAddingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Provisioning...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Broadcast Notice to Tenant                                  */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <Send className="h-5 w-5" />
            </div>
            <DialogTitle>Send Notice to Tenant</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Broadcast an announcement to an individual tenant or platform-wide. It will display in their in-app notification bell.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendNotice} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="notice-tenant" className="text-xs font-medium">Target Audience</Label>
              <Select
                value={noticeTenantId}
                onValueChange={setNoticeTenantId}
                disabled={isSendingNotice}
              >
                <SelectTrigger id="notice-tenant" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants (Platform Broadcast)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-priority" className="text-xs font-medium">Notice Priority</Label>
              <Select
                value={noticePriority}
                onValueChange={(val: 'info' | 'warning' | 'urgent') => setNoticePriority(val)}
                disabled={isSendingNotice}
              >
                <SelectTrigger id="notice-priority" className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">General Update / Info</SelectItem>
                  <SelectItem value="warning">Important Notice</SelectItem>
                  <SelectItem value="urgent">Urgent Alert / Billing Action</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-title" className="text-xs font-medium">Notice Title</Label>
              <Input
                id="notice-title"
                placeholder="e.g., Scheduled Maintenance or Trial Expiration"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                required
                disabled={isSendingNotice}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-msg" className="text-xs font-medium">Message Body</Label>
              <Textarea
                id="notice-msg"
                placeholder="Write your announcement message here..."
                rows={3}
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                required
                disabled={isSendingNotice}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNoticeOpen(false)}
                disabled={isSendingNotice}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSendingNotice}>
                {isSendingNotice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Notice'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: View Members of Selected Tenant                             */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={!!selectedTenantForUsers} onOpenChange={(open) => !open && setSelectedTenantForUsers(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Members of {selectedTenantForUsers?.name}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Users attached to workspace ID: <code>{selectedTenantForUsers?.id}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(() => {
              const currentMembers = users.filter((u) => u.tenantId === selectedTenantForUsers?.id);
              if (currentMembers.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No users currently assigned to this workspace. Use "Add User" to create one.
                  </p>
                );
              }
              return (
                <div className="border rounded-lg divide-y text-xs">
                  {currentMembers.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{m.firstName} {m.lastName}</p>
                        <p className="text-muted-foreground">{m.email}</p>
                        {m.mustChangePassword && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            &bull; Pending password change on first login
                          </span>
                        )}
                      </div>
                      <Badge variant="outline">{m.role}</Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedTenantForUsers(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Manage Notices History                                      */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isManageNoticesOpen} onOpenChange={setIsManageNoticesOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sent Notices & Broadcasts</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review and delete notices active across your client tenants.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 max-h-96 overflow-y-auto space-y-2">
            {notices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No active notices published yet. Use "Send Notice" to broadcast one.
              </p>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="p-3 border rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{n.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {n.priority || 'info'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(n.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Delete notice"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{n.message}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                    <span>
                      Target: <strong>{n.tenantId === 'all' ? 'All Tenants' : n.tenantId}</strong>
                    </span>
                    <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsManageNoticesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
