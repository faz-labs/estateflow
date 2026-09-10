
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, writeBatch, getDocs, runTransaction, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getTodayDateString, formatDateForDisplay, isDateWithinRange } from '@/lib/date-utils';
import { useState, useEffect, useMemo } from 'react';
import type { Project, Vendor, ExpenseItem, Expense, Counter } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusCircle,
  Search,
  Ban,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Download,
  Receipt,
  Building2,
  Truck,
  Calendar,
  Package,
  Hash,
  Coins,
  CheckCircle2,
  Loader2,
  FileText,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditExpenseForm } from '@/components/dashboard/expenses/edit-expense-form';
import { ExpenseDetails } from '@/components/dashboard/expenses/expense-details';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { exportToCsv } from '@/lib/csv';


const addExpenseFormSchema = z.object({
  vendorId: z.string().min(1, { message: 'Please select a vendor.' }),
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  itemId: z.string().min(1, { message: 'Please select an expense item.' }),
  quantity: z.coerce.number().optional(),
  price: z.coerce.number().min(1, { message: 'Price must be greater than 0.' }),
  date: z.string().min(1, { message: 'Expense date is required.' }),
  description: z.string().optional(),
});

type AddExpenseFormValues = z.infer<typeof addExpenseFormSchema>;

const addItemFormSchema = z.object({
  name: z.string().min(2, { message: 'Item name must be at least 2 characters.' }),
});
type AddItemFormValues = z.infer<typeof addItemFormSchema>;

export type EnrichedExpense = Expense & {
    vendorName: string;
    projectName: string;
    itemName: string;
}

const ITEMS_PER_PAGE = 10;

// A small form component for the "Add Item" dialog
function AddItemForm({ setDialogOpen }: { setDialogOpen: (open: boolean) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, isViewer } = useUserProfile();
  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemFormSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(data: AddItemFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role).',
      });
      return;
    }

    try {
      const itemsCollection = collection(firestore, 'expenseItems');
      const newItemRef = doc(itemsCollection);
      addDocumentNonBlocking(itemsCollection, {
        id: newItemRef.id,
        name: data.name,
        tenantId: tenantId || 'default_workspace',
      });
      toast({ title: 'Item Added', description: `${data.name} has been added.` });
      form.reset();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not add the item: ' + error.message,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Package className="h-3.5 w-3.5 text-primary" /> Item Name <span className="text-rose-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g., Structural Steel Rods, Ready-mix Concrete" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-3 border-t border-border/50">
          <Button
            type="submit"
            disabled={isViewer || form.formState.isSubmitting}
            className="h-11 px-6 rounded-xl font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding Item...
              </>
            ) : isViewer ? (
              'Read-Only (Viewer Access)'
            ) : (
              <>
                <PlusCircle className="h-4 w-4" /> Add Item
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


export default function AddExpensePage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, currencySymbol, formatCurrency, isViewer, isSuperAdmin } = useUserProfile();
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isDataDirty, setIsDataDirty] = useState(true);
  const [expenses, setExpenses] = useState<EnrichedExpense[]>([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<EnrichedExpense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);


  // Data fetching for form
  const vendorsQuery = useMemoFirebase(
    () => (!firestore || (!tenantId && !isSuperAdmin) ? null : isSuperAdmin ? collection(firestore, 'vendors') : query(collection(firestore, 'vendors'), where('tenantId', '==', tenantId))),
    [firestore, tenantId, isSuperAdmin]
  );
  const { data: vendors, isLoading: vendorsLoading } = useCollection<Vendor>(vendorsQuery);

  const projectsQuery = useMemoFirebase(
    () => (!firestore || (!tenantId && !isSuperAdmin) ? null : isSuperAdmin ? collection(firestore, 'projects') : query(collection(firestore, 'projects'), where('tenantId', '==', tenantId))),
    [firestore, tenantId, isSuperAdmin]
  );
  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);

  const itemsQuery = useMemoFirebase(
    () => (!firestore || (!tenantId && !isSuperAdmin) ? null : isSuperAdmin ? collection(firestore, 'expenseItems') : query(collection(firestore, 'expenseItems'), where('tenantId', '==', tenantId))),
    [firestore, tenantId, isSuperAdmin]
  );
  const { data: expenseItems, isLoading: itemsLoading } = useCollection<ExpenseItem>(itemsQuery);

  // Fetch and enrich expenses for the log
  useEffect(() => {
    if (!firestore || (!tenantId && !isSuperAdmin) || !isDataDirty) {
      return;
    }
    if (vendorsLoading || projectsLoading || itemsLoading) {
      return;
    }
    
    const fetchAndEnrichExpenses = async () => {
        setIsLoadingLog(true);
        try {
            const expensesQuery = isSuperAdmin
              ? collection(firestore, 'expenses')
              : query(collection(firestore, 'expenses'), where('tenantId', '==', tenantId));
            const expensesSnap = await getDocs(expensesQuery);
            
            const vendorsMap = new Map((vendors || []).map(d => [d.id, d.vendorName]));
            const projectsMap = new Map((projects || []).map(d => [d.id, d.projectName]));
            const itemsMap = new Map((expenseItems || []).map(d => [d.id, d.name]));

            const enriched = expensesSnap.docs.map(doc => {
                const expense = { ...doc.data(), id: doc.id } as Expense;
                return {
                    ...expense,
                    vendorName: vendorsMap.get(expense.vendorId) || 'N/A',
                    projectName: projectsMap.get(expense.projectId) || 'N/A',
                    itemName: itemsMap.get(expense.itemId) || 'N/A',
                }
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setExpenses(enriched);

        } catch (error: any) {
            console.error("Error fetching and enriching expenses:", error);
            toast({
              variant: 'destructive',
              title: "Error loading expenses",
              description: error.message || "Could not fetch expense data from the database."
            });
            setExpenses([]);
        } finally {
            setIsLoadingLog(false);
            setIsDataDirty(false);
        }
    };
    
    fetchAndEnrichExpenses();

  }, [firestore, toast, isDataDirty, vendors, projects, expenseItems, vendorsLoading, projectsLoading, itemsLoading, tenantId, isSuperAdmin]);


  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(addExpenseFormSchema),
    defaultValues: {
      vendorId: '',
      projectId: '',
      itemId: '',
      quantity: 1,
      price: 0,
      date: getTodayDateString(),
      description: '',
    },
  });

  const getNextExpenseId = async (): Promise<string> => {
    const counterRef = doc(firestore, 'counters', 'expense');
    try {
      const newCurrent = await runTransaction(firestore, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { current: 100 });
          return 'EXID-0100';
        }
        const currentId = (counterDoc.data() as Counter).current + 1;
        transaction.update(counterRef, { current: currentId });
        return `EXID-0${currentId}`;
      });
      return newCurrent;
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw new Error("Could not generate expense ID.");
    }
  };

  async function onSubmit(data: AddExpenseFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role). You cannot record expenses.',
      });
      return;
    }

    try {
      const expenseId = await getNextExpenseId();
      const expenseRef = doc(collection(firestore, 'expenses'));
      
      const newExpense: Expense = {
        id: expenseRef.id,
        expenseId: expenseId,
        vendorId: data.vendorId,
        projectId: data.projectId,
        itemId: data.itemId,
        quantity: data.quantity,
        price: data.price,
        date: new Date(data.date).toISOString(),
        description: data.description,
        paidAmount: 0, // Initialize paidAmount to 0
        status: 'Unpaid', // Initialize status to Unpaid
        tenantId: tenantId || 'default_workspace',
      };
      
      // Use a non-blocking add to create the expense document
      addDocumentNonBlocking(collection(firestore, 'expenses'), newExpense);

      toast({
        title: 'Expense Recorded',
        description: `Expense ${expenseId} for ${formatCurrency(data.price)} has been logged as unpaid.`,
      });
      
      form.reset();
      setIsDataDirty(true);

    } catch (error: any) {
      console.error('Error recording expense: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not record the expense. ' + error.message,
      });
    }
  }

  const handleDeleteClick = (expense: EnrichedExpense) => {
    setTimeout(() => {
      setSelectedExpense(expense);
      setIsDeleteAlertOpen(true);
    }, 0);
  };
  
  const confirmDeleteExpense = () => {
    if (!selectedExpense) return;
    const expenseRef = doc(firestore, 'expenses', selectedExpense.id);
    deleteDocumentNonBlocking(expenseRef, () => {
        toast({
            title: "Expense Deleted",
            description: "The expense record has been successfully deleted.",
        });
        setIsDataDirty(true);
    });
    setIsDeleteAlertOpen(false);
    setSelectedExpense(null);
  };
  
  const handleEditClick = (expense: EnrichedExpense) => {
    setTimeout(() => {
      setSelectedExpense(expense);
      setIsEditDialogOpen(true);
    }, 0);
  };

  const handleViewClick = (expense: EnrichedExpense) => {
    setTimeout(() => {
      setSelectedExpense(expense);
      setIsViewDialogOpen(true);
    }, 0);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
        const searchTerm = searchQuery.toLowerCase();
        const searchMatch = !searchTerm || (
            exp.vendorName.toLowerCase().includes(searchTerm) ||
            exp.projectName.toLowerCase().includes(searchTerm) ||
            exp.itemName.toLowerCase().includes(searchTerm) ||
            exp.expenseId.toLowerCase().includes(searchTerm) ||
            exp.price.toString().includes(searchTerm)
        );

        const dateMatch = isDateWithinRange(exp.date, dateRange?.from, dateRange?.to);

        return searchMatch && dateMatch;
    });
  }, [expenses, searchQuery, dateRange]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleExport = () => {
    const dataToExport = filteredExpenses.map(exp => ({
        'Expense ID': exp.expenseId,
        'Date': formatDateForDisplay(exp.date),
        'Vendor': exp.vendorName,
        'Project': exp.projectName,
        'Item': exp.itemName,
        'Quantity': exp.quantity,
        'Price': exp.price,
        'Paid Amount': exp.paidAmount,
        'Status': exp.status,
        'Details': exp.description,
    }));
    exportToCsv(dataToExport, `expenses_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const watchedPrice = form.watch('price') || 0;
  const watchedQuantity = form.watch('quantity') || 1;
  const watchedProjectId = form.watch('projectId');
  const watchedVendorId = form.watch('vendorId');
  const watchedItemId = form.watch('itemId');

  const selectedProject = useMemo(() => projects?.find(p => p.id === watchedProjectId), [projects, watchedProjectId]);
  const selectedVendor = useMemo(() => vendors?.find(v => v.id === watchedVendorId), [vendors, watchedVendorId]);
  const selectedItem = useMemo(() => expenseItems?.find(i => i.id === watchedItemId), [expenseItems, watchedItemId]);

  return (
    <div className="space-y-6">
        <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Add New Project Expense</CardTitle>
                <CardDescription className="text-xs">
                  Record contractor procurement, building materials, or civil work expenses against a project.
                </CardDescription>
              </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Project & Vendor Context (3 Symmetrical Columns) */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">1</span>
                    Project & Vendor Allocation
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
                  </div>
                </div>

                {/* Section 2: Itemization & Procurement Outflow (3 Symmetrical Columns) */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">2</span>
                    Itemization & Cost
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col justify-start space-y-1.5">
                          <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Package className="h-3.5 w-3.5 text-primary" /> Expense Item <span className="text-rose-500">*</span>
                          </FormLabel>
                          <div className="flex items-center gap-2 w-full">
                            <FormControl className="flex-1 min-w-0">
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
                            <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 rounded-xl shrink-0 border-dashed hover:border-primary hover:text-primary transition-colors"
                                  title="Add new item type"
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Add New Expense Item</DialogTitle>
                                </DialogHeader>
                                <AddItemForm setDialogOpen={setIsAddItemDialogOpen} />
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                </div>

                {/* Section 3: Description & Memo */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">3</span>
                    Procurement Memo & Documentation
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-start space-y-1.5">
                        <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Memo / Invoice Reference
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional details (e.g., Foundation cement delivery batch #4, challan #882)"
                            className="h-11 rounded-xl border-border/80 shadow-xs px-3.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Live Telemetry Summary & Action Strip */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <span>Total Expense Commitment</span>
                        {selectedProject && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background border border-border">
                            {selectedProject.projectName}
                          </span>
                        )}
                        {selectedVendor && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background border border-border">
                            {selectedVendor.vendorName}
                          </span>
                        )}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 mt-0.5">
                        <span className="text-primary">{formatCurrency(watchedPrice || 0)}</span>
                        {watchedQuantity > 1 && watchedPrice > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({formatCurrency(Math.round((watchedPrice / watchedQuantity) * 100) / 100)} / unit)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isViewer || form.formState.isSubmitting}
                    className="h-11 px-8 rounded-xl font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Recording Expense...
                      </>
                    ) : isViewer ? (
                      'Read-Only (Viewer Access)'
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Record Project Expense
                      </>
                    )}
                  </Button>
                </div>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <CardTitle>Expense Log</CardTitle>
                        <CardDescription>
                            A record of all project expenses.
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="search" 
                                placeholder="Search by ID, vendor, project..."
                                className="pl-9.5 sm:w-full lg:w-[320px] h-11 rounded-xl border-border/80 shadow-xs"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto h-11 rounded-xl font-medium px-4 shadow-xs">
                            <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                            Export
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoadingLog && (
                    <div className="flex justify-center items-center h-60">
                        <p>Loading expense log...</p>
                    </div>
                )}
                {!isLoadingLog && !paginatedExpenses.length && (
                    <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                        <Ban className="h-12 w-12 mb-2" />
                        <p className="text-lg font-semibold">No expenses found.</p>
                        <p className="text-sm">
                            {searchQuery ? 'Try a different search term or' : 'Record a new expense to'} see it here.
                        </p>
                    </div>
                )}
                {!isLoadingLog && paginatedExpenses.length > 0 && (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Expense ID</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedExpenses.map(expense => (
                                        <TableRow key={expense.id}>
                                            <TableCell className="font-mono">{expense.expenseId}</TableCell>
                                            <TableCell className="font-medium">{expense.vendorName}</TableCell>
                                            <TableCell>{expense.itemName}</TableCell>
                                            <TableCell>{formatDateForDisplay(expense.date)}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    expense.status === 'Paid' ? 'default' :
                                                    expense.status === 'Partially Paid' ? 'secondary' : 'destructive'
                                                }>
                                                    {expense.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(expense.price)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleViewClick(expense)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleEditClick(expense)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onSelect={() => handleDeleteClick(expense)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <div className="flex items-center justify-end space-x-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this expense record. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                    onClick={confirmDeleteExpense}
                    className="bg-destructive hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {selectedExpense && (
            <>
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Expense Details</DialogTitle>
                            <CardDescription>Viewing details for expense ID: {selectedExpense.expenseId}</CardDescription>
                        </DialogHeader>
                        <ExpenseDetails expense={selectedExpense} />
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Expense</DialogTitle>
                            <CardDescription>Updating details for expense ID: {selectedExpense.expenseId}</CardDescription>
                        </DialogHeader>
                        <EditExpenseForm 
                            expense={selectedExpense} 
                            setDialogOpen={setIsEditDialogOpen}
                            onUpdate={() => setIsDataDirty(true)}
                        />
                    </DialogContent>
                </Dialog>
            </>
        )}

    </div>
  );
}
