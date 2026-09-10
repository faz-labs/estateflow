'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { OperatingCost, OperatingCostItem } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import type { EnrichedOperatingCost } from '@/app/dashboard/operating-cost/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { toInputDateValue } from '@/lib/date-utils';
import {
  Calendar,
  Layers,
  Coins,
  Hash,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';


const editCostFormSchema = z.object({
  date: z.string().min(1, { message: 'Expense date is required.' }),
  itemId: z.string().min(1, { message: 'Please select an item.' }),
  description: z.string().optional(),
  reference: z.string().optional(),
  amount: z.coerce.number().min(1, { message: 'Amount must be greater than 0.' }),
});

type EditCostFormValues = z.infer<typeof editCostFormSchema>;

interface EditOperatingCostFormProps {
  cost: EnrichedOperatingCost;
  setDialogOpen: (open: boolean) => void;
}

export function EditOperatingCostForm({ cost, setDialogOpen }: EditOperatingCostFormProps) {
  const { tenantId, currencySymbol, isViewer } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const itemsQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'operatingCostItems'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: costItems, isLoading: itemsLoading } = useCollection<OperatingCostItem>(itemsQuery);

  const form = useForm<EditCostFormValues>({
    resolver: zodResolver(editCostFormSchema),
    defaultValues: {
      ...cost,
      date: toInputDateValue(cost.date),
    },
  });

  async function onSubmit(data: EditCostFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Action Restricted',
        description: 'Viewers do not have permission to modify operating cost records.',
      });
      return;
    }

    try {
      const costRef = doc(firestore, 'operatingCosts', cost.id);
      
      const updatedData = {
        ...data,
        date: data.date,
      };

      updateDocumentNonBlocking(costRef, updatedData);

      toast({
        title: 'Cost Updated',
        description: `The operating cost has been successfully updated.`,
      });
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update the cost. ' + error.message,
      });
    }
  }

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-1.5">
                          <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> Cost Date <span className="text-rose-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="date" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-1.5">
                          <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Layers className="h-3.5 w-3.5 text-primary" /> Expense Category <span className="text-rose-500">*</span>
                          </FormLabel>
                          <Combobox
                            className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                            options={costItems?.map(i => ({ value: i.id, label: i.name })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a category"
                            searchPlaceholder="Search categories..."
                            emptyText="No categories found."
                            disabled={itemsLoading}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-1.5">
                          <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Coins className="h-3.5 w-3.5 text-primary" /> Amount ({currencySymbol}) <span className="text-rose-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                {currencySymbol}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0.00"
                                className="h-11 pl-12 pr-3.5 rounded-xl border-border/80 shadow-xs font-semibold text-base"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-1.5">
                          <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Hash className="h-3.5 w-3.5 text-primary" /> Voucher / Cheque / Ref #
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Invoice #1029, Cheque #44" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-start space-y-1.5">
                      <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <FileText className="h-3.5 w-3.5 text-primary" /> Description & Business Purpose
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Monthly executive corporate office lease for September" className="rounded-xl border-border/80 shadow-xs min-h-[85px] p-3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-3 border-t border-border/50">
          <Button
            type="submit"
            disabled={isViewer || form.formState.isSubmitting}
            className="h-11 px-7 font-semibold rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : isViewer ? (
              'Read-Only (Viewer Access)'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
