'use client';

import React from 'react';
import type { EnrichedOperatingCost } from '@/app/dashboard/operating-cost/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { formatDateForDisplay } from '@/lib/date-utils';

interface OperatingCostDetailsProps {
  cost: EnrichedOperatingCost;
}

export const OperatingCostDetails: React.FC<OperatingCostDetailsProps> = ({ cost }) => {
  const { formatCurrency } = useUserProfile();

  return (
    <ScrollArea className="max-h-[60vh] pr-6">
      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Date</p>
          <p>{formatDateForDisplay(cost.date)}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Item</p>
          <p>{cost.itemName}</p>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <p className="font-semibold text-primary">Amount</p>
          <p className="font-bold">{formatCurrency(cost.amount)}</p>
        </div>
        {cost.reference && (
          <div className="flex justify-between items-center pb-2 border-b">
            <p className="font-semibold text-primary">Reference</p>
            <p>{cost.reference}</p>
          </div>
        )}
        {cost.description && (
          <div className="space-y-1 pt-2">
            <p className="font-semibold text-primary">Description</p>
            <p className="text-muted-foreground bg-slate-50 p-3 rounded-md">{cost.description}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
