





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
  expiresAt?: string; // ISO date string for demo expiration (15 days)
  maxProjects?: number; // e.g. 5 for demo, 10 for pro, 999999 for ultra
}

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
    