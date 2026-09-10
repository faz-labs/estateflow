
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
import type { Project, Flat, Customer } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2, Building2, Home, User, Banknote, Calendar, Link2, FileText, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getTodayDateString } from '@/lib/date-utils';

const addSaleFormSchema = z.object({
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

type AddSaleFormValues = z.infer<typeof addSaleFormSchema>;

export default function AddSalePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, currencySymbol, formatCurrency, isViewer } = useUserProfile();
  const router = useRouter();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
          collection(firestore, 'projects', selectedProjectId, 'flats'),
          where('status', '==', 'Available')
        )
      : null
  , [firestore, selectedProjectId]);
  const { data: availableFlats, isLoading: flatsLoading } = useCollection<Flat>(availableFlatsQuery);

  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(addSaleFormSchema),
    defaultValues: {
      projectId: '',
      flatId: '',
      customerId: '',
      totalPrice: 0,
      perSftPrice: 0,
      parkingCharge: 0,
      utilityCharge: 0,
      downpayment: 0,
      monthlyInstallment: 0,
      saleDate: getTodayDateString(),
      note: '',
      deedLink: '',
      extraCosts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "extraCosts",
  });
  
  const watchBasePrice = form.watch('totalPrice');
  const watchExtraCosts = form.watch('extraCosts');
  const watchDownpayment = form.watch('downpayment');
  const watchProjectId = form.watch('projectId');
  const watchFlatId = form.watch('flatId');
  const watchCustomerId = form.watch('customerId');

  const selectedProject = projects?.find(p => p.id === watchProjectId);
  const selectedFlat = availableFlats?.find(f => f.id === watchFlatId);
  const selectedCustomer = customers?.find(c => c.id === watchCustomerId);

  const calculatedTotalPrice = (Number(watchBasePrice) || 0) + 
    (watchExtraCosts?.reduce((acc, cost) => acc + (Number(cost.amount) || 0), 0) || 0);

  const dueAmount = Math.max(0, calculatedTotalPrice - (Number(watchDownpayment) || 0));

  async function onSubmit(data: AddSaleFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role). You cannot record sales.',
      });
      return;
    }

    try {
        const batch = writeBatch(firestore);
        
        const finalTotalPrice = calculatedTotalPrice;

        // 1. Create new sale document
        const saleRef = doc(collection(firestore, 'sales'));
        batch.set(saleRef, {
            ...data,
            id: saleRef.id,
            totalPrice: finalTotalPrice,
            saleDate: new Date(data.saleDate).toISOString(),
            tenantId: tenantId || 'default_workspace',
        });

        // 2. Update flat status to 'Sold'
        const flatRef = doc(firestore, 'projects', data.projectId, 'flats', data.flatId);
        batch.update(flatRef, { status: 'Sold' });
        
        await batch.commit();

      toast({
        title: 'Sale Recorded',
        description: `The sale has been successfully recorded.`,
      });
      router.push('/dashboard/sales');
    } catch (error: any) {
      console.error('Error recording sale: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not record the sale. ' + error.message,
      });
    }
  }

  return (
    <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Add New Sale</CardTitle>
                <CardDescription className="text-xs">
                  Record a property sale contract, unit allocation, pricing breakdown, and installment schedule.
                </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Step 1: Property & Flat Allocation */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                          1
                        </span>
                        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                          Property & Unit Allocation
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Choose project to unlock available unsold units
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
                        <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col justify-start space-y-2">
                              <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <Building2 className="h-3.5 w-3.5 text-primary" /> Project <span className="text-rose-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Combobox
                                    options={projects?.map((project) => ({ value: project.id, label: project.projectName })) || []}
                                    value={field.value}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        setSelectedProjectId(value);
                                        form.setValue('flatId', ''); // Reset flat when project changes
                                    }}
                                    placeholder="Select a project"
                                    searchPlaceholder="Search projects..."
                                    emptyText="No projects found."
                                    disabled={projectsLoading}
                                    className="h-11 w-full rounded-xl border-border/80 shadow-xs transition-all hover:border-primary/50"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="flatId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col justify-start space-y-2">
                              <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                <Home className="h-3.5 w-3.5 text-primary" /> Flat / Unit <span className="text-rose-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Combobox
                                    options={availableFlats?.map((flat) => ({ value: flat.id, label: `${flat.flatNumber} (${flat.flatSize} sft)` })) || []}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select an available flat"
                                    searchPlaceholder="Search flats..."
                                    emptyText="No available flats found."
                                    disabled={!selectedProjectId || flatsLoading}
                                    className="h-11 w-full rounded-xl border-border/80 shadow-xs transition-all hover:border-primary/50"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Only units with status 'Available' are eligible for new contracts.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                {/* Step 2: Customer Buyer Information */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                          2
                        </span>
                        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                          Customer Buyer Allocation
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Select purchasing client for contract and ledger attribution
                      </span>
                    </div>

                    <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-2">
                            <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-primary" /> Purchasing Customer <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Combobox
                                  options={customers?.map((customer) => ({ value: customer.id, label: customer.fullName })) || []}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select a customer"
                                  searchPlaceholder="Search customers..."
                                  emptyText="No customers found."
                                  disabled={customersLoading}
                                  className="h-11 w-full rounded-xl border-border/80 shadow-xs transition-all hover:border-primary/50"
                              />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                
                {/* Step 3: Financial Valuation & Extra Costs */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                          3
                        </span>
                        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                          Financial Valuation & Additional Costs
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Base property price, square foot rate, and ancillary charges
                      </span>
                    </div>

                    {/* Hero Base Price Input */}
                    <FormField
                        control={form.control}
                        name="totalPrice"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                            <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Banknote className="h-3.5 w-3.5 text-primary" /> Base Unit Price <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative flex items-center rounded-2xl border-2 border-border/80 bg-background/80 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-xs overflow-hidden">
                                <div className="flex items-center justify-center px-4 bg-muted/50 border-r border-border/70 text-foreground font-bold text-lg select-none min-w-[3.5rem] h-14">
                                  {currencySymbol}
                                </div>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  className="h-14 text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 bg-transparent"
                                  value={field.value === 0 ? '' : field.value}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    field.onChange(val);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-start">
                         <FormField
                            control={form.control}
                            name="perSftPrice"
                            render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-2">
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
                                <FormItem className="flex flex-col justify-start space-y-2">
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
                                <FormItem className="flex flex-col justify-start space-y-2">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  Utility & Gas Connection ({currencySymbol})
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

                    {/* Extra Costs Itemization */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          Additional Itemized Costs
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ purpose: '', amount: 0 })}
                          className="h-8 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                          Add Extra Cost
                        </Button>
                      </div>

                      {fields.length > 0 && (
                        <div className="space-y-2.5">
                          {fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] items-end gap-3 p-3.5 border border-border/70 rounded-xl bg-card/60 shadow-2xs">
                                 <FormField
                                     control={form.control}
                                     name={`extraCosts.${index}.purpose`}
                                     render={({ field }) => (
                                         <FormItem className="space-y-1.5">
                                              <FormLabel className="text-xs text-muted-foreground font-medium">Purpose / Item</FormLabel>
                                              <FormControl>
                                                 <Input {...field} placeholder="e.g., Interior Fit-out, Legal Documentation" className="h-11 rounded-xl border-border/80" />
                                              </FormControl>
                                              <FormMessage />
                                         </FormItem>
                                     )}
                                 />
                                 <FormField
                                     control={form.control}
                                     name={`extraCosts.${index}.amount`}
                                     render={({ field }) => (
                                         <FormItem className="space-y-1.5">
                                              <FormLabel className="text-xs text-muted-foreground font-medium">Amount ({currencySymbol})</FormLabel>
                                              <FormControl>
                                                  <Input
                                                    type="number"
                                                    placeholder="50000"
                                                    className="h-11 rounded-xl border-border/80"
                                                    value={field.value === 0 ? '' : field.value}
                                                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                  />
                                              </FormControl>
                                              <FormMessage />
                                         </FormItem>
                                     )}
                                 />
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-11 w-11 rounded-xl shrink-0 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                    title="Remove item"
                                 >
                                      <Trash2 className="h-4 w-4" />
                                 </Button>
                             </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Financial Telemetry Panel */}
                    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-muted/20 to-card p-4 sm:p-5 shadow-xs backdrop-blur-md space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <span className="text-xs font-semibold uppercase text-primary tracking-wide">
                          Contract Financial Summary
                        </span>
                        <span className="text-xs text-muted-foreground">Auto-calculated from base price and extra costs</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="rounded-xl bg-background/90 border border-border/70 p-3.5 shadow-2xs">
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Banknote className="h-3.5 w-3.5 text-muted-foreground" /> Total Sale Valuation
                          </p>
                          <p className="text-xl font-bold tracking-tight text-foreground mt-1">
                            {formatCurrency(calculatedTotalPrice)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 shadow-2xs">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Initial Downpayment
                          </p>
                          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                            {formatCurrency(watchDownpayment || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-3.5 shadow-2xs">
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                            <Banknote className="h-3.5 w-3.5" /> Balance Receivable
                          </p>
                          <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                            {formatCurrency(dueAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                </div>

                {/* Step 4: Payment Plan & Milestones */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                          4
                        </span>
                        <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                          Payment Plan & Schedule
                        </h3>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Downpayment requirement and recurring installment plan
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
                        <FormField
                            control={form.control}
                            name="downpayment"
                            render={({ field }) => (
                                <FormItem className="flex flex-col justify-start space-y-2">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Banknote className="h-3.5 w-3.5 text-primary" /> Agreed Downpayment ({currencySymbol})
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
                                <FormItem className="flex flex-col justify-start space-y-2">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Calendar className="h-3.5 w-3.5 text-primary" /> Monthly Installment Amount ({currencySymbol})
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
                </div>

                {/* Step 5: Sale Details & Documentation */}
                <div className="space-y-4">
                     <div className="flex items-center justify-between pb-2 border-b border-border/50">
                       <div className="flex items-center gap-2.5">
                         <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                           5
                         </span>
                         <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                           Execution Date & Documentation
                         </h3>
                       </div>
                       <span className="text-xs text-muted-foreground hidden sm:inline">
                         Agreement execution date and digital deed records
                       </span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
                        <FormField
                            control={form.control}
                            name="saleDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col justify-start space-y-2">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Calendar className="h-3.5 w-3.5 text-primary" /> Contract Execution Date <span className="text-rose-500">*</span>
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
                            <FormItem className="flex flex-col justify-start space-y-2">
                                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                                  <Link2 className="h-3.5 w-3.5 text-primary" /> Digital Deed PDF Link (Optional)
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="https://storage.googleapis.com/.../deed.pdf" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Cloud storage URL to the signed purchase agreement.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>

                     <FormField
                        control={form.control}
                        name="note"
                        render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-2">
                            <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <FileText className="h-3.5 w-3.5 text-primary" /> Contract Notes & Memoranda (Optional)
                            </FormLabel>
                            <FormControl>
                            <Textarea
                              placeholder="Special clauses, key handover conditions, parking spot designation, or handover timelines..."
                              className="rounded-xl border-border/80 shadow-xs min-h-[90px] p-3"
                              {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                {/* Bottom Live Summary & High-Impact CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {calculatedTotalPrice > 0 && selectedCustomer && selectedFlat ? (
                        <span className="flex items-center gap-1.5 text-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Ready to sell <strong className="text-primary">Flat {selectedFlat.flatNumber}</strong> to <strong>{selectedCustomer.fullName}</strong> for <strong>{formatCurrency(calculatedTotalPrice)}</strong>
                        </span>
                      ) : (
                        <span>Configure unit allocation, customer buyer, and valuation above</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={isViewer || form.formState.isSubmitting || projectsLoading || customersLoading || flatsLoading}
                            className="w-full sm:w-auto h-12 px-8 font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                        >
                            {form.formState.isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Recording Sale...
                              </>
                            ) : isViewer ? (
                              'Read-Only (Viewer Access)'
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Record Property Sale
                              </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
