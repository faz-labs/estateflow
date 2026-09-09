'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  Receipt,
  Banknote,
  Settings,
  LogOut,
  Landmark,
  FileDown,
  ShieldCheck,
  Loader2,
  BookOpen,
  Boxes,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Logo } from '../icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Operational navigation for tenant companies (hidden from platform superadmin)
const tenantNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/projects', icon: Briefcase, label: 'Projects' },
  { href: '/dashboard/customers', icon: Users, label: 'Customers' },
  { href: '/dashboard/vendors', icon: Truck, label: 'Vendors/Bills' },
  { href: '/dashboard/sales', icon: ShoppingCart, label: 'Sales' },
  { href: '/dashboard/add-payment', icon: DollarSign, label: 'Add Payment' },
  { href: '/dashboard/expense', icon: Receipt, label: 'Add Expense' },
  { href: '/dashboard/make-payment', icon: Banknote, label: 'Make Payment' },
  { href: '/dashboard/operating-cost', icon: Landmark, label: 'Operating Cost' },
  { href: '/dashboard/export-reports', icon: FileDown, label: 'Export Reports' },
];

// Platform administration navigation for Super Admin
const superAdminNavItems = [
  { href: '/dashboard/tenants', icon: ShieldCheck, label: 'Tenants & Workspaces' },
  { href: '/dashboard/tenants#demos', icon: Calendar, label: 'Demo Inquiries' },
  { href: '/dashboard/tenants#requests', icon: UserPlus, label: 'User Access Requests' },
  { href: '/dashboard/tenants#modules', icon: Boxes, label: 'Modular Features Engine' },
  { href: '/dashboard/settings', icon: Settings, label: 'Platform Security' },
  { href: '/dashboard/guide', icon: BookOpen, label: 'Admin Documentation' },
];

interface SidebarNavProps {
  isMobile?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ isMobile = false, onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { isSuperAdmin, companyName, role } = useUserProfile();

  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLogout = async () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'auth_session=; path=/; max-age=0; SameSite=Lax';
    }
    await signOut(auth);
    router.push('/login');
  };

  const handleLinkClick = (href: string) => {
    if (pathname !== href) {
      setPendingHref(href);
    }
    onNavigate?.();
  };

  const currentNavItems = isSuperAdmin ? superAdminNavItems : tenantNavItems;
  const homeHref = isSuperAdmin ? '/dashboard/tenants' : '/dashboard';

  return (
    <aside
      className={cn(
        isMobile
          ? 'flex h-full w-full flex-col justify-between bg-background'
          : 'hidden md:flex sticky top-0 h-screen w-full flex-col justify-between border-r bg-card/80 backdrop-blur-md z-30',
        className
      )}
    >
      {/* 1. Header (Fixed height h-16) */}
      <div className="flex h-16 shrink-0 items-center border-b px-4 lg:px-6">
        <Link
          href={homeHref}
          prefetch={true}
          onClick={() => handleLinkClick(homeHref)}
          className="flex items-center gap-2.5 font-semibold group transition-opacity hover:opacity-90"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            <Logo className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight leading-none text-foreground">
              EstateFlow
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">
              {isSuperAdmin ? 'Platform Admin' : 'Real Estate ERP'}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Middle Navigation Items (Scrollable when viewport is compact) */}
      <div className="flex-1 overflow-y-auto px-2 lg:px-3 py-3 space-y-1">
        {isSuperAdmin && (
          <div className="px-3 py-1.5 mb-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Super Administrator Mode</span>
          </div>
        )}

        <nav className="grid items-start text-sm font-medium gap-0.5">
          {currentNavItems.map((item) => {
            const isPending = pendingHref === item.href;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && !item.href.includes('#') && pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                onClick={() => handleLinkClick(item.href)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/70',
                  (isActive || isPending) &&
                    'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                )}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <item.icon className={cn('h-4 w-4 shrink-0', (isActive || isPending) && 'text-primary')} />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Section (Permanently anchored at bottom of viewport) */}
      <div className="shrink-0 border-t bg-muted/20 p-3 lg:p-4 space-y-2">
        <nav className="grid items-start text-sm font-medium gap-1">
          <Link
            href="/dashboard/guide"
            prefetch={true}
            onClick={() => handleLinkClick('/dashboard/guide')}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/70',
              (pathname === '/dashboard/guide' || pendingHref === '/dashboard/guide') &&
                'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
            )}
          >
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1">User Manual</span>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-normal"
            >
              Guide
            </Badge>
          </Link>

          <Link
            href="/dashboard/settings"
            prefetch={true}
            onClick={() => handleLinkClick('/dashboard/settings')}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/70',
              (pathname === '/dashboard/settings' || pendingHref === '/dashboard/settings') &&
                'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-3 shrink-0" />
            <span>Logout</span>
          </Button>
        </nav>

        {/* Tenant Organization & Role Badge */}
        {(companyName || role) && (
          <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between px-1 text-xs">
            <div
              className="truncate max-w-[130px] font-medium text-muted-foreground"
              title={companyName || 'Organization'}
            >
              {companyName || 'Tenant'}
            </div>
            <Badge
              variant={role === 'Admin' ? 'default' : role === 'Accountant' ? 'secondary' : 'outline'}
              className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold"
            >
              {role}
            </Badge>
          </div>
        )}
      </div>
    </aside>
  );
}
