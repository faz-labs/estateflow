





export type ProjectStatus = 'Planning' | 'Ongoing' | 'Completed';
export type FlatOwnership = 'Developer' | 'Landowner';
export type FlatStatus = 'Available' | 'Sold' | 'Reserved';
export type PaymentMode = 'Cash' | 'Cheque' | 'Bank Transfer';
export type TransactionType = 'Inflow' | 'Outflow';
export type InflowType = 'Booking' | 'Installment';
export type OutflowCategory = 'Material' | 'Labor' | 'Utility' | 'Office';
export type PaymentPurpose = 'Booking Money' | 'Installment' | 'Other';
export type ExpenseStatus = 'Unpaid' | 'Partially Paid' | 'Paid';


export type SubscriptionPlan = 'demo' | 'pro' | 'ultra' | 'starter' | 'enterprise';
export type TenantStatus = 'active' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  plan: SubscriptionPlan;
  status: TenantStatus;
  currency?: string; // e.g., 'USD', 'GBP', 'CHF', 'BDT', 'EUR'
  expiresAt?: string; // ISO date string for demo expiration (15 days)
  maxProjects?: number; // e.g. 5 for demo, 10 for pro, 999999 for ultra
  // Company Profile / Branding for Receipts & Invoices:
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  assignedModules?: string[]; // Modular feature IDs enabled for this tenant workspace
}

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'finance' | 'operations' | 'automation' | 'upcoming';
  badge?: string;
  status: 'active' | 'beta' | 'planned';
}

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'inventory',
    name: 'Plot & Multi-Unit Blueprint Inventory',
    description: 'Manage unit layouts, blocks, dimensions, and real-time availability states.',
    category: 'core',
    status: 'active',
  },
  {
    id: 'sales_booking',
    name: 'Sales Contracts & Installment Generator',
    description: 'Booking agreements, payment schedules, and automated overdue tracking.',
    category: 'finance',
    status: 'active',
  },
  {
    id: 'procurement_ledger',
    name: 'Procurement & Vendor Payable Ledger',
    description: 'Contractor bills, raw materials accounting, and supplier payment vouchers.',
    category: 'operations',
    status: 'active',
  },
  {
    id: 'direct_cashflow',
    name: 'Direct Cashflow & Bank Accounts',
    description: 'Real-time multi-account tracking, petty cash ledger, and money receipts.',
    category: 'finance',
    status: 'active',
  },
  {
    id: 'operating_expenses',
    name: 'Operating Costs & Corporate Overheads',
    description: 'Corporate overheads, salaries, utilities, and branch expense attribution.',
    category: 'operations',
    status: 'active',
  },
  {
    id: 'export_reporting',
    name: 'Comprehensive Audit & Export Center',
    description: 'Automated PDF money receipts, customer balance sheets, and Excel tax reports.',
    category: 'automation',
    status: 'active',
  },
  {
    id: 'whatsapp_sms_alerts',
    name: 'WhatsApp & SMS Gateway Alerts',
    description: 'Automated installment due dates and payment receipts sent directly to buyer phones.',
    category: 'automation',
    badge: 'Q3 2026',
    status: 'planned',
  },
  {
    id: 'client_portal',
    name: 'Customer Self-Service Installment Portal',
    description: 'End-customer portal for clients to view payment schedules and pay online.',
    category: 'upcoming',
    badge: 'Q4 2026',
    status: 'planned',
  },
  {
    id: 'broker_commissions',
    name: 'Agent & External Broker Commission Tracker',
    description: 'Tiered agent bonus calculation, payout approval workflow, and referral ledgers.',
    category: 'operations',
    badge: 'Q4 2026',
    status: 'planned',
  },
];

export interface TenantInvite {
  id: string;
  email: string;
  tenantId: string;
  companyName: string;
  role: 'Admin' | 'Accountant' | 'Viewer';
  invitedBy: string;
  createdAt: string;
  status: 'pending' | 'accepted';
}

export interface TenantNotice {
  id: string;
  tenantId: string; // specific tenantId or 'all' for broadcast
  title: string;
  message: string;
  priority?: 'info' | 'warning' | 'urgent';
  createdAt: string;
  createdBy?: string;
  readBy?: string[]; // Array of user UIDs who have read/dismissed the notice
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SuperAdmin' | 'Admin' | 'Accountant' | 'Viewer';
  tenantId?: string;
  companyName?: string;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  projectName: string;
  location: string;
  totalFlats: number;
  startDate: string;
  status: ProjectStatus;
  targetSell: number;
  tenantId?: string;
}

export interface Flat {
  id: string;
  projectId: string;
  flatNumber: string;
  flatSize: number;
  ownership: FlatOwnership;
  salePrice?: number;
  status: FlatStatus;
}

export interface Customer {
  id: string;
  fullName: string;
  mobile: string;
  address: string;
  nidNumber: string;
  tenantId?: string;
}

export interface Vendor {
  id: string;
  vendorName: string;
  phoneNumber: string;
  enterpriseName: string;
  details?: string;
  tenantId?: string;
}

export interface InflowTransaction {
  id: string;
  projectId: string;
  flatId: string;
  customerId: string;
  paymentType: InflowType;
  date: string;
  amount: number;
  paymentMethod: PaymentMode;
  receiptId: string; // Changed from optional
  reference?: string;
  paymentPurpose: PaymentPurpose;
  otherPurpose?: string;
  tenantId?: string;
}

export interface OutflowTransaction {
  id: string;
  projectId?: string;
  expenseCategory: OutflowCategory;
  supplierVendor: string;
  amount: number;
  date: string;
  expenseId?: string; // To link back to the detailed expense record
  description?: string;
  paymentMethod?: PaymentMode;
  reference?: string;
  tenantId?: string;
}

export interface Sale {
  id: string;
  projectId: string;
  flatId: string;
  customerId: string;
  totalPrice: number;
  perSftPrice?: number;
  parkingCharge?: number;
  utilityCharge?: number;
  downpayment?: number;
  monthlyInstallment?: number;
  saleDate: string;
  note?: string;
  deedLink?: string;
  extraCosts?: { purpose: string; amount: number }[];
  tenantId?: string;
}

export interface Counter {
    current: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  tenantId?: string;
}

export interface Expense {
  id: string;
  expenseId: string; // The user-facing ID like EXID-0100
  vendorId: string;
  projectId: string;
  itemId: string;
  quantity?: number;
  price: number;
  paidAmount: number;
  status: ExpenseStatus;
  date: string;
  description?: string;
  tenantId?: string;
}

export interface OperatingCostItem {
  id: string;
  name: string;
  tenantId?: string;
}

export interface OperatingCost {
  id: string;
  date: string;
  itemId: string;
  description?: string;
  reference?: string;
  amount: number;
  tenantId?: string;
}

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  projectCount?: string;
  tier: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'provisioned';
  createdAt: string;
  contactedAt?: string;
  provisionedAt?: string;
}