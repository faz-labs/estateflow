'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as UserProfile, Tenant, SubscriptionPlan, TenantStatus } from '@/lib/types';
import { getCurrency, formatCurrency as formatCurrencyUtil, formatCompactCurrency as formatCompactCurrencyUtil, DEFAULT_CURRENCY_CODE } from '@/lib/currencies';

import { isSuperAdminEmail, getSuperAdminEmails, SUPER_ADMIN_EMAILS } from '@/lib/auth-constants';
export { SUPER_ADMIN_EMAILS, isSuperAdminEmail, getSuperAdminEmails };

export interface UserProfileState {
  profile: UserProfile | null;
  tenant: Tenant | null;
  role: 'SuperAdmin' | 'Admin' | 'Accountant' | 'Viewer';
  tenantId: string;
  companyName: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAccountant: boolean;
  isViewer: boolean;
  mustChangePassword: boolean;
  isTenantSuspended: boolean;
  isDemoExpired: boolean;
  daysRemainingInDemo: number | null;
  tenantPlan: SubscriptionPlan;
  currencyCode: string;
  currencySymbol: string;
  formatCurrency: (amount: number | null | undefined) => string;
  formatCompactCurrency: (amount: number | null | undefined) => string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom React hook to subscribe to the authenticated user's Firestore profile
 * and their organization's Tenant document, exposing RBAC and subscription statuses.
 */
export function useUserProfile(): UserProfileState {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    if (!user || !firestore) {
      setProfile(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);

    const unsubscribeUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        } else {
          // If profile doc doesn't exist yet, construct a fallback
          const [firstName, lastName] = user.displayName?.split(' ') || [user.email?.split('@')[0] || 'User', ''];
          const userEmail = user.email?.toLowerCase() || '';
          const isSuper = isSuperAdminEmail(userEmail);
          
          setProfile({
            id: user.uid,
            email: user.email || '',
            firstName: firstName || 'User',
            lastName: lastName || '',
            role: isSuper ? 'SuperAdmin' : 'Viewer',
            tenantId: isSuper ? 'platform_root' : 'default_workspace',
            companyName: isSuper ? 'Platform SuperAdmin' : 'Default Workspace',
            mustChangePassword: false,
          });
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching user profile snapshot:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribeUser();
  }, [user, isAuthLoading, firestore]);

  // Subscribe to Tenant document to monitor suspension and plan limits
  useEffect(() => {
    if (!firestore || !profile?.tenantId || profile.tenantId === 'platform_root' || profile.tenantId === 'all_tenants') {
      setTenant(null);
      return;
    }

    const tenantDocRef = doc(firestore, 'tenants', profile.tenantId);
    const unsubscribeTenant = onSnapshot(
      tenantDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTenant(docSnap.data() as Tenant);
        } else {
          setTenant(null);
        }
      },
      (err) => {
        console.warn('Tenant snapshot error:', err);
      }
    );

    return () => unsubscribeTenant();
  }, [firestore, profile?.tenantId]);

  const userEmail = user?.email?.toLowerCase() || '';
  const isSuper = isSuperAdminEmail(userEmail) || profile?.role === 'SuperAdmin';
  const role: 'SuperAdmin' | 'Admin' | 'Accountant' | 'Viewer' = isSuper 
    ? 'SuperAdmin' 
    : (profile?.role || 'Viewer');
  const tenantId: string = profile?.tenantId || (isSuper ? 'all_tenants' : 'default_workspace');
  const companyName: string = profile?.companyName || (isSuper ? 'Platform SuperAdmin' : 'Default Workspace');

  // Tenant Plan & Expiry Calculations
  const tenantPlan: SubscriptionPlan = tenant?.plan || 'pro';
  const isTenantSuspended: boolean = !isSuper && tenant?.status === 'suspended';

  let isDemoExpired = false;
  let daysRemainingInDemo: number | null = null;

  if (tenant?.plan === 'demo' && tenant.expiresAt) {
    const expiresMs = new Date(tenant.expiresAt).getTime();
    const nowMs = Date.now();
    const diffMs = expiresMs - nowMs;
    daysRemainingInDemo = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diffMs <= 0 && !isSuper) {
      isDemoExpired = true;
    }
  }

  const currencyCode = tenant?.currency || DEFAULT_CURRENCY_CODE;
  const currencyItem = getCurrency(currencyCode);
  const currencySymbol = currencyItem.symbol;
  const formatCurrency = (amount: number | null | undefined) => formatCurrencyUtil(amount, currencyCode);
  const formatCompactCurrency = (amount: number | null | undefined) => formatCompactCurrencyUtil(amount, currencyCode);

  return {
    profile,
    tenant,
    role,
    tenantId,
    companyName,
    isSuperAdmin: isSuper,
    isAdmin: isSuper || role === 'Admin',
    isAccountant: isSuper || role === 'Accountant' || role === 'Admin',
    isViewer: role === 'Viewer' && !isSuper,
    mustChangePassword: Boolean(profile?.mustChangePassword),
    isTenantSuspended,
    isDemoExpired,
    daysRemainingInDemo,
    tenantPlan,
    currencyCode,
    currencySymbol,
    formatCurrency,
    formatCompactCurrency,
    isLoading: isAuthLoading || isLoading,
    error,
  };
}
