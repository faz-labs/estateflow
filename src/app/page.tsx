'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Users,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Lock,
  Mail,
  Phone,
  BarChart3,
  FileText,
  Boxes,
  Clock,
  Briefcase,
  ChevronRight,
  Headphones,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { SYSTEM_MODULES } from '@/lib/types';

export default function LandingPage() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden font-sans">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Glassmorphism Navigation Bar                                   */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-all shadow-sm border border-primary/20">
              <Logo className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                EstateFlow
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary font-mono font-normal">
                  v2.4
                </Badge>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Real Estate ERP
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#modules" className="hover:text-foreground transition-colors">Modular Engine</a>
            <a href="#subscriptions" className="hover:text-foreground transition-colors">Subscriptions</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Support & Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-xs font-semibold shadow-md shadow-primary/20 gap-1.5">
                Launch Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Hero Section with 3D Depth & Interactive Preview               */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden">
        {/* Ambient Light Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-primary/15 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[380px] h-[380px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-sm mb-4 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Engineered for Property Developers & Asset Managers</span>
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-muted-foreground font-mono">By Remotized IT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.1]">
              Enterprise Real Estate ERP,{' '}
              <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                Engineered for Scale.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.25}>
            <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              Unify multi-unit land and apartment inventory, automate complex buyer installment schedules, govern contractor procurement, and audit direct cashflow across multiple tenant workspaces.
            </p>
          </FadeIn>

          <FadeIn delay={0.35}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-sm font-bold shadow-lg shadow-primary/25 gap-2">
                  Access Platform Portal <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#subscriptions" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm font-semibold border-border/80 hover:bg-muted/50">
                  Explore Tier Plans & Demos
                </Button>
              </a>
            </div>
          </FadeIn>

          {/* Quick Metrics Bar */}
          <FadeIn delay={0.45}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-border/40">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">100%</div>
                <div className="text-xs text-muted-foreground font-medium">Tenant Data Isolation</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">0ms</div>
                <div className="text-xs text-muted-foreground font-medium">Index Bottlenecks</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">Multi-Unit</div>
                <div className="text-xs text-muted-foreground font-medium">Plot & Flat Blueprint Engine</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">Multi-Currency</div>
                <div className="text-xs text-muted-foreground font-medium">USD, EUR, GBP, BDT & More</div>
              </div>
            </div>
          </FadeIn>

          {/* 3D Dashboard Mockup Presentation */}
          <SlideUp delay={0.5} className="pt-8">
            <div className="relative mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/70 p-3 sm:p-5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
              <div className="rounded-xl border border-border/60 bg-background/90 p-4 sm:p-6 overflow-hidden shadow-inner text-left space-y-6">
                {/* Mockup Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        Skyline Heights Residency &bull; Phase 2
                        <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-[10px]">Active Project</Badge>
                      </h3>
                      <p className="text-xs text-muted-foreground">120 Units &bull; 18 Commercial Suites &bull; 92% Subscribed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono font-medium">
                      Currency: USD ($)
                    </Badge>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live Telemetry</span>
                  </div>
                </div>

                {/* Mockup Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Sales Contracts</span>
                    <div className="text-xl font-bold text-foreground">$14,850,000</div>
                    <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +18.4% from last quarter
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Realized Inflow</span>
                    <div className="text-xl font-bold text-emerald-500">$9,420,000</div>
                    <p className="text-[10px] text-muted-foreground">63.4% collections realized</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Contractor Payables</span>
                    <div className="text-xl font-bold text-foreground">$4,110,000</div>
                    <p className="text-[10px] text-muted-foreground">Raw materials & civil works</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Net Project Cashflow</span>
                    <div className="text-xl font-bold text-primary">+$5,310,000</div>
                    <p className="text-[10px] text-emerald-500 font-medium">Healthy operating margin</p>
                  </div>
                </div>

                {/* Mockup Data Rows Preview */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-2">
                    <span>Recent Installment & Payment Activity</span>
                    <span>Live Auto-Reconciliation</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { unit: 'Apt 14-B (Skyline Heights)', buyer: 'Alexander Vance', amount: '$45,000', type: 'Installment #4', status: 'Cleared', date: 'Just now' },
                      { unit: 'Plot 08 &bull; Block C', buyer: 'Horizon Holdings Ltd.', amount: '$120,000', type: 'Booking Advance', status: 'Cleared', date: '25m ago' },
                      { unit: 'Penthouse 22-A', buyer: 'Dr. Evelyn Martinez', amount: '$68,500', type: 'Milestone Completion', status: 'Pending Verification', date: '1h ago' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/30 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                            <CreditCard className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{row.unit}</div>
                            <div className="text-[11px] text-muted-foreground">{row.buyer} &bull; {row.type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-foreground">{row.amount}</div>
                          <span className={`text-[10px] font-medium ${row.status === 'Cleared' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {row.status} &bull; {row.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Core Features Section (Bento Grid)                            */}
      {/* ----------------------------------------------------------------- */}
      <section id="features" className="py-24 border-t border-border/50 bg-card/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
              Comprehensive Operations
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Everything Your Real Estate Firm Needs to Operate Seamlessly
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Say goodbye to disconnected spreadsheets and fragmented tools. EstateFlow unites property inventory, buyer accounts, contractor bills, and financial reporting.
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Plot & Unit Blueprint Inventory</CardTitle>
                  <CardDescription className="text-xs">
                    Dynamic multi-unit mapping for apartments, commercial suites, and subdivided land plots.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Track live statuses: Available, Booked, Sold, or Handed Over. Attach square footage, block numbers, floor levels, and unit-specific price matrices.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Visual unit availability grids</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Real-time pricing & dimension calculators</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Sales Contracts & Installments</CardTitle>
                  <CardDescription className="text-xs">
                    Automated installment schedules with overdue alerts and money receipt generation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Generate milestone or monthly installment schedules in seconds. Record down payments, partial installments, and print standardized company receipts.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Automated installment generation</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Print-ready PDF money receipts</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Procurement & Vendor Ledger</CardTitle>
                  <CardDescription className="text-xs">
                    Contractor purchase orders, supplier bills, and payment vouchers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Maintain complete transparency over cement, steel, civil engineering, and subcontractor contracts. Track total billed vs. paid out in real time.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Contractor balance sheets</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Itemized expense categorization</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Direct Cashflow & Bank Accounts</CardTitle>
                  <CardDescription className="text-xs">
                    Multi-account liquidity monitoring and petty cash reconciliation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Trace every cent across bank accounts, mobile financial services (MFS), and cash lockers. Instant net cashflow calculation prevents project stalls.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-purple-500" /> Real-time inflow & outflow charts</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-purple-500" /> Multi-account reconciliation</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                    <Layers className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Operating Costs & Overheads</CardTitle>
                  <CardDescription className="text-xs">
                    Corporate salaries, branch utilities, office leases, and overhead analytics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Distinguish direct project construction expenses from general corporate overheads. Achieve pure net profitability visibility per fiscal period.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-500" /> Departmental cost allocation</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-500" /> Monthly burn rate analytics</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">Export & Audit Center</CardTitle>
                  <CardDescription className="text-xs">
                    One-click audit statements, customer ledgers, and Excel spreadsheets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>Instantly export customer ledger statements, vendor payment histories, and overall balance sheet summaries for external auditors and tax filing.</p>
                  <ul className="space-y-1.5 pt-2 text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500" /> Formatted PDF customer statements</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-teal-500" /> Excel & CSV financial exports</li>
                  </ul>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Modular Architecture Showcase                                  */}
      {/* ----------------------------------------------------------------- */}
      <section id="modules" className="py-24 border-t border-border/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
                Future-Proof Engineering
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Modular Architecture: Activate Only What You Need
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                EstateFlow is built on an extensible module pipeline. Platform administrators can assign specific feature modules to individual tenant companies according to their subscription plan or custom requirements.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="gap-2 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/5">
                <Boxes className="h-4 w-4" /> Try Modules in Demo
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_MODULES.map((mod) => (
              <div
                key={mod.id}
                className="rounded-xl border border-border/70 bg-card p-5 space-y-3 hover:border-primary/50 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {mod.name}
                  </span>
                  <Badge
                    variant={mod.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px] capitalize"
                  >
                    {mod.status === 'active' ? 'Production Ready' : mod.badge || 'Planned'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {mod.description}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span className="capitalize">Domain: {mod.category}</span>
                  <span className="font-mono text-[10px]">mod_{mod.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Subscriptions & Pricing Plans                                  */}
      {/* ----------------------------------------------------------------- */}
      <section id="subscriptions" className="py-24 border-t border-border/50 bg-card/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
              Transparent Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Flexible Plans Scaled to Your Development Pipeline
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Start with a 15-day full-feature trial workspace or activate a commercial license with dedicated SLA.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Demo Plan */}
            <Card className="flex flex-col justify-between border-border/80 bg-card shadow-sm hover:border-border transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">Trial Tier</Badge>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-2xl font-bold">Demo Evaluation</CardTitle>
                <CardDescription className="text-xs">
                  Full exploration of EstateFlow capabilities for testing teams.
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground font-medium ml-1.5">/ 15 days</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Up to 5 Active Projects</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Full CRM & Customer Directory</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Complete Installment Engine</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Multi-Currency Configuration</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Instant Self-Service Setup</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    Launch Demo Workspace
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Pro Plan (Highlighted) */}
            <Card className="flex flex-col justify-between border-primary shadow-xl bg-card relative ring-2 ring-primary/20 scale-100 lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3 py-0.5 shadow-md">
                  Most Popular for Developers
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">Commercial Pro</Badge>
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Pro Enterprise</CardTitle>
                <CardDescription className="text-xs">
                  Designed for active real estate developers and property development firms.
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-extrabold text-foreground">$149</span>
                  <span className="text-xs text-muted-foreground font-medium ml-1.5">/ month billed annually</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Up to 10 Concurrent Development Projects</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Colleague Accounts (Admin, Accountant, Viewer)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Branded PDF Money Receipts with Company Logo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Vendor Bills & Contractor BOQ Tracking</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Priority Email & WhatsApp Support</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <a href="mailto:info@remotizedit.com?subject=EstateFlow%20Pro%20Enterprise%20Subscription" className="w-full">
                  <Button className="w-full text-xs font-bold shadow-md shadow-primary/25">
                    Provision Pro Workspace
                  </Button>
                </a>
              </div>
            </Card>

            {/* Ultra Plan */}
            <Card className="flex flex-col justify-between border-border/80 bg-card shadow-sm hover:border-border transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">Bespoke SLA</Badge>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl font-bold">Ultra Dedicated</CardTitle>
                <CardDescription className="text-xs">
                  For large conglomerates, property funds, and multi-branch operations.
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-extrabold text-foreground">$399</span>
                  <span className="text-xs text-muted-foreground font-medium ml-1.5">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Projects & Units</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Dedicated Database & Isolated Tenant Vault</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Custom Domain Mapping & White-Labeling</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Custom Modular Feature Provisioning</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> 24/7 Dedicated Engineering Support SLA</li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <a href="mailto:info@remotizedit.com?subject=EstateFlow%20Ultra%20Dedicated%20Enterprise" className="w-full">
                  <Button variant="outline" className="w-full text-xs font-semibold">
                    Contact Enterprise Sales
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Remotized IT Engineering & Support                             */}
      {/* ----------------------------------------------------------------- */}
      <section id="contact" className="py-24 border-t border-border/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-background to-primary/5 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enterprise Engineering by Remotized IT</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Built and Supported by Remotized IT
              </h2>

              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                EstateFlow is architected with zero-trust tenant isolation, stateless HMAC token validation, and real-time synchronization. Need custom ERP integrations, on-premise cloud infrastructure, or dedicated staff training? Our engineers are ready to assist.
              </p>

              {/* Support Contacts Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {/* Tech Support */}
                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Headphones className="h-4 w-4 text-primary" /> Technical Support & Assistance
                  </div>
                  <p className="text-xs text-muted-foreground">For platform bugs, tenant onboarding, or password reset support:</p>
                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="mailto:support@remotizedit.online"
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      support@remotizedit.online
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('support@remotizedit.online')}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Copy email"
                    >
                      {copiedEmail === 'support@remotizedit.online' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sales & Enterprise */}
                <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Mail className="h-4 w-4 text-emerald-500" /> General Inquiries & Subscriptions
                  </div>
                  <p className="text-xs text-muted-foreground">For custom contracts, module customization, or new client workspaces:</p>
                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="mailto:info@remotizedit.com"
                      className="font-mono text-xs font-semibold text-emerald-500 hover:underline"
                    >
                      info@remotizedit.com
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('info@remotizedit.com')}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Copy email"
                    >
                      {copiedEmail === 'info@remotizedit.com' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link href="/login">
                  <Button size="lg" className="text-xs font-bold shadow-md shadow-primary/20 gap-2">
                    Enter Platform Workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href="mailto:info@remotizedit.com?subject=EstateFlow%20Consultation%20Request"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Schedule an Engineering Consultation <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Footer                                                         */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-border/40 py-12 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Logo className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">EstateFlow Real Estate ERP</span>
          </div>

          <div className="text-xs text-muted-foreground text-center sm:text-right">
            <p>Developed with precision by <strong className="text-foreground">Remotized IT</strong>.</p>
            <p className="mt-1">
              Support: <a href="mailto:support@remotizedit.online" className="hover:text-primary transition-colors">support@remotizedit.online</a> &bull; Inquiries: <a href="mailto:info@remotizedit.com" className="hover:text-primary transition-colors">info@remotizedit.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
