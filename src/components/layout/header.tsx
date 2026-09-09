'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Menu,
  BookOpen,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { NotificationBell } from './notification-bell';

const getTitleFromPathname = (pathname: string) => {
  if (pathname === '/dashboard') return 'Dashboard';
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 1) {
    if (parts[1] === 'vendors') return 'Vendors/Bills';
    if (parts[1] === 'guide') return 'User Manual & Knowledge Base';
    const title = parts[1].replace(/-/g, ' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  return 'Dashboard';
};

export function Header() {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-30">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-72">
          <SidebarNav isMobile onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <h1 className="text-xl font-semibold md:text-2xl truncate">{title}</h1>

      <div className="flex w-full items-center gap-3 md:ml-auto md:gap-3 lg:gap-4 justify-end">
        {/* Quick User Guide Button */}
        <Link href="/dashboard/guide" title="User Manual & Knowledge Base">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium border-primary/20 hover:border-primary/40 hover:bg-primary/5"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>User Guide</span>
          </Button>
        </Link>

        {/* Tenant Real-Time Notice Panel */}
        <NotificationBell />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full h-9 w-9">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{user?.displayName || 'Logged In'}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="cursor-pointer">Settings & Profile</DropdownMenuItem>
            </Link>
            <Link href="/dashboard/guide">
              <DropdownMenuItem className="cursor-pointer gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>User Manual & Guide</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
