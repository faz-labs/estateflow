'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Users,
  DollarSign,
  Receipt,
  Truck,
  Briefcase,
  Landmark,
  FileDown,
  Settings,
  ShieldCheck,
  Printer,
  FileText,
  CreditCard,
  Building2,
  CheckCircle2,
  Info,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Coins,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function UserGuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('customers');

  // Search filter helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-card border p-6 md:p-8">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Official Platform Knowledge Base & User Manual
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            EstateFlow User Manual & Knowledge Base
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl leading-relaxed">
            The complete operational guide for real estate developers and property managers. Learn how to track customer payments, manage construction vendor bills, monitor operating overhead, and utilize customer profile ledgers.
          </p>

          {/* Quick Search Bar */}
          <div className="relative max-w-lg pt-2">
            <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search user guide (e.g. 'customer profile', 'receipts', 'expenses', 'due')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/80 border-primary/20 focus-visible:ring-primary h-10 text-sm shadow-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-2.5 h-7 text-xs"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Feature Links Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'customers'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Customer Profiles</span>
          <span className="text-[11px] text-muted-foreground">Ledgers & Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'payments'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Payments</span>
          <span className="text-[11px] text-muted-foreground">Collections & A4 Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'expenses'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Expenses & Bills</span>
          <span className="text-[11px] text-muted-foreground">Vendors & Operating Costs</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'projects'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Projects & Flats</span>
          <span className="text-[11px] text-muted-foreground">Developer vs Landowner</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'roles'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <ShieldCheck className="h-5 w-5 text-rose-600 dark:text-rose-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Roles & Access</span>
          <span className="text-[11px] text-muted-foreground">Admin, Accountant, Viewer</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'settings'
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400 mb-1.5" />
          <span className="text-xs font-semibold text-foreground">Settings & Logo</span>
          <span className="text-[11px] text-muted-foreground">Branding & Currency</span>
        </button>
      </div>

      {/* 3. Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="hidden sm:inline-flex bg-muted/60 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="customers" className="text-xs md:text-sm">Customer Profiles</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs md:text-sm">Payments & Receipts</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs md:text-sm">Expenses & Vendors</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs md:text-sm">Projects & Flats</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs md:text-sm">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs md:text-sm">Company Branding & Settings</TabsTrigger>
          <TabsTrigger value="faq" className="text-xs md:text-sm">FAQ & Troubleshooting</TabsTrigger>
        </TabsList>

        {/* TAB 1: CUSTOMER PROFILES DEEP-DIVE */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Customer Profile & Ledger: What Information Can You Get?
                  </CardTitle>
                  <CardDescription>
                    Every customer in EstateFlow has a real-time financial ledger and asset dossier.
                  </CardDescription>
                </div>
                <Link href="/dashboard/customers">
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <span>Open Customers Directory</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Information block 1: Identity */}
                <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      1
                    </div>
                    <span>Legal & Contact Information</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Full Name:</strong> Legal identity of the purchaser for contract & deed execution.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Primary Phone Number:</strong> Verified contact phone for payment reminders and receipts.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Residential Address:</strong> Permanent or present address on official records.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>National ID (NID) / Passport:</strong> Government identification number for KYC compliance.</span>
                    </li>
                  </ul>
                </div>

                {/* Information block 2: Financials */}
                <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      2
                    </div>
                    <span>Financial Metrics & Real-Time Balance</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Total Paid (Green):</strong> Exact cumulative total of all cleared booking money, down payments, and installments.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <span><strong>Total Due (Red):</strong> Remaining unpaid balance calculated automatically as <code className="text-xs bg-muted px-1 py-0.5 rounded">Total Price - Total Paid</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span><strong>Total Asset Value:</strong> Total combined contract price of all properties purchased by this client.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Information block 3: Properties & Payments */}
              <div className="rounded-xl border p-5 bg-card/60 space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Purchased Properties Portfolio & Payment History Ledger
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Purchased Properties Table</p>
                    <p>Shows every apartment, flat, or commercial shop unit assigned to the client:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li><strong>Flat / Unit Number:</strong> e.g. Apt 4B, Shop #12</li>
                      <li><strong>Project Name:</strong> e.g. Green Valley Heights</li>
                      <li><strong>Sale Agreement Date:</strong> Official registration date</li>
                      <li><strong>Total Price:</strong> Agreed total contract value</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Chronological Payment History</p>
                    <p>Every installment or transaction ever recorded with instant controls:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li><strong>Date & Project:</strong> Formatted timestamp and target building</li>
                      <li><strong>Payment Type:</strong> Booking, Downpayment, Installment, Handover</li>
                      <li><strong>Payment Method:</strong> Cash, Cheque, Bank Transfer, Online</li>
                      <li><strong>Amount Paid:</strong> Cleared amount in tenant's assigned currency</li>
                      <li><strong>Search Bar:</strong> Instant filter by date, payment type, method, or amount</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Information block 4: Printable Receipt */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Printer className="h-5 w-5 text-primary" />
                    <span>Official Money Receipts (Printable A4 / PDF Export)</span>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary">Standard A4 Format</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  From any customer profile payment row, click the <strong className="text-foreground">View Receipt</strong> action to open the tenant's official Money Receipt. It automatically includes:
                </p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-background border">
                    <strong className="text-foreground block">Company Branding</strong>
                    Your custom uploaded logo, company name, address, phone, and email.
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <strong className="text-foreground block">Receipt Number</strong>
                    Automatic sequential receipt identifier (e.g. REC-1049) with transaction date.
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <strong className="text-foreground block">Amount in Words</strong>
                    Exact amount in figures and words, plus customer name, flat, and payment method.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PAYMENTS & COLLECTIONS */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Where to See Payments & How to Record Them
                  </CardTitle>
                  <CardDescription>
                    Tracking cash inflows from customer bookings, down payments, and monthly installments.
                  </CardDescription>
                </div>
                <Link href="/dashboard/add-payment">
                  <Button size="sm" className="gap-1 text-xs">
                    <span>Record New Payment</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-[11px] mb-1">Method 1</Badge>
                    <CardTitle className="text-base">Add Payment Page</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>Go to <strong>Sidebar → Add Payment</strong> (`/dashboard/add-payment`).</p>
                    <p>Select Project, then choose the Flat. The customer details and remaining due balance will populate automatically.</p>
                    <Link href="/dashboard/add-payment" className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-2">
                      Go to Add Payment <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-[11px] mb-1">Method 2</Badge>
                    <CardTitle className="text-base">Customer Profile Ledger</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>Go to <strong>Sidebar → Customers</strong>, then click any customer name to open their profile.</p>
                    <p>Scroll to the <strong>Payment History</strong> table to see all past collections, view receipts, or edit records.</p>
                    <Link href="/dashboard/customers" className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-2">
                      Go to Customers <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-[11px] mb-1">Method 3</Badge>
                    <CardTitle className="text-base">Export Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>Go to <strong>Sidebar → Export Reports</strong> (`/dashboard/export-reports`).</p>
                    <p>Select a date range and filter by Project to export a clean CSV spreadsheet of all collections for accounting.</p>
                    <Link href="/dashboard/export-reports" className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-2">
                      Go to Export Reports <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Step by Step Add Payment Flow */}
              <div className="rounded-xl border p-5 bg-card space-y-4">
                <h3 className="text-base font-bold text-foreground">Step-by-Step: Recording a Payment & Printing Receipt</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                    <div className="font-bold text-primary flex items-center gap-1">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">1</span>
                      Select Project & Unit
                    </div>
                    <p className="text-muted-foreground">Choose the building and sold flat number. Customer name loads instantly.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                    <div className="font-bold text-primary flex items-center gap-1">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">2</span>
                      Enter Amount & Type
                    </div>
                    <p className="text-muted-foreground">Select Booking Money, Downpayment, or Monthly Installment and input the amount.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                    <div className="font-bold text-primary flex items-center gap-1">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">3</span>
                      Select Payment Method
                    </div>
                    <p className="text-muted-foreground">Cash, Cheque, Bank Transfer, or Online Gateway. Add reference note if applicable.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                    <div className="font-bold text-primary flex items-center gap-1">
                      <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">4</span>
                      Print / PDF Receipt
                    </div>
                    <p className="text-muted-foreground">Click Submit. The A4 printable receipt popup opens immediately for printing or download.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: EXPENSES & VENDORS */}
        <TabsContent value="expenses" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-600" />
                    Where to See Expenses & How They Are Categorized
                  </CardTitle>
                  <CardDescription>
                    EstateFlow splits expenses into two distinct accounting categories: Project Construction Bills vs General Operating Costs.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href="/dashboard/expense">
                    <Button size="sm" variant="outline" className="text-xs">Add Project Expense</Button>
                  </Link>
                  <Link href="/dashboard/operating-cost">
                    <Button size="sm" className="text-xs">Operating Costs</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pillar 1: Project & Vendor Expenses */}
                <div className="rounded-xl border p-5 bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <Truck className="h-5 w-5 text-amber-600" />
                      <span>1. Project Construction & Vendor Bills</span>
                    </div>
                    <Badge variant="secondary">Project-Tied</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Expenses incurred directly for constructing a project (e.g. Rod/Steel, Cement, Bricks, Sand, Electrical, Labor, Tiles, Architectural Fees).
                  </p>
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Vendors / Bills Directory (`/dashboard/vendors`)</strong>
                      See all suppliers, materials supplied, total billed amount, total amount paid, and outstanding unpaid balance per vendor.
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Add Expense (`/dashboard/expense`)</strong>
                      Record a new material bill or subcontractor invoice tied to a specific project and vendor.
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Make Payment (`/dashboard/make-payment`)</strong>
                      Disburse money to clear a vendor's bill, reducing their outstanding balance and tracking cash outflow.
                    </div>
                  </div>
                </div>

                {/* Pillar 2: Operating Costs */}
                <div className="rounded-xl border p-5 bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-purple-600" />
                      <span>2. Company Operating Costs & Overhead</span>
                    </div>
                    <Badge variant="secondary">Company-Wide</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Everyday business operating expenses that are NOT tied to one specific building flat (e.g., Office rent, electricity bills, staff salaries, internet, marketing, stationery, petty cash).
                  </p>
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Operating Cost Page (`/dashboard/operating-cost`)</strong>
                      Log any office overhead with expense category, payment date, description, and amount.
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Overhead Analytics & History</strong>
                      Monitor monthly burn rate and compare project costs vs administrative overhead.
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <strong className="text-foreground block">Export Reports (`/dashboard/export-reports`)</strong>
                      Download operating cost statements by month or year for auditing.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PROJECTS & FLATS */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                    Projects, Flats & Inventory Lifecycle
                  </CardTitle>
                  <CardDescription>
                    Manage building developments, flat unit sizes, and Developer vs Landowner share distribution.
                  </CardDescription>
                </div>
                <Link href="/dashboard/projects">
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <span>Manage Projects</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl border p-4 bg-card space-y-2">
                  <span className="font-bold text-primary block text-sm">1. Create Project</span>
                  <p className="text-muted-foreground">
                    Define project name, address/location, total number of units, target sales revenue, and project timeline.
                  </p>
                </div>
                <div className="rounded-xl border p-4 bg-card space-y-2">
                  <span className="font-bold text-primary block text-sm">2. Add Flats / Units</span>
                  <p className="text-muted-foreground">
                    Assign flat numbers, floor numbers, square footage (sqft), price per sqft, and designate whether it belongs to the <strong>Developer Share</strong> or <strong>Landowner Share</strong>.
                  </p>
                </div>
                <div className="rounded-xl border p-4 bg-card space-y-2">
                  <span className="font-bold text-primary block text-sm">3. Sales Execution</span>
                  <p className="text-muted-foreground">
                    Under <strong>Sidebar → Sales</strong>, sell a flat to an existing customer. The flat status transitions from <Badge variant="outline" className="text-[10px]">Available</Badge> to <Badge className="text-[10px] bg-green-600">Sold</Badge> automatically.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                  <Info className="h-4 w-4" />
                  <span>Important: Developer Share vs. Landowner Share</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  In joint-venture developments, flats allocated to the landowner are tracked separately in the inventory so your sales team cannot accidentally sell landowner units. Only Developer Share flats are added to the active sales catalog.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: ROLES & ACCESS CONTROL */}
        <TabsContent value="roles" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-rose-600" />
                User Roles & Permission Matrix
              </CardTitle>
              <CardDescription>
                EstateFlow enforces Role-Based Access Control (RBAC) to ensure security and prevent unauthorized data tampering.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Role 1: Admin */}
                <div className="rounded-xl border p-5 bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Tenant Admin</span>
                    <Badge>Full Access</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Managing director, company owner, or lead administrator.
                  </p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li>Create & edit projects and flats</li>
                    <li>Record sales, customer payments, and receipts</li>
                    <li>Manage vendor bills, expenses, and operating costs</li>
                    <li>Update company profile, logo, address, and currency</li>
                    <li>Request new user seats for the organization</li>
                  </ul>
                </div>

                {/* Role 2: Accountant */}
                <div className="rounded-xl border p-5 bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Accountant</span>
                    <Badge variant="secondary">Financial Operator</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accounts team, finance manager, or billing executive.
                  </p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li>Add customer payments and print official A4 receipts</li>
                    <li>Add vendor expenses and disburse vendor payments</li>
                    <li>Record daily office operating costs</li>
                    <li>Export financial statements and CSV reports</li>
                    <li>Cannot edit company settings or tenant currency</li>
                  </ul>
                </div>

                {/* Role 3: Viewer */}
                <div className="rounded-xl border p-5 bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Viewer</span>
                    <Badge variant="outline">Read-Only</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auditors, external partners, investors, or read-only viewers.
                  </p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li>View all dashboards, KPI cards, and project lists</li>
                    <li>View customer profile ledgers and payment histories</li>
                    <li>View and print customer money receipts</li>
                    <li>Export reports for audit inspection</li>
                    <li><strong>Protected:</strong> Cannot create, edit, or delete data (guarded with friendly permission notices)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: SETTINGS & BRANDING */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Company Branding, Logo & Settings
                  </CardTitle>
                  <CardDescription>
                    Customize your company details so all generated Money Receipts reflect your official branding.
                  </CardDescription>
                </div>
                <Link href="/dashboard/settings">
                  <Button size="sm" className="gap-1 text-xs">
                    <span>Open Settings</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl border p-5 bg-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Company Logo & Receipt Details
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Under <strong>Sidebar → Settings</strong>, upload your official company logo:
                  </p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li><strong>Recommended Size:</strong> 400x120px PNG or JPG with transparent/white background.</li>
                    <li><strong>File Size Cap:</strong> Kept under 500KB to ensure fast PDF rendering and low bandwidth.</li>
                    <li><strong>Receipt Header:</strong> Automatically prints at the top of every customer A4 receipt along with your company name, physical address, phone numbers, and official email.</li>
                  </ul>
                </div>

                <div className="rounded-xl border p-5 bg-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    Currency & Team Accounts
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    EstateFlow supports multi-currency configurations:
                  </p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li><strong>Assigned Currency:</strong> Configured for your tenant (USD, BDT, GBP, EUR, CHF, etc.) with automatic currency symbols on all receipts and tables.</li>
                    <li><strong>Request Additional Users:</strong> In Settings, click <em>Request User Access</em> to submit an email and role request directly to the system administrator.</li>
                    <li><strong>Password Resets:</strong> Secure password recovery handled via dedicated enterprise Mailcow SMTP.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: FAQ & TROUBLESHOOTING */}
        <TabsContent value="faq" className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions & Quick Help
              </CardTitle>
              <CardDescription>
                Common solutions and operational guidance for new and existing users.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="item-1" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    How do I print a receipt for a customer who paid last month?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                    Navigate to <strong>Customers</strong> in the sidebar, click on the customer's name to open their profile, find the payment in the <strong>Payment History</strong> table, click the action menu (three dots), and select <strong>View Receipt</strong>. From the receipt dialog, click <strong>Print Receipt</strong> to print directly or save as PDF.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    What happens if I enter the wrong payment amount or date?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                    On the customer's profile, find the transaction row and click the action menu. If you are an Admin or Accountant, choose <strong>Edit</strong> to correct the date, amount, method, or note. If the transaction was recorded in error, select <strong>Delete</strong>. The customer's Total Paid and Total Due will update immediately in real time.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Why does my receipt show a default logo instead of our company logo?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                    Go to <strong>Sidebar → Settings</strong>. Under Organization Profile, upload your company logo (PNG or JPG) and fill in your official company name, address, and contact details. Once saved, all future and past receipts will automatically render your custom company header.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    What is the difference between "Add Expense" and "Operating Cost"?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                    <strong>Add Expense</strong> is strictly for construction bills and material purchases tied directly to a building project and vendor (e.g. cement, steel, bricks, plumbing). <strong>Operating Cost</strong> is for company-wide operational overhead not tied to a specific flat (e.g. office rent, utility bills, employee salaries, snacks, marketing).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    Why is a team member receiving a "Permission Denied" message?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1">
                    If an account is set to the <strong>Viewer</strong> role, it is strictly read-only to preserve financial integrity. Viewers can inspect all ledgers, dashboards, and receipts, but cannot add, edit, or delete transactions. If they need to record entries, an Admin can request a role upgrade to <strong>Accountant</strong>.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
