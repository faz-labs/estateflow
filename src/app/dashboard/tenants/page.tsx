'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  onSnapshot,
} from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import type { Tenant, TenantNotice, User as UserProfile, SubscriptionPlan, DemoRequest } from '@/lib/types';
import { SYSTEM_MODULES, SystemModule } from '@/lib/types';
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
  ShieldAlert,
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
  Pencil,
  UserCheck,
  XCircle,
  Boxes,
  Layers,
  Sliders,
  CheckCircle2,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  getCurrency,
  DEFAULT_CURRENCY_CODE,
} from '@/lib/currencies';

export interface UserProvisionRequest {
  id: string;
  tenantId: string;
  companyName: string;
  requestedByEmail: string;
  requestedByName: string;
  targetEmail: string;
  targetName: string;
  targetRole: 'Admin' | 'Accountant' | 'Viewer';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Instantly redirect if not logged in or not super admin
  useEffect(() => {
    if (isProfileLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isProfileLoading, isSuperAdmin, router]);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [userRequests, setUserRequests] = useState<UserProvisionRequest[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [selectedRequestToProvision, setSelectedRequestToProvision] = useState<UserProvisionRequest | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);

  // 1. Create Tenant Dialog State
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<'demo' | 'pro' | 'ultra'>('demo');
  const [newTenantCurrency, setNewTenantCurrency] = useState<string>(DEFAULT_CURRENCY_CODE);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  // Edit Tenant & Currency Dialog State
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantPlan, setEditTenantPlan] = useState<'demo' | 'pro' | 'ultra'>('pro');
  const [editTenantCurrency, setEditTenantCurrency] = useState<string>(DEFAULT_CURRENCY_CODE);
  const [isSavingEditTenant, setIsSavingEditTenant] = useState(false);

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

  // 6. Tenant Modular Feature Assignment State
  const [isModulesDialogOpen, setIsModulesDialogOpen] = useState(false);
  const [selectedTenantForModules, setSelectedTenantForModules] = useState<Tenant | null>(null);
  const [tenantActiveModules, setTenantActiveModules] = useState<string[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);

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

      let loadedRequests: UserProvisionRequest[] = [];
      try {
        // Query without orderBy to eliminate composite index requirement
        const userRequestsSnap = await getDocs(collection(firestore, 'user_requests'));
        loadedRequests = (userRequestsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as UserProvisionRequest[]).sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      } catch (reqErr) {
        console.warn('Client user requests load note:', reqErr);
      }

      // If client reading returned 0 or errored (e.g. security rules pending sync), query server API
      if (loadedRequests.length === 0) {
        try {
          const res = await fetch('/api/user-requests');
          if (res.ok) {
            const apiData = await res.json();
            if (apiData.requests && Array.isArray(apiData.requests)) {
              loadedRequests = apiData.requests;
            }
          }
        } catch (apiErr) {
          console.warn('Server user requests fallback notice:', apiErr);
        }
      }

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
          currency: data.currency || DEFAULT_CURRENCY_CODE,
          assignedModules: Array.isArray(data.assignedModules) && data.assignedModules.length > 0
            ? data.assignedModules
            : ['inventory', 'sales_booking', 'procurement_ledger', 'direct_cashflow', 'operating_expenses', 'export_reporting'],
        } as Tenant;
      });

      const loadedUsers: UserProfile[] = usersSnap.docs.map((d) => d.data() as UserProfile);
      const loadedNotices: TenantNotice[] = noticesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TenantNotice[];

      let loadedDemos: DemoRequest[] = [];
      try {
        const demoSnap = await getDocs(collection(firestore, 'demo_requests'));
        loadedDemos = (demoSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as DemoRequest[]).sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      } catch (e) {
        console.warn('Demo requests client query note:', e);
      }

      if (loadedDemos.length === 0) {
        try {
          const res = await fetch('/api/demo-request');
          if (res.ok) {
            const dData = await res.json();
            if (dData.requests && Array.isArray(dData.requests)) {
              loadedDemos = dData.requests;
            }
          }
        } catch (apiErr) {
          console.warn('Demo requests server fallback note:', apiErr);
        }
      }

      setTenants(loadedTenants);
      setUsers(loadedUsers);
      setNotices(loadedNotices);
      setUserRequests(loadedRequests);
      setDemoRequests(loadedDemos);
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

  // Real-time live listener for incoming user provisioning requests
  useEffect(() => {
    if (!firestore || !isSuperAdmin) return;
    try {
      const unsub = onSnapshot(collection(firestore, 'user_requests'), (snapshot) => {
        if (!snapshot.empty) {
          const liveRequests = (snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as UserProvisionRequest[]).sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          setUserRequests(liveRequests);
        }
      }, (err) => {
        console.warn('Live user requests listener notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not register user requests snapshot:', e);
    }
  }, [firestore, isSuperAdmin]);

  // Real-time live listener for incoming demo inquiries from website
  useEffect(() => {
    if (!firestore || !isSuperAdmin) return;
    try {
      const unsub = onSnapshot(collection(firestore, 'demo_requests'), (snapshot) => {
        if (!snapshot.empty) {
          const liveDemos = (snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as DemoRequest[]).sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          setDemoRequests(liveDemos);
        }
      }, (err) => {
        console.warn('Live demo requests listener notice:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not register demo requests snapshot:', e);
    }
  }, [firestore, isSuperAdmin]);

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
        currency: newTenantCurrency,
        status: 'active',
        expiresAt,
        maxProjects,
      };

      await setDoc(tenantDocRef, tenantData);

      // If initial admin credentials were provided, provision them directly
      if (adminEmail.trim() && adminPassword) {
        try {
          const idToken = await user?.getIdToken();
          await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
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
      setNewTenantCurrency(DEFAULT_CURRENCY_CODE);
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

      const idToken = await user?.getIdToken();
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
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

      // If provisioned from a pending request, mark it as approved
      if (selectedRequestToProvision) {
        try {
          // 1. Update via server REST API
          fetch('/api/user-requests', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: selectedRequestToProvision.id, status: 'approved' }),
          }).catch((err) => console.warn('Server patch request note:', err));

          // 2. Update via client Firestore
          await updateDoc(doc(firestore, 'user_requests', selectedRequestToProvision.id), {
            status: 'approved',
            approvedAt: new Date().toISOString(),
          }).catch(() => {});

          setUserRequests((prev) =>
            prev.map((r) =>
              r.id === selectedRequestToProvision.id ? { ...r, status: 'approved' } : r
            )
          );
        } catch (e) {
          console.warn('Failed to update request status:', e);
        }
        setSelectedRequestToProvision(null);
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

  // Handle approving a user request: opens Add User dialog pre-filled
  const handleApproveRequest = (req: UserProvisionRequest) => {
    setSelectedRequestToProvision(req);
    setUserTenantId(req.tenantId);
    setUserEmail(req.targetEmail);
    const nameParts = (req.targetName || '').trim().split(' ');
    setUserFirstName(nameParts[0] || 'User');
    setUserLastName(nameParts.slice(1).join(' ') || '');
    setUserRole(req.targetRole || 'Viewer');
    setUserPassword('');
    setIsAddUserOpen(true);
  };

  // Handle rejecting a user request
  const handleRejectRequest = async (requestId: string) => {
    try {
      // 1. Update via server REST API
      fetch('/api/user-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: 'rejected' }),
      }).catch((err) => console.warn('Server patch request note:', err));

      // 2. Update via client Firestore
      await updateDoc(doc(firestore, 'user_requests', requestId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
      }).catch(() => {});

      setUserRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
      );
      toast({
        title: 'Request Marked Rejected',
        description: 'The user access request status has been updated.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    }
  };

  // Modular Feature Allocation Handlers
  const handleOpenModules = (tenant: Tenant) => {
    setSelectedTenantForModules(tenant);
    setTenantActiveModules(
      tenant.assignedModules || [
        'inventory',
        'sales_booking',
        'procurement_ledger',
        'direct_cashflow',
        'operating_expenses',
        'export_reporting',
      ]
    );
    setIsModulesDialogOpen(true);
  };

  const handleToggleModule = (moduleId: string) => {
    setTenantActiveModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSaveModules = async () => {
    if (!firestore || !selectedTenantForModules) return;
    setIsSavingModules(true);
    try {
      await updateDoc(doc(firestore, 'tenants', selectedTenantForModules.id), {
        assignedModules: tenantActiveModules,
        updatedAt: new Date().toISOString(),
      });
      setTenants((prev) =>
        prev.map((t) =>
          t.id === selectedTenantForModules.id
            ? { ...t, assignedModules: tenantActiveModules }
            : t
        )
      );
      toast({
        title: 'Tenant Modules Updated',
        description: `Active operational modules updated for ${selectedTenantForModules.name}.`,
      });
      setIsModulesDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Could not save module configuration.',
      });
    } finally {
      setIsSavingModules(false);
    }
  };

  // Demo Request Handlers
  const handleUpdateDemoStatus = async (
    requestId: string,
    status: 'pending' | 'contacted' | 'provisioned'
  ) => {
    try {
      fetch('/api/demo-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      }).catch((e) => console.warn('Demo status patch note:', e));

      if (firestore) {
        const timestampField = status === 'contacted' ? 'contactedAt' : 'provisionedAt';
        await updateDoc(doc(firestore, 'demo_requests', requestId), {
          status,
          [timestampField]: new Date().toISOString(),
        }).catch(() => {});
      }

      setDemoRequests((prev) =>
        prev.map((d) => (d.id === requestId ? { ...d, status } : d))
      );
      toast({
        title: 'Status Updated',
        description: `Demo request status updated to ${status.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message,
      });
    }
  };

  const handleProvisionFromDemo = (demo: DemoRequest) => {
    handleTenantNameChange(demo.company);
    setAdminEmail(demo.email);
    const names = (demo.name || '').trim().split(' ');
    setAdminFirstName(names[0] || 'User');
    setAdminLastName(names.slice(1).join(' ') || '');
    setNewTenantPlan(demo.tier === 'ultra' ? 'ultra' : demo.tier === 'pro' ? 'pro' : 'demo');
    setIsCreateTenantOpen(true);
    handleUpdateDemoStatus(demo.id, 'provisioned');
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

  // 6. Open Edit Tenant Dialog
  const openEditTenantModal = (t: Tenant) => {
    setEditingTenant(t);
    setEditTenantName(t.name);
    setEditTenantPlan((t.plan as 'demo' | 'pro' | 'ultra') || 'pro');
    setEditTenantCurrency(t.currency || DEFAULT_CURRENCY_CODE);
    setIsEditTenantOpen(true);
  };

  // 7. Save Tenant Settings & Currency
  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !firestore) return;

    if (!editTenantName.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Company name cannot be empty.' });
      return;
    }

    setIsSavingEditTenant(true);
    try {
      const tenantDocRef = doc(firestore, 'tenants', editingTenant.id);

      let expiresAt = editingTenant.expiresAt;
      let maxProjects = editingTenant.maxProjects ?? 999999;

      if (editTenantPlan === 'demo') {
        if (!expiresAt) {
          expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
        }
        maxProjects = 5;
      } else if (editTenantPlan === 'pro') {
        maxProjects = 10;
        expiresAt = undefined;
      } else {
        maxProjects = 999999;
        expiresAt = undefined;
      }

      await updateDoc(tenantDocRef, {
        name: editTenantName.trim(),
        plan: editTenantPlan,
        currency: editTenantCurrency,
        expiresAt: expiresAt || null,
        maxProjects,
      });

      setTenants((prev) =>
        prev.map((t) =>
          t.id === editingTenant.id
            ? {
                ...t,
                name: editTenantName.trim(),
                plan: editTenantPlan,
                currency: editTenantCurrency,
                expiresAt,
                maxProjects,
              }
            : t
        )
      );

      toast({
        title: 'Tenant Updated!',
        description: `Settings and currency (${editTenantCurrency}) saved for "${editTenantName.trim()}".`,
      });

      setIsEditTenantOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Could not update tenant settings.',
      });
    } finally {
      setIsSavingEditTenant(false);
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs">Redirecting to workspace dashboard...</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <Card className={userRequests.filter((r) => r.status === 'pending').length > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-purple-500" /> User Requests
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {userRequests.filter((r) => r.status === 'pending').length}
              {userRequests.filter((r) => r.status === 'pending').length > 0 && (
                <Badge className="bg-amber-500 text-slate-950 text-[10px] py-0 px-1.5 font-bold">New</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">{userRequests.length} total submitted</p>
          </CardContent>
        </Card>

        <Card className={demoRequests.filter((r) => r.status === 'pending').length > 0 ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Demo Inquiries
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {demoRequests.filter((r) => r.status === 'pending').length}
              {demoRequests.filter((r) => r.status === 'pending').length > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[10px] py-0 px-1.5 font-bold">New</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">{demoRequests.length} website inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Website Demo Requests from Landing Page */}
      <Card id="demos" className="border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Website Demo & Onboarding Inquiries
                </CardTitle>
                {demoRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                    {demoRequests.filter((r) => r.status === 'pending').length} Pending
                  </Badge>
                )}
              </div>
              <CardDescription>
                Inquiries submitted by prospective developers from the EstateFlow landing page. Click "Provision Workspace" to pre-fill their company and admin account.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoadingData}>
              {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {demoRequests.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No demo inquiries yet</p>
              <p className="text-xs text-muted-foreground">
                When prospective clients submit the "Request a Demo" form on your website, they will appear here and trigger an email to info@remotizedit.com.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company / Prospect</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Scale & Tier</TableHead>
                    <TableHead>Requirements / Notes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demoRequests.map((demo) => {
                    const isPending = demo.status === 'pending';
                    const isContacted = demo.status === 'contacted';
                    const isProvisioned = demo.status === 'provisioned';
                    return (
                      <TableRow key={demo.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs">{demo.company}</div>
                          {demo.phone && (
                            <span className="text-[11px] text-muted-foreground">{demo.phone}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground text-xs">{demo.name}</div>
                          <div className="text-xs text-muted-foreground">{demo.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold w-fit">
                              {demo.tier}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{demo.projectCount || '1-3 Projects'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {demo.notes ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 italic">"{demo.notes}"</p>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60">&ndash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(demo.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isPending ? 'default' : isProvisioned ? 'secondary' : 'outline'}
                            className={
                              isPending
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]'
                                : isProvisioned
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]'
                                : 'text-[10px] text-muted-foreground'
                            }
                          >
                            {demo.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleUpdateDemoStatus(demo.id, 'contacted')}
                              >
                                Mark Contacted
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                              onClick={() => handleProvisionFromDemo(demo)}
                            >
                              <PlusCircle className="h-3 w-3" />
                              Provision
                            </Button>
                          </div>
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

      {/* User Access Requests from Tenants */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  User Provisioning Requests
                </CardTitle>
                {userRequests.filter((r) => r.status === 'pending').length > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs">
                    {userRequests.filter((r) => r.status === 'pending').length} Pending
                  </Badge>
                )}
              </div>
              <CardDescription>
                Colleague access requests submitted by tenant administrators from their Settings panel. Click "Provision" to approve and set initial credentials.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoadingData}>
              {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {userRequests.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No user requests submitted yet</p>
              <p className="text-xs text-muted-foreground">
                When tenant administrators request new team members from their Settings page, they will appear here.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Requested Colleague</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs">{req.companyName}</div>
                          <span className="text-[10px] text-muted-foreground font-mono">{req.tenantId}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground text-xs">{req.targetName || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{req.targetEmail}</div>
                          {req.notes && (
                            <p className="text-[11px] text-muted-foreground/80 italic mt-0.5">"{req.notes}"</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={req.targetRole === 'Admin' ? 'default' : req.targetRole === 'Accountant' ? 'secondary' : 'outline'}
                            className="text-[10px]"
                          >
                            {req.targetRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground">{req.requestedByName || 'Admin'}</div>
                          <div className="text-[10px] text-muted-foreground">{req.requestedByEmail}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isPending ? 'default' : isApproved ? 'secondary' : 'outline'}
                            className={
                              isPending
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : isApproved
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'text-muted-foreground'
                            }
                          >
                            {req.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => handleApproveRequest(req)}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Provision
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Processed</span>
                          )}
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
                    <TableHead>Currency</TableHead>
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
                          {(() => {
                            const curr = getCurrency(t.currency);
                            return (
                              <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 bg-background">
                                <span className="text-primary mr-1">{curr.code}</span>
                                <span className="text-muted-foreground">({curr.symbol})</span>
                              </Badge>
                            );
                          })()}
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
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleOpenModules(t)}
                          >
                            <Boxes className="h-3 w-3" /> Modules ({t.assignedModules?.length || 6})
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={() => openEditTenantModal(t)}
                          >
                            <Pencil className="h-3 w-3" /> Edit / Currency
                          </Button>
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
      {/* Section: Modular Architecture & Tenant Feature Assignment           */}
      {/* ------------------------------------------------------------------- */}
      <Card id="modules" className="border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Tenant Modular Features & Capabilities Engine
                </CardTitle>
                <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/5">
                  Modular Architecture
                </Badge>
              </div>
              <CardDescription>
                Assign specific operational modules (CRM, Cashflow, Installments, POs, PDF Reports) to individual tenants based on their subscription tier and bespoke contracts.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* System Modules Catalog Showcase */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" /> System Modules Catalog
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SYSTEM_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  className="rounded-lg border bg-card/60 p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {mod.name}
                    </span>
                    <Badge
                      variant={mod.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] py-0 px-1.5"
                    >
                      {mod.status === 'active' ? 'Operational' : mod.badge || 'Upcoming'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span className="capitalize">Domain: {mod.category}</span>
                    <span className="font-mono text-[9px]">ID: {mod.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tenant Module Allocations */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-primary" /> Tenant Workspace Module Allocations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tenants.map((t) => {
                const assigned = t.assignedModules || [
                  'inventory',
                  'sales_booking',
                  'procurement_ledger',
                  'direct_cashflow',
                  'operating_expenses',
                  'export_reporting',
                ];
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border bg-muted/20 p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-xs text-foreground">{t.name}</div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {t.plan.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">Tenant ID: {t.id}</span>
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {assigned.map((modId) => {
                          const mod = SYSTEM_MODULES.find((m) => m.id === modId);
                          return (
                            <span
                              key={modId}
                              className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium border border-primary/20"
                            >
                              {mod ? mod.name.split(' ')[0] : modId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        {assigned.length} of {SYSTEM_MODULES.length} modules active
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                        onClick={() => handleOpenModules(t)}
                      >
                        <Sliders className="h-3 w-3 text-primary" /> Assign Modules
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

            <div className="grid grid-cols-2 gap-3">
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
                    <SelectItem value="demo">Demo (15 Days &bull; 5 Projects)</SelectItem>
                    <SelectItem value="pro">Pro (10 Projects)</SelectItem>
                    <SelectItem value="ultra">Ultra (Unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-currency" className="text-xs font-medium">Currency</Label>
                <Select
                  value={newTenantCurrency}
                  onValueChange={setNewTenantCurrency}
                  disabled={isCreatingTenant}
                >
                  <SelectTrigger id="tenant-currency" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code} className="text-xs">
                        <span className="font-semibold mr-1.5">{curr.code}</span> ({curr.symbol}) &ndash; {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Edit Tenant & Currency Configuration                        */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isEditTenantOpen} onOpenChange={setIsEditTenantOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
              <Pencil className="h-5 w-5" />
            </div>
            <DialogTitle>Edit Workspace & Currency</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify workspace details, subscription plan, and operating currency for this tenant.
            </DialogDescription>
          </DialogHeader>

          {editingTenant && (
            <form onSubmit={handleSaveEditTenant} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-tenant-id" className="text-xs font-medium">Tenant ID (Read-only)</Label>
                <Input
                  id="edit-tenant-id"
                  value={editingTenant.id}
                  disabled
                  className="bg-muted font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tenant-name" className="text-xs font-medium">Company / Tenant Name</Label>
                <Input
                  id="edit-tenant-name"
                  placeholder="Company Name"
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  required
                  disabled={isSavingEditTenant}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-tenant-plan" className="text-xs font-medium">Subscription Tier</Label>
                  <Select
                    value={editTenantPlan}
                    onValueChange={(val: 'demo' | 'pro' | 'ultra') => setEditTenantPlan(val)}
                    disabled={isSavingEditTenant}
                  >
                    <SelectTrigger id="edit-tenant-plan" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">Demo (15 Days &bull; 5 Projects)</SelectItem>
                      <SelectItem value="pro">Pro (10 Projects)</SelectItem>
                      <SelectItem value="ultra">Ultra (Unlimited)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-tenant-currency" className="text-xs font-medium">Operating Currency</Label>
                  <Select
                    value={editTenantCurrency}
                    onValueChange={setEditTenantCurrency}
                    disabled={isSavingEditTenant}
                  >
                    <SelectTrigger id="edit-tenant-currency" className="text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <SelectItem key={curr.code} value={curr.code} className="text-xs">
                          <span className="font-semibold mr-1.5">{curr.code}</span> ({curr.symbol}) &ndash; {curr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border">
                <p className="font-medium text-foreground mb-1">Currency Propagation Note:</p>
                <p>
                  Setting the currency to <strong>{getCurrency(editTenantCurrency).name} ({getCurrency(editTenantCurrency).code} &bull; {getCurrency(editTenantCurrency).symbol})</strong> updates all dashboard KPIs, projects, receipts, and invoices in real time for all users in this tenant.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditTenantOpen(false)}
                  disabled={isSavingEditTenant}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSavingEditTenant}>
                  {isSavingEditTenant ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Dialog: Assign Modules to Tenant Workspace                          */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isModulesDialogOpen} onOpenChange={setIsModulesDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Boxes className="h-5 w-5" />
            </div>
            <DialogTitle>Configure Tenant Modules & Features</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which functional modules are provisioned for{' '}
              <strong>{selectedTenantForModules?.name}</strong> ({selectedTenantForModules?.id}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2 pr-1">
            {SYSTEM_MODULES.map((mod) => {
              const isChecked = tenantActiveModules.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => handleToggleModule(mod.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-border/60 bg-card hover:border-border'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModule(mod.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{mod.name}</span>
                      <Badge
                        variant={mod.status === 'active' ? 'outline' : 'secondary'}
                        className="text-[10px] py-0 px-1.5"
                      >
                        {mod.status === 'active' ? 'Available' : mod.badge || 'Planned'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {mod.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModulesDialogOpen(false)}
              disabled={isSavingModules}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModules}
              disabled={isSavingModules}
              className="gap-1.5"
            >
              {isSavingModules ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Module Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
