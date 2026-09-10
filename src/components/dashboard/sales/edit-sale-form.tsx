
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, writeBatch, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Project, Flat, Customer, Sale } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Building2, Home, User, Banknote, Calendar, Link2, FileText, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserProfile } from '@/hooks/use-user-profile';
import { toInputDateValue } from '@/lib/date-utils';

const editSaleFormSchema = z.object({
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  flatId: z.string().min(1, { message: 'Please select a flat.' }),
  customerId: z.string().min(1, { message: 'Please select a customer.' }),
  totalPrice: z.coerce.number().min(1, { message: 'Base price is required.' }),
  perSftPrice: z.coerce.number().optional(),
  parkingCharge: z.coerce.number().optional(),
  utilityCharge: z.coerce.number().optional(),
  downpayment: z.coerce.number().optional(),
  monthlyInstallment: z.coerce.number().optional(),
  saleDate: z.string().min(1, { message: 'Sale date is required.' }),
  note: z.string().optional(),
  deedLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  extraCosts: z.array(z.object({
    purpose: z.string().min(1, { message: 'Purpose is required.' }),
    amount: z.coerce.number().min(1, { message: 'Amount must be > 0.' }),
  })).optional(),
});

type EditSaleFormValues = z.infer<typeof editSaleFormSchema>;

interface EditSaleFormProps {
    sale: Sale;
    setDialogOpen: (open: boolean) => void;
    onSaleUpdated?: () => void;
}

export function EditSaleForm({ sale, setDialogOpen, onSaleUpdated }: EditSaleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, currencySymbol, formatCurrency, isViewer } = useUserProfile();
  const router = useRouter();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(sale.projectId);

  // Data fetching
  const projectsQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'projects'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

  const customersQuery = useMemoFirebase(
    () => (!firestore || !tenantId ? null : query(collection(firestore, 'customers'), where('tenantId', '==', tenantId))),
    [firestore, tenantId]
  );
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const availableFlatsQuery = useMemoFirebase(() =>
    selectedProjectId
      ? query(
          collection(firestore, 'projects', selectedProjectId, 'flats')
        )
      : null
  , [firestore, selectedProjectId]);
  const { data: availableFlats, isLoading: flatsLoading } = useCollection<Flat>(availableFlatsQuery);

  const form = useForm<EditSaleFormValues>({
    resolver: zodResolver(editSaleFormSchema),
    defaultValues: {
      projectId: sale.projectId,
      flatId: sale.flatId,
      customerId: sale.customerId,
      totalPrice: sale.totalPrice,
      perSftPrice: sale.perSftPrice || 0,
      parkingCharge: sale.parkingCharge || 0,
      utilityCharge: sale.utilityCharge || 0,
      downpayment: sale.downpayment || 0,
      monthlyInstallment: sale.monthlyInstallment || 0,
      saleDate: toInputDateValue(sale.saleDate),
      note: sale.note || '',
      deedLink: sale.deedLink || '',
      extraCosts: sale.extraCosts || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "extraCosts",
  });
  
  const watchBasePrice = form.watch('totalPrice');
  const watchExtraCosts = form.watch('extraCosts');
  const watchDownpayment = form.watch('downpayment');

  const calculatedTotalPrice = (Number(watchBasePrice) || 0) + 
    (watchExtraCosts?.reduce((acc, cost) => acc + (Number(cost.amount) || 0), 0) || 0);

  const dueAmount = Math.max(0, calculatedTotalPrice - (Number(watchDownpayment) || 0));

  async function onSubmit(data: EditSaleFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role).',
      });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        
        const finalTotalPrice = calculatedTotalPrice;

        // 1. Update sale document
        const saleRef = doc(firestore, 'sales', sale.id);
        batch.update(saleRef, {
            ...data,
            totalPrice: finalTotalPrice,
            saleDate: new Date(data.saleDate).toISOString(),
            tenantId: tenantId || 'default_workspace',
        });

        // 2. Handle flat status change if flat was changed
        if (data.flatId !== sale.flatId || data.projectId !== sale.projectId) {
            // Revert old flat to Available
            const oldFlatRef = doc(firestore, 'projects', sale.projectId, 'flats', sale.flatId);
            batch.update(oldFlatRef, { status: 'Available' });

            // Set new flat to Sold
            const newFlatRef = doc(firestore, 'projects', data.projectId, 'flats', data.flatId);
            batch.update(newFlatRef, { status: 'Sold' });
        }
        
        await batch.commit();

      toast({
        title: 'Sale Updated',
        description: `The sale has been successfully updated.`,
      });
      if (onSaleUpdated) {
        onSaleUpdated();
      }
      setDialogOpen(false);
      router.refresh(); // To trigger re-fetch on parent page
    } catch (error: any) {
      console.error('Error updating sale: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update the sale. ' + error.message,
      });
    }
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[75vh] pr-4">
                <div className="space-y-6">
                    {/* Property Allocation */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Property & Unit Allocation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-1.5">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Building2 className="h-3.5 w-3.5 text-primary" /> Project <span className="text-rose-500">*</span>
                                </FormLabel>
                                <Combobox
                                    options={projects?.map((project) => ({ value: project.id, label: project.projectName })) || []}
                                    value={field.value}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        setSelectedProjectId(value);
                                        form.setValue('flatId', '');
                                    }}
                                    placeholder="Select a project"
                                    searchPlaceholder="Search projects..."
                                    emptyText="No projects found."
                                    disabled={projectsLoading}
                                    className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                                />
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="flatId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-1.5">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Home className="h-3.5 w-3.5 text-primary" /> Flat / Unit <span className="text-rose-500">*</span>
                                </FormLabel>
                                <Combobox
                                    options={availableFlats?.filter(flat => flat.status === 'Available' || flat.id === sale.flatId).map((flat) => ({ value: flat.id, label: `${flat.flatNumber} (${flat.flatSize} sft)` })) || []}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select a flat"
                                    searchPlaceholder="Search flats..."
                                    emptyText="No available flats."
                                    disabled={!selectedProjectId || flatsLoading}
                                    className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                                />
                                <FormDescription className="text-xs">
                                    Re-assign to any available unsold unit if needed.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Customer */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Customer Buyer</h4>
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                            <FormItem className="flex flex-col justify-start space-y-1.5">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <User className="h-3.5 w-3.5 text-primary" /> Customer <span className="text-rose-500">*</span>
                                </FormLabel>
                                <Combobox
                                    options={customers?.map((customer) => ({ value: customer.id, label: customer.fullName })) || []}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select a customer"
                                    searchPlaceholder="Search customers..."
                                    emptyText="No customers found."
                                    disabled={customersLoading}
                                    className="h-11 w-full rounded-xl border-border/80 shadow-xs"
                                />
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    
                    <Separator />
                    
                    {/* Financials */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Valuation & Ancillary Charges</h4>
                        
                        <FormField
                            control={form.control}
                            name="totalPrice"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Banknote className="h-3.5 w-3.5 text-primary" /> Base Unit Price <span className="text-rose-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative flex items-center rounded-xl border-2 border-border/80 bg-background/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs overflow-hidden">
                                    <div className="flex items-center justify-center px-3.5 bg-muted/50 border-r border-border/70 text-foreground font-bold text-sm select-none h-11">
                                      {currencySymbol}
                                    </div>
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      className="h-11 text-lg font-bold tracking-tight text-foreground border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3.5 bg-transparent"
                                      value={field.value === 0 ? '' : field.value}
                                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            <FormField
                                control={form.control}
                                name="perSftPrice"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      Price per SFT ({currencySymbol})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="5000"
                                          className="h-11 rounded-xl border-border/80 shadow-xs"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="parkingCharge"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      Parking Allocation ({currencySymbol})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="200000"
                                          className="h-11 rounded-xl border-border/80 shadow-xs"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="utilityCharge"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      Utility Charge ({currencySymbol})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="150000"
                                          className="h-11 rounded-xl border-border/80 shadow-xs"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <Separator />
                    
                    {/* Extra Costs */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Extra Costs</h4>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ purpose: '', amount: 0 })} className="h-8 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/5">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                                Add Cost
                            </Button>
                        </div>
                        {fields.length > 0 && (
                          <div className="space-y-2">
                              {fields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] items-end gap-2.5 p-3 border border-border/70 rounded-xl bg-card/60">
                                  <FormField
                                      control={form.control}
                                      name={`extraCosts.${index}.purpose`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-1">
                                                  <FormLabel className="text-xs text-muted-foreground">Purpose</FormLabel>
                                                  <FormControl>
                                                  <Input {...field} placeholder="e.g., Interior Fit-out" className="h-11 rounded-xl" />
                                                  </FormControl>
                                                  <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <FormField
                                      control={form.control}
                                      name={`extraCosts.${index}.amount`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-1">
                                                  <FormLabel className="text-xs text-muted-foreground">Amount ({currencySymbol})</FormLabel>
                                                  <FormControl>
                                                      <Input
                                                        type="number"
                                                        placeholder="50000"
                                                        className="h-11 rounded-xl"
                                                        value={field.value === 0 ? '' : field.value}
                                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                      />
                                                  </FormControl>
                                                  <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} className="h-11 w-11 rounded-xl shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50">
                                          <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                              ))}
                          </div>
                        )}
                    </div>
                    
                    <Separator />

                    {/* Payment Plan & Telemetry */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Payment Plan & Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="downpayment"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      <Banknote className="h-3.5 w-3.5 text-primary" /> Downpayment ({currencySymbol})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="1000000"
                                          className="h-11 rounded-xl border-border/80 shadow-xs"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="monthlyInstallment"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      <Calendar className="h-3.5 w-3.5 text-primary" /> Monthly Installment ({currencySymbol})
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="50000"
                                          className="h-11 rounded-xl border-border/80 shadow-xs"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-3.5 bg-muted/60 border border-border/60 rounded-xl">
                                <p className="text-xs text-muted-foreground font-medium">Total Contract Price</p>
                                <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">{formatCurrency(calculatedTotalPrice)}</p>
                            </div>
                            <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Net Receivable Balance</p>
                                <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(dueAmount)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />
                    
                    {/* Sale Details */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Execution & Legal Notes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="saleDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      <Calendar className="h-3.5 w-3.5 text-primary" /> Execution Date <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input type="date" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="deedLink"
                                render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-1.5">
                                    <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      <Link2 className="h-3.5 w-3.5 text-primary" /> Digital Deed PDF Link
                                    </FormLabel>
                                    <FormControl>
                                      <Input placeholder="https://example.com/deed.pdf" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                            <FormItem className="flex flex-col justify-start space-y-1.5">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <FileText className="h-3.5 w-3.5 text-primary" /> Memoranda & Notes
                                </FormLabel>
                                <FormControl>
                                <Textarea placeholder="Any additional terms or clauses..." className="rounded-xl border-border/80 shadow-xs min-h-[80px]" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </ScrollArea>
            <div className="flex justify-end pt-4 border-t border-border/50 gap-2">
                <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || projectsLoading || customersLoading || flatsLoading}
                    className="h-11 px-7 font-semibold rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                </Button>
            </div>
        </form>
    </Form>
  );
}
