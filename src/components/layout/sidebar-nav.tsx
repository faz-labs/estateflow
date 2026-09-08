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
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Logo } from '../icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


const navItems = [
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

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { isSuperAdmin } = useUserProfile();

  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-16 items-center border-b px-4 lg:px-6">
          <Link href="/dashboard" prefetch={true} className="flex items-center gap-2 font-semibold">
            <Logo className="h-8 w-8" />
            <span className="text-xl">EstateFlow</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {isSuperAdmin && (
              <Link
                href="/dashboard/tenants"
                prefetch={true}
                onClick={() => pathname !== '/dashboard/tenants' && setPendingHref('/dashboard/tenants')}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-amber-600 dark:text-amber-400 font-semibold transition-all hover:bg-amber-500/15 bg-amber-500/10 border border-amber-500/30 mb-2',
                  (pathname === "/dashboard/tenants" || pendingHref === "/dashboard/tenants") && 'bg-amber-500/25 text-amber-700 dark:text-amber-300'
                )}
              >
                {pendingHref === '/dashboard/tenants' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
                Super Admin
              </Link>
            )}
            {navItems.map((item) => {
              const isPending = pendingHref === item.href;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    if (pathname !== item.href) {
                      setPendingHref(item.href);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    (isActive || isPending) && 'bg-muted text-primary font-medium'
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <item.icon className="h-4 w-4 shrink-0" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-2">
            <Link
                href="/dashboard/settings"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  pathname === "/dashboard/settings" && 'bg-muted text-primary'
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Button variant="ghost" className="justify-start px-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
