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
  Calendar,
  Send,
  Loader2,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Logo } from '@/components/icons';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { SmoothScrollProvider } from '@/components/ui/smooth-scroll';
import { SYSTEM_MODULES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function LandingPage() {
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Demo Request Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoProjectCount, setDemoProjectCount] = useState('1-3 Projects');
  const [demoTier, setDemoTier] = useState<'demo' | 'pro' | 'ultra'>('demo');
  const [demoNotes, setDemoNotes] = useState('');
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [isDemoSubmitted, setIsDemoSubmitted] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handleOpenDemoModal = (tier: 'demo' | 'pro' | 'ultra' = 'demo') => {
    setDemoTier(tier);
    setIsDemoSubmitted(false);
    setIsDemoModalOpen(true);
  };

  const handleSubmitDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim() || !demoCompany.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required Information Missing',
        description: 'Please provide your full name, work email address, and company name.',
      });
      return;
    }

    setIsSubmittingDemo(true);
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: demoName.trim(),
          email: demoEmail.trim(),
          company: demoCompany.trim(),
          phone: demoPhone.trim(),
          projectCount: demoProjectCount,
          tier: demoTier,
          notes: demoNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request.');
      }

      setIsDemoSubmitted(true);
      toast({
        title: 'Demo Request Received!',
        description: 'Our enterprise solutions team will contact you shortly to schedule your walk-through.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err.message || 'Could not send demo request. Please try again.',
      });
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden font-sans text-base leading-relaxed">
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
                <span className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5 leading-none">
                  EstateFlow
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary font-mono font-normal">
                    v2.4
                  </Badge>
                </span>
                <span className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase mt-1">
                  Real Estate ERP
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-base font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#modules" className="hover:text-foreground transition-colors">Modular Engine</a>
              <a href="#subscriptions" className="hover:text-foreground transition-colors">Tier Features</a>
              <a href="#contact" className="hover:text-foreground transition-colors">Support & Contact</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm font-semibold">
                  Sign In
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => handleOpenDemoModal('demo')}
                className="text-sm font-semibold shadow-md shadow-primary/20 gap-1.5"
              >
                Request a Demo <Calendar className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* 2. Hero Section with 3D Depth & GSAP Smooth Scroll Context        */}
        {/* ----------------------------------------------------------------- */}
        <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden">
          {/* Ambient Light Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-primary/15 rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-1/4 w-[380px] h-[380px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm mb-4 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span>Engineered for Property Developers & Asset Managers</span>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground font-mono">By Remotized IT</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.15]">
                Enterprise Real Estate ERP,{' '}
                <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  Engineered for Scale.
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.25}>
              <p className="max-w-3xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
                Unify multi-unit land and apartment inventory, automate complex buyer installment schedules, govern contractor procurement, and audit direct cashflow across multiple tenant workspaces with complete data isolation.
              </p>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button
                  size="lg"
                  onClick={() => handleOpenDemoModal('demo')}
                  className="w-full sm:w-auto h-12 px-8 text-base font-bold shadow-lg shadow-primary/25 gap-2"
                >
                  Request a Demo <Calendar className="h-4 w-4" />
                </Button>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 text-base font-semibold border-border/80 hover:bg-muted/50 gap-2"
                  >
                    Tenant Login Portal <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Quick Metrics Bar */}
            <FadeIn delay={0.45}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto pt-10 border-t border-border/40 text-left sm:text-center">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground font-medium">Tenant Data Isolation</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-foreground">0ms</div>
                  <div className="text-sm text-muted-foreground font-medium">Index Bottlenecks</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-foreground">Multi-Unit</div>
                  <div className="text-sm text-muted-foreground font-medium">Plot & Flat Blueprint Engine</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-foreground">Multi-Currency</div>
                  <div className="text-sm text-muted-foreground font-medium">USD, EUR, GBP, BDT & More</div>
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
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          Skyline Heights Residency &bull; Phase 2
                          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-xs">Active Project</Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground">120 Units &bull; 18 Commercial Suites &bull; 92% Subscribed</p>
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
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Total Sales Contracts</span>
                      <div className="text-2xl font-bold text-foreground">$14,850,000</div>
                      <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +18.4% from last quarter
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Realized Inflow</span>
                      <div className="text-2xl font-bold text-emerald-500">$9,420,000</div>
                      <p className="text-xs text-muted-foreground">63.4% collections realized</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Contractor Payables</span>
                      <div className="text-2xl font-bold text-foreground">$4,110,000</div>
                      <p className="text-xs text-muted-foreground">Raw materials & civil works</p>
                    </div>
                    <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Net Project Cashflow</span>
                      <div className="text-2xl font-bold text-primary">+$5,310,000</div>
                      <p className="text-xs text-emerald-500 font-medium">Healthy operating margin</p>
                    </div>
                  </div>

                  {/* Mockup Data Rows Preview */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-2">
                      <span>Recent Installment & Payment Activity</span>
                      <span>Live Auto-Reconciliation</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { unit: 'Apt 14-B (Skyline Heights)', buyer: 'Alexander Vance', amount: '$45,000', type: 'Installment #4', status: 'Cleared', date: 'Just now' },
                        { unit: 'Plot 08 &bull; Block C', buyer: 'Horizon Holdings Ltd.', amount: '$120,000', type: 'Booking Advance', status: 'Cleared', date: '25m ago' },
                        { unit: 'Penthouse 22-A', buyer: 'Dr. Evelyn Martinez', amount: '$68,500', type: 'Milestone Completion', status: 'Pending Verification', date: '1h ago' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-card/30 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">{row.unit}</div>
                              <div className="text-xs text-muted-foreground">{row.buyer} &bull; {row.type}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-foreground text-sm">{row.amount}</div>
                            <span className={`text-xs font-medium ${row.status === 'Cleared' ? 'text-emerald-500' : 'text-amber-500'}`}>
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
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs">
                Comprehensive Operations
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Everything Your Real Estate Firm Needs to Operate Seamlessly
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Say goodbye to disconnected spreadsheets and fragmented tools. EstateFlow unites property inventory, buyer accounts, contractor bills, and financial reporting under one roof.
              </p>
            </div>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Plot & Unit Blueprint Inventory</CardTitle>
                    <CardDescription className="text-sm">
                      Dynamic multi-unit mapping for apartments, commercial suites, and subdivided land plots.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Track live statuses: Available, Booked, Sold, or Handed Over. Attach square footage, block numbers, floor levels, and unit-specific price matrices.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Visual unit availability grids</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Real-time pricing & dimension calculators</li>
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Sales Contracts & Installments</CardTitle>
                    <CardDescription className="text-sm">
                      Automated installment schedules with overdue alerts and money receipt generation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Generate milestone or monthly installment schedules in seconds. Record down payments, partial installments, and print standardized company receipts.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Automated installment schedule generation</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Print-ready PDF money receipts with logo</li>
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Procurement & Vendor Ledger</CardTitle>
                    <CardDescription className="text-sm">
                      Contractor purchase orders, supplier bills, and payment vouchers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Maintain complete transparency over cement, steel, civil engineering, and subcontractor contracts. Track total billed vs. paid out in real time.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Contractor balance sheets & BOQ tracking</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Itemized expense categorization</li>
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Direct Cashflow & Bank Accounts</CardTitle>
                    <CardDescription className="text-sm">
                      Multi-account liquidity monitoring and petty cash reconciliation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Trace every transaction across bank accounts, mobile financial services, and cash lockers. Instant net cashflow calculation prevents project delays.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-500" /> Real-time inflow & outflow charts</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-500" /> Multi-bank account reconciliation</li>
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                      <Layers className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Operating Costs & Overheads</CardTitle>
                    <CardDescription className="text-sm">
                      Corporate salaries, branch utilities, office leases, and overhead analytics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Distinguish direct project construction expenses from corporate operational overheads. Achieve pure net profitability visibility per fiscal quarter.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Departmental cost allocation</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-500" /> Monthly burn rate analytics</li>
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card className="h-full border-border/70 bg-card hover:border-primary/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">Audit & Export Center</CardTitle>
                    <CardDescription className="text-sm">
                      One-click audit statements, customer ledgers, and Excel spreadsheets.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p className="text-sm leading-relaxed">Instantly export customer payment histories, contractor ledger statements, and overall balance sheets for external auditors and tax authorities.</p>
                    <ul className="space-y-2 pt-2 text-foreground font-medium text-sm">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Formatted PDF customer statements</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-500" /> Excel & CSV financial exports</li>
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
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs">
                  Future-Proof Engineering
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Modular Architecture: Activate Only What You Need
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed">
                  EstateFlow is built on an extensible module pipeline. Platform administrators can assign specific feature modules to individual tenant companies according to their operational scale and custom workflow requirements.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleOpenDemoModal('demo')}
                className="gap-2 text-sm font-semibold border-primary/40 text-primary hover:bg-primary/5"
              >
                <Boxes className="h-4 w-4" /> Request Modular Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SYSTEM_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  className="rounded-xl border border-border/70 bg-card p-5 space-y-3 hover:border-primary/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {mod.name}
                    </span>
                    <Badge
                      variant={mod.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs capitalize"
                    >
                      {mod.status === 'active' ? 'Operational' : mod.badge || 'Planned'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <span className="capitalize font-medium">Domain: {mod.category}</span>
                    <span className="font-mono text-xs">mod_{mod.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 5. Subscriptions & Tier Features (NO PRICES - DEMO REQUEST)       */}
        {/* ----------------------------------------------------------------- */}
        <section id="subscriptions" className="py-24 border-t border-border/50 bg-card/20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-xs">
                Platform Tiers
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Engineered Capabilities for Every Stage of Development
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Choose a plan tailored to your development portfolio. Request a personalized demo to experience the platform live with your company's workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {/* Demo Evaluation Tier */}
              <Card className="flex flex-col justify-between border-border/80 bg-card shadow-sm hover:border-border transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">Evaluation Sandbox</Badge>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Demo Evaluation</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    A complete trial sandbox for real estate developers to evaluate the full feature set.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground font-medium">
                    Ideal for testing multi-unit blueprints, installment logic, and user role separation.
                  </div>
                  <ul className="space-y-3 pt-2">
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Up to 5 Active Development Projects</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Complete Customer Profiles & CRM</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Automated Installment & Payment Engine</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Multi-Currency Configuration (USD, BDT, EUR)</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Self-Service Sandbox Access</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenDemoModal('demo')}
                    className="w-full text-sm font-semibold h-11"
                  >
                    Request a Demo
                  </Button>
                </div>
              </Card>

              {/* Pro Enterprise Tier (Highlighted) */}
              <Card className="flex flex-col justify-between border-primary shadow-xl bg-card relative ring-2 ring-primary/20 scale-100 lg:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3 py-1 shadow-md">
                    Most Popular for Property Developers
                  </Badge>
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs border-primary/40 text-primary">Commercial Tier</Badge>
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Pro Enterprise</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Turnkey operations management for established real estate development companies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                    Comprehensive operational governance across commercial and residential projects.
                  </div>
                  <ul className="space-y-3 pt-2">
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Up to 10 Concurrent Development Projects</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Colleague Accounts (Admin, Accountant, Viewer)</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Branded PDF Money Receipts with Company Stamp & Logo</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Vendor Bills & Contractor BOQ Tracking</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Priority Onboarding & Engineering Support</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button
                    onClick={() => handleOpenDemoModal('pro')}
                    className="w-full text-sm font-bold shadow-md shadow-primary/25 h-11"
                  >
                    Request a Demo
                  </Button>
                </div>
              </Card>

              {/* Ultra Dedicated Tier */}
              <Card className="flex flex-col justify-between border-border/80 bg-card shadow-sm hover:border-border transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">Dedicated Architecture</Badge>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Ultra Dedicated</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Engineered for large real estate conglomerates, property funds, and holding groups.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground font-medium">
                    Dedicated infrastructure, bespoke feature integration, and white-labeling.
                  </div>
                  <ul className="space-y-3 pt-2">
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Development Projects & Units</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Dedicated Database Instance & Vault Isolation</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Custom Domain Mapping & White-Labeling</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> Custom Modular Feature Provisioning</li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-primary shrink-0" /> 24/7 Dedicated Engineering Support SLA</li>
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenDemoModal('ultra')}
                    className="w-full text-sm font-semibold h-11"
                  >
                    Request a Demo
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 6. Remotized IT Engineering & Support Contacts                    */}
        {/* ----------------------------------------------------------------- */}
        <section id="contact" className="py-24 border-t border-border/50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-background to-primary/5 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="max-w-3xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Enterprise Engineering by Remotized IT</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Built and Supported by Remotized IT
                </h2>

                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                  EstateFlow is architected with zero-trust tenant isolation, stateless HMAC token validation, and real-time synchronization. Need custom ERP integrations, on-premise cloud infrastructure, or dedicated staff training? Our engineers are ready to assist.
                </p>

                {/* Support Contacts Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  {/* Tech Support */}
                  <div className="p-5 rounded-xl border border-border/80 bg-card/60 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Headphones className="h-4 w-4 text-primary" /> Technical Support & Assistance
                    </div>
                    <p className="text-sm text-muted-foreground">For platform bugs, tenant onboarding, or password reset support:</p>
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href="mailto:support@remotizedit.online"
                        className="font-mono text-sm font-semibold text-primary hover:underline"
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
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sales & Enterprise */}
                  <div className="p-5 rounded-xl border border-border/80 bg-card/60 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Mail className="h-4 w-4 text-emerald-500" /> General Inquiries & Demos
                    </div>
                    <p className="text-sm text-muted-foreground">For custom contracts, module customization, or new client workspaces:</p>
                    <div className="flex items-center justify-between pt-1">
                      <a
                        href="mailto:info@remotizedit.com"
                        className="font-mono text-sm font-semibold text-emerald-500 hover:underline"
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
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <Button
                    size="lg"
                    onClick={() => handleOpenDemoModal('demo')}
                    className="text-base font-bold shadow-md shadow-primary/20 gap-2 h-12 px-6"
                  >
                    Request a Demo <Calendar className="h-4 w-4" />
                  </Button>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="text-base font-semibold h-12 px-6">
                      Access Workspace
                    </Button>
                  </Link>
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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Logo className="h-4 w-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">EstateFlow Real Estate ERP</span>
            </div>

            <div className="text-sm text-muted-foreground text-center sm:text-right">
              <p>Developed with precision by <strong className="text-foreground">Remotized IT</strong>.</p>
              <p className="mt-1">
                Support: <a href="mailto:support@remotizedit.online" className="hover:text-primary transition-colors font-medium">support@remotizedit.online</a> &bull; Inquiries: <a href="mailto:info@remotizedit.com" className="hover:text-primary transition-colors font-medium">info@remotizedit.com</a>
              </p>
            </div>
          </div>
        </footer>

        {/* ----------------------------------------------------------------- */}
        {/* 8. Demo Request Modal Dialog                                      */}
        {/* ----------------------------------------------------------------- */}
        <Dialog open={isDemoModalOpen} onOpenChange={setIsDemoModalOpen}>
          <DialogContent className="sm:max-w-lg">
            {isDemoSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                  <Check className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Demo Request Received!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Thank you, <strong>{demoName}</strong>. Our enterprise team at Remotized IT will review your details and contact you via email ({demoEmail}) to schedule your walkthrough.
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsDemoModalOpen(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitDemoRequest} className="space-y-4">
                <DialogHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <DialogTitle className="text-xl">Request an EstateFlow Demo</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Experience how EstateFlow streamlines inventory, installment generation, and cashflow for your development projects.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-name" className="text-xs font-semibold">Your Full Name *</Label>
                      <Input
                        id="demo-name"
                        placeholder="e.g. Alexander Vance"
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        required
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-email" className="text-xs font-semibold">Work Email Address *</Label>
                      <Input
                        id="demo-email"
                        type="email"
                        placeholder="alexander@company.com"
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        required
                        className="text-sm h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-company" className="text-xs font-semibold">Company / Developer Name *</Label>
                      <Input
                        id="demo-company"
                        placeholder="e.g. Apex Living Properties"
                        value={demoCompany}
                        onChange={(e) => setDemoCompany(e.target.value)}
                        required
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="demo-phone" className="text-xs font-semibold">Phone / WhatsApp Number</Label>
                      <Input
                        id="demo-phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={demoPhone}
                        onChange={(e) => setDemoPhone(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Plan of Interest</Label>
                      <Select
                        value={demoTier}
                        onValueChange={(val: any) => setDemoTier(val)}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select Tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo">Demo Evaluation Sandbox</SelectItem>
                          <SelectItem value="pro">Pro Enterprise Commercial</SelectItem>
                          <SelectItem value="ultra">Ultra Dedicated Bespoke</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Estimated Development Scale</Label>
                      <Select
                        value={demoProjectCount}
                        onValueChange={(val) => setDemoProjectCount(val)}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select Scale" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-3 Projects">1 - 3 Projects</SelectItem>
                          <SelectItem value="4-10 Projects">4 - 10 Projects</SelectItem>
                          <SelectItem value="10+ Large Scale">10+ Large Scale / High-Rise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="demo-notes" className="text-xs font-semibold">Specific Workflow Requirements (Optional)</Label>
                    <Textarea
                      id="demo-notes"
                      rows={3}
                      placeholder="Tell us about your project inventory, installment structures, or custom ERP requirements..."
                      value={demoNotes}
                      onChange={(e) => setDemoNotes(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDemoModalOpen(false)}
                    disabled={isSubmittingDemo}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingDemo}
                    className="gap-1.5"
                  >
                    {isSubmittingDemo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Submit Demo Request
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SmoothScrollProvider>
  );
}
