
'use client';

import React from 'react';
import { EnrichedExpense } from '@/app/dashboard/expense/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatDateForDisplay } from '@/lib/date-utils';

interface ExpenseDetailsProps {
  expense: EnrichedExpense;
}

export const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ expense }) => {
  const { formatCurrency } = useUserProfile();

  return (
    <ScrollArea className="max-h-[60vh] pr-6">
      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Vendor</p>
          <p>{expense.vendorName}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Project</p>
          <p>{expense.projectName}</p>
        </div>
         <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Item</p>
          <p>{expense.itemName}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Date</p>
          <p>{formatDateForDisplay(expense.date)}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Quantity</p>
          <p>{expense.quantity || 'N/A'}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Total Price</p>
          <p className="font-bold">{formatCurrency(expense.price)}</p>
        </div>
        {expense.description && (
          <div className="space-y-1 pt-2">
            <p className="font-semibold text-primary">Description</p>
            <p className="text-muted-foreground bg-slate-50 p-3 rounded-md">{expense.description}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
