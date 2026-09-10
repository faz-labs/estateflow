
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
import type { Project, Vendor, ExpenseItem, Expense } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EnrichedExpense } from '@/app/dashboard/expense/page';
import { useUserProfile } from '@/hooks/use-user-profile';
import { toInputDateValue } from '@/lib/date-utils';
import {
  Building2,
  Truck,
  Calendar,
  Package,
  Hash,
  Coins,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

const editExpenseFormSchema = z.object({
  vendorId: z.string().min(1, { message: 'Please select a vendor.' }),
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  itemId: z.string().min(1, { message: 'Please select an expense item.' }),
  quantity: z.coerce.number().optional(),
  price: z.coerce.number().min(1, { message: 'Price must be greater than 0.' }),
  date: z.string().min(1, { message: 'Expense date is required.' }),
  description: z.string().optional(),
});

type EditExpenseFormValues = z.infer<typeof editExpenseFormSchema>;

interface EditExpenseFormProps {
  expense: EnrichedExpense;
  setDialogOpen: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditExpenseForm({ expense, setDialogOpen, onUpdate }: EditExpenseFormProps) {
  const { tenantId, currencySymbol, isViewer } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const vendorsQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'vendors'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const projectsQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'projects'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

  const itemsQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'expenseItems'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: expenseItems, isLoading: itemsLoading } = useCollection<ExpenseItem>(itemsQuery);

  const form = useForm<EditExpenseFormValues>({
    resolver: zodResolver(editExpenseFormSchema),
    defaultValues: {
      ...expense,
      date: toInputDateValue(expense.date),
    },
  });

  async function onSubmit(data: EditExpenseFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Action Restricted',
        description: 'Viewers do not have permission to modify expense records.',
      });
      return;
    }

    try {
      const expenseRef = doc(firestore, 'expenses', expense.id);
      
      const updatedData = {
        ...data,
        date: data.date,
      };

      updateDocumentNonBlocking(expenseRef, updatedData);

      toast({
        title: 'Expense Updated',
        description: `Expense ${expense.expenseId} has been successfully updated.`,
      });
      onUpdate();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating expense: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update the expense. ' + error.message,
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
                name="projectId"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-start space-y-1.5">
                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" /> Project <span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                        options={projects?.map(p => ({ value: p.id, label: p.projectName })) || []}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select a project"
                        searchPlaceholder="Search projects..."
                        emptyText="No projects found."
                        disabled={projectsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-start space-y-1.5">
                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Truck className="h-3.5 w-3.5 text-primary" /> Vendor / Contractor <span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                        options={vendors?.map(v => ({ value: v.id, label: v.vendorName })) || []}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select a vendor"
                        searchPlaceholder="Search vendors..."
                        emptyText="No vendors found."
                        disabled={vendorsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Package className="h-3.5 w-3.5 text-primary" /> Expense Item <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                      options={expenseItems?.map(i => ({ value: i.id, label: i.name })) || []}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select an item"
                      searchPlaceholder="Search items..."
                      emptyText="No items found."
                      disabled={itemsLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-start space-y-1.5">
                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Hash className="h-3.5 w-3.5 text-primary" /> Quantity (Units)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="1" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-start space-y-1.5">
                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Coins className="h-3.5 w-3.5 text-primary" /> Total Price ({currencySymbol}) <span className="text-rose-500">*</span>
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
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Expense Date <span className="text-rose-500">*</span>
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
              name="description"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Memo & Notes
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any extra details or batch notes..." className="rounded-xl border-border/80 shadow-xs min-h-[85px] p-3" {...field} />
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
