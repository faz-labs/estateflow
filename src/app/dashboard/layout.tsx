import type { ReactNode } from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { TenantGuard } from '@/components/layout/tenant-guard';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TenantGuard>
      <div className="grid min-h-screen w-full md:grid-cols-[230px_1fr] lg:grid-cols-[270px_1fr]">
        <SidebarNav />
        <div className="flex flex-col min-w-0">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </TenantGuard>
  );
}
