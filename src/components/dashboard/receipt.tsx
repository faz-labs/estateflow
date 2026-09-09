'use client';

import React, { useState } from 'react';
import type { Customer, InflowTransaction, Project } from '@/lib/types';
import { Building2, CheckCircle2 } from 'lucide-react';
import { getCurrency, formatCurrency, formatAmountInWords } from '@/lib/currencies';
import { formatDateForDisplay } from '@/lib/date-utils';

export interface CompanyProfile {
    name: string;
    logo?: string;
    phone?: string;
    website?: string;
    email?: string;
    address?: string;
}

interface ReceiptProps {
    payment: InflowTransaction & { customerName?: string; projectName?: string; flatNumber?: string };
    customer: Customer;
    project: Project;
    company?: Partial<CompanyProfile>;
    currency?: string;
}

export const Receipt: React.FC<ReceiptProps> = ({ payment, customer, project, company: customCompany, currency }) => {
    const [logoError, setLogoError] = useState(false);

    const company: CompanyProfile = {
        name: customCompany?.name?.trim() || 'EstateFlow Workspace',
        logo: customCompany?.logo || '',
        phone: customCompany?.phone?.trim() || '',
        website: customCompany?.website?.trim() || '',
        email: customCompany?.email?.trim() || '',
        address: customCompany?.address?.trim() || ''
    };

    const curr = getCurrency(currency);
    const amountInWordsText = formatAmountInWords(payment.amount, curr.code);
    const formattedDate = payment.date ? formatDateForDisplay(payment.date) : 'N/A';

    const hasContactInfo = Boolean(company.phone || company.email || company.website);

    return (
        <div 
            id="receipt-printable-area" 
            className="bg-white text-slate-900 font-sans w-full max-w-[210mm] min-h-[297mm] mx-auto flex flex-col justify-between p-8 sm:p-10"
            style={{ 
                fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif)"
            }}
        >
            {/* Header */}
            <div>
                <header className="border-b border-slate-200 pb-6 mb-6">
                    <div className="flex flex-row items-center justify-between gap-4 mb-4">
                        {/* Company Logo or Icon & Name */}
                        <div className="flex items-center gap-3">
                            {company.logo && !logoError ? (
                                <img 
                                    src={company.logo} 
                                    alt={`${company.name} Logo`} 
                                    className="max-h-16 max-w-[200px] object-contain"
                                    crossOrigin="anonymous"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                    <Building2 className="h-6 w-6" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">{company.name}</h1>
                                {company.address && (
                                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed mt-0.5">{company.address}</p>
                                )}
                            </div>
                        </div>

                        {/* Receipt Badge and Details */}
                        <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-slate-900 text-white mb-2">
                                Official Receipt
                            </span>
                            <table className="text-xs ml-auto border-separate border-spacing-y-1">
                                <tbody>
                                    <tr>
                                        <td className="text-slate-500 font-medium pr-3 text-right">Receipt No:</td>
                                        <td className="font-mono font-bold text-slate-900">{payment.receiptId}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-slate-500 font-medium pr-3 text-right">Date:</td>
                                        <td className="font-semibold text-slate-900">{formattedDate}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {hasContactInfo && (
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            {company.phone && <span>Tel: {company.phone}</span>}
                            {company.email && <span>Email: {company.email}</span>}
                            {company.website && <span>Web: {company.website}</span>}
                        </div>
                    )}
                </header>

                {/* Main Content */}
                <main className="space-y-6">
                    {/* Customer & Project Info Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                                Received From (Customer)
                            </span>
                            <p className="text-base font-bold text-slate-900">{customer?.fullName || payment.customerName || 'Valued Customer'}</p>
                            {customer?.mobile && <p className="text-xs text-slate-600 mt-1">Mobile: {customer.mobile}</p>}
                            {customer?.nidNumber && <p className="text-xs text-slate-500">NID: {customer.nidNumber}</p>}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                                Property Information
                            </span>
                            <p className="text-base font-bold text-slate-900">{project?.projectName || payment.projectName || 'Project Property'}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                                <span>Flat No: <strong className="font-semibold text-slate-900">{payment.flatNumber || 'N/A'}</strong></span>
                                {project?.location && <span>Location: {project.location}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Payment Specification Table */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                <tr>
                                    <th className="p-3">Payment Purpose</th>
                                    <th className="p-3">Payment Mode</th>
                                    <th className="p-3">Reference / Cheque</th>
                                    <th className="p-3 text-right">Amount ({curr.code})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-800">
                                <tr>
                                    <td className="p-3 font-medium">
                                        {payment.paymentPurpose === 'Other' ? (payment.otherPurpose || 'Other') : payment.paymentPurpose}
                                    </td>
                                    <td className="p-3">
                                        <span className="inline-flex items-center gap-1">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            {payment.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono text-xs text-slate-600">
                                        {payment.reference || 'N/A'}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-base text-slate-900">
                                        {formatCurrency(payment.amount, curr.code)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Amount In Words Banner */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-0.5">
                            Amount in Words
                        </span>
                        <p className="text-sm font-semibold text-slate-900 italic">
                            {amountInWordsText}
                        </p>
                    </div>

                    {/* Total Highlight */}
                    <div className="flex justify-end">
                        <div className="rounded-lg bg-slate-900 text-white px-6 py-3 min-w-[240px] text-right">
                            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Total Received</span>
                            <span className="text-2xl font-bold font-mono tracking-tight text-white">
                                {formatCurrency(payment.amount, curr.code)}/-
                            </span>
                        </div>
                    </div>
                </main>
            </div>

            {/* Footer / Signatures */}
            <footer className="mt-12 pt-8 border-t border-slate-200 text-xs">
                <div className="grid grid-cols-3 gap-8 items-end text-center">
                    <div>
                        <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                            Prepared / Received By
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                            This is a computer-generated transaction document from EstateFlow.
                        </p>
                    </div>
                    <div>
                        <div className="border-t border-slate-400 pt-2 font-medium text-slate-700">
                            Authorized Signature<br />
                            <span className="text-[10px] text-slate-500 font-normal">For {company.name}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
