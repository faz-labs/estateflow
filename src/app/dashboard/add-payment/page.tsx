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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  collectionGroup,
  limit,
  getDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getTodayDateString, formatDateForDisplay, isDateWithinRange } from '@/lib/date-utils';
import type {
  Project,
  Customer,
  Sale,
  Flat,
  InflowTransaction,
  Counter,
} from '@/lib/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  } from "@/components/ui/dropdown-menu"
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ban, Printer, MoreHorizontal, Pencil, Trash2, Eye, FileDown, Search, Download, Save, Loader2, Banknote, User, Building2, Home, Calendar, FileText, CheckCircle2, Sparkles, Landmark, Check, ArrowRight, CreditCard } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Receipt } from '@/components/dashboard/receipt';
import { EditPaymentForm } from '@/components/dashboard/payments/edit-payment-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { exportToCsv } from '@/lib/csv';
import { PrintReceiptDialog } from '@/components/dashboard/payments/PrintReceiptDialog';


const addPaymentFormSchema = z.object({
  customerId: z.string().min(1, { message: 'Please select a customer.' }),
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  flatId: z.string().min(1, { message: 'Please select a flat.' }),
  amount: z.coerce
    .number()
    .min(1, { message: 'Amount must be greater than 0.' }),
  paymentMethod: z.enum(['Cash', 'Cheque', 'Bank Transfer']),
  paymentPurpose: z.enum(['Booking Money', 'Installment', 'Other']),
  otherPurpose: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().min(1, { message: 'Payment date is required.' }),
}).refine(data => {
    if (data.paymentPurpose === 'Other') {
        return !!data.otherPurpose && data.otherPurpose.length > 0;
    }
    return true;
}, {
    message: 'Please specify the purpose if "Other" is selected.',
    path: ['otherPurpose'],
});


type AddPaymentFormValues = z.infer<typeof addPaymentFormSchema>;

export type EnrichedTransaction = InflowTransaction & {
  customerName: string;
  projectName: string;
  flatNumber: string;
  customer?: Customer;
  project?: Project;
};

export type CustomerFinancialSummary = {
  totalPrice: number;
  totalPaid: number;
  totalDue: number;
  isFlatSpecific?: boolean;
  flatNumber?: string;
  projectName?: string;
};

export default function AddPaymentPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, currencySymbol, formatCurrency, isViewer, isSuperAdmin, tenant, companyName } = useUserProfile();
  const router = useRouter();

  const [projectsForCustomer, setProjectsForCustomer] = useState<Project[]>([]);
  const [flatsForProject, setFlatsForProject] = useState<Flat[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<EnrichedTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLogLoading, setIsLogLoading] = useState(true);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EnrichedTransaction | null>(null);
  const [selectedPaymentForDelete, setSelectedPaymentForDelete] = useState<InflowTransaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Financial summary states for selected customer/flat
  const [customerFinancials, setCustomerFinancials] = useState<CustomerFinancialSummary | null>(null);
  const [isCalculatingFinancials, setIsCalculatingFinancials] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [customerPaymentsByFlat, setCustomerPaymentsByFlat] = useState<Map<string, number>>(new Map());
  const [totalCustomerPaid, setTotalCustomerPaid] = useState<number>(0);

  // Data fetching for form dropdowns
  const customersQuery = useMemoFirebase(
    () => {
      if (!firestore || !tenantId) return null;
      if (isSuperAdmin) return query(collection(firestore, 'customers'));
      return query(collection(firestore, 'customers'), where('tenantId', '==', tenantId));
    },
    [firestore, tenantId, isSuperAdmin]
  );
  const { data: customers, isLoading: customersLoading } =
    useCollection<Customer>(customersQuery);

  const form = useForm<AddPaymentFormValues>({
    resolver: zodResolver(addPaymentFormSchema),
    defaultValues: {
      customerId: '',
      projectId: '',
      flatId: '',
      amount: 0,
      paymentMethod: 'Cash',
      paymentPurpose: 'Installment',
      otherPurpose: '',
      reference: '',
      date: getTodayDateString(),
    },
  });

  const customerId = form.watch('customerId');
  const projectId = form.watch('projectId');
  const flatId = form.watch('flatId');
  const paymentPurpose = form.watch('paymentPurpose');
  const amount = form.watch('amount');
  const paymentMethod = form.watch('paymentMethod');

  const selectedCustomer = useMemo(() => customers?.find(c => c.id === customerId), [customers, customerId]);
  const selectedProject = useMemo(() => projectsForCustomer.find(p => p.id === projectId), [projectsForCustomer, projectId]);
  const selectedFlat = useMemo(() => flatsForProject.find(f => f.id === flatId), [flatsForProject, flatId]);

  // Fetch recent transactions for the log
  const fetchRecentTransactions = async () => {
    if (!tenantId) return;
    setIsLogLoading(true);
    try {
      // 1. Fetch tenant-scoped projects and customers to create lookup maps
      const projectsSnap = await getDocs(
        isSuperAdmin
          ? query(collection(firestore, 'projects'))
          : query(collection(firestore, 'projects'), where('tenantId', '==', tenantId))
      );
      const customersSnap = await getDocs(
        isSuperAdmin
          ? query(collection(firestore, 'customers'))
          : query(collection(firestore, 'customers'), where('tenantId', '==', tenantId))
      );
      const projectsMap = new Map(projectsSnap.docs.map(d => [d.id, d.data() as Project]));
      const customersMap = new Map(customersSnap.docs.map(d => [d.id, d.data() as Customer]));
      const tenantProjectIds = new Set(projectsSnap.docs.map(d => d.id));
      
      // Fetch all flats from tenant's projects in parallel
      const allFlatsMap = new Map<string, Flat>();
      await Promise.all(
        Array.from(projectsMap.values()).map(async (project) => {
          try {
            const flatsQuery = query(collection(firestore, `projects/${project.id}/flats`));
            const flatsSnap = await getDocs(flatsQuery);
            flatsSnap.forEach(doc => {
              allFlatsMap.set(doc.id, doc.data() as Flat);
            });
          } catch (err) {
            console.warn(`Could not fetch flats for project ${project.id}:`, err);
          }
        })
      );

      // 2. Fetch inflow transactions without where clause to eliminate collectionGroup index requirement
      const inflowsQuery = query(
        collectionGroup(firestore, 'inflowTransactions'),
        limit(150)
      );
      const inflowSnap = await getDocs(inflowsQuery);
      const allInflows = inflowSnap.docs.map(
        doc => ({ ...doc.data(), id: doc.id } as InflowTransaction)
      );

      // Filter strictly by tenantId or tenant's projects
      const inflows = allInflows
        .filter(tx => isSuperAdmin || (tx.tenantId ? tx.tenantId === tenantId : tenantProjectIds.has(tx.projectId)))
        .slice(0, 20);

      // 3. Enrich transactions with names synchronously
      const enriched: EnrichedTransaction[] = inflows.map(tx => {
         const flatData = allFlatsMap.get(tx.flatId);
         return {
            ...tx,
            customerName: customersMap.get(tx.customerId)?.fullName || 'N/A',
            projectName: projectsMap.get(tx.projectId)?.projectName || 'N/A',
            flatNumber: flatData?.flatNumber || 'N/A',
         };
      });

      setRecentTransactions(enriched);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      toast({ variant: 'destructive', title: 'Could not load recent payments.' });
    }
    setIsLogLoading(false);
  };

  // Initial fetch for recent transactions
  useEffect(() => {
    if (firestore && tenantId) {
      fetchRecentTransactions();
    }
  }, [firestore, tenantId, toast]);


  useEffect(() => {
    async function fetchCustomerData() {
      // Clear dependent fields when customer changes
      setProjectsForCustomer([]);
      setFlatsForProject([]);
      form.setValue('projectId', '');
      form.setValue('flatId', '');

      if (!customerId || !firestore || !tenantId) {
        setCustomerFinancials(null);
        setCustomerSales([]);
        setCustomerPaymentsByFlat(new Map());
        setTotalCustomerPaid(0);
        return;
      }

      setIsCalculatingFinancials(true);
      try {
        // Find sales for the selected customer scoped to tenant
        const salesQuery = isSuperAdmin
          ? query(collection(firestore, 'sales'), where('customerId', '==', customerId))
          : query(collection(firestore, 'sales'), where('customerId', '==', customerId), where('tenantId', '==', tenantId));
        const salesSnap = await getDocs(salesQuery);
        const sales = salesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale));
        setCustomerSales(sales);

        // Get unique project IDs from the sales
        const projectIds = [...new Set(sales.map(s => s.projectId).filter(Boolean))];

        if (projectIds.length > 0) {
          const projectsData: Project[] = [];
          for (const pId of projectIds) {
            try {
              const projectDoc = await getDoc(doc(firestore, 'projects', pId));
              if (projectDoc.exists()) {
                projectsData.push({ ...projectDoc.data(), id: projectDoc.id } as Project);
              }
            } catch (err) {
              console.warn('Could not fetch project:', err);
            }
          }
          setProjectsForCustomer(projectsData);
        }

        // Fetch inflow payments for this customer across project subcollections
        let paidSum = 0;
        const flatPaidMap = new Map<string, number>();

        for (const pId of projectIds) {
          try {
            const pQuery = query(
              collection(firestore, `projects/${pId}/inflowTransactions`),
              where('customerId', '==', customerId)
            );
            const pSnap = await getDocs(pQuery);
            pSnap.forEach(d => {
              const pData = d.data() as InflowTransaction;
              const amt = pData.amount || 0;
              paidSum += amt;
              if (pData.flatId) {
                flatPaidMap.set(pData.flatId, (flatPaidMap.get(pData.flatId) || 0) + amt);
              }
            });
          } catch (pErr) {
            console.warn(`Could not fetch payments for project ${pId}:`, pErr);
          }
        }

        setTotalCustomerPaid(paidSum);
        setCustomerPaymentsByFlat(flatPaidMap);

        const totalPrice = sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const totalDue = Math.max(0, totalPrice - paidSum);

        setCustomerFinancials({
          totalPrice,
          totalPaid: paidSum,
          totalDue,
          isFlatSpecific: false,
        });

        // Auto-fill amount if currently 0 and there is a due balance
        if (totalDue > 0 && form.getValues('amount') === 0) {
          form.setValue('amount', totalDue);
        }
      } catch (e) {
        console.error('Error fetching customer financials/sales:', e);
      } finally {
        setIsCalculatingFinancials(false);
      }
    }
    fetchCustomerData();
  }, [customerId, firestore, form, tenantId, isSuperAdmin]);

  // Dynamically update financial summary when a specific flat is selected
  useEffect(() => {
    if (!customerId) {
      setCustomerFinancials(null);
      return;
    }

    if (flatId && customerSales.length > 0) {
      const flatSale = customerSales.find(s => s.flatId === flatId);
      if (flatSale) {
        const flatPrice = flatSale.totalPrice || 0;
        const flatPaid = customerPaymentsByFlat.get(flatId) || 0;
        const flatDue = Math.max(0, flatPrice - flatPaid);
        const flatObj = flatsForProject.find(f => f.id === flatId);
        const projectObj = projectsForCustomer.find(p => p.id === (flatSale.projectId || projectId));

        setCustomerFinancials({
          totalPrice: flatPrice,
          totalPaid: flatPaid,
          totalDue: flatDue,
          isFlatSpecific: true,
          flatNumber: flatObj?.flatNumber || 'Flat',
          projectName: projectObj?.projectName || 'Project',
        });

        if (flatDue > 0) {
          form.setValue('amount', flatDue);
        }
        return;
      }
    }

    // Otherwise fallback to overall customer summary
    if (customerSales.length > 0) {
      const totalPrice = customerSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
      const totalDue = Math.max(0, totalPrice - totalCustomerPaid);
      setCustomerFinancials({
        totalPrice,
        totalPaid: totalCustomerPaid,
        totalDue,
        isFlatSpecific: false,
      });
    }
  }, [flatId, customerSales, customerPaymentsByFlat, totalCustomerPaid, flatsForProject, projectsForCustomer, projectId, customerId, form]);

  useEffect(() => {
    async function fetchProjectData() {
      // Clear flat field when project changes
      setFlatsForProject([]);
      form.setValue('flatId', '');

      if (customerId && projectId && firestore && tenantId) {
        // Find sales for the specific customer and project scoped to tenant
        const salesQuery = query(
          collection(firestore, 'sales'),
          where('customerId', '==', customerId),
          where('projectId', '==', projectId),
          where('tenantId', '==', tenantId)
        );
        const salesSnap = await getDocs(salesQuery);
        const flatIds = salesSnap.docs.map(doc => (doc.data() as Sale).flatId);

        if (flatIds.length > 0) {
          const flatsData: Flat[] = [];
          // Fetch flat details for each flat ID found
          for (const flatId of flatIds) {
            const flatQuery = query(
              collection(firestore, 'projects', projectId, 'flats'),
              where('id', '==', flatId)
            );
            const flatSnap = await getDocs(flatQuery);
            flatSnap.forEach(doc => flatsData.push(doc.data() as Flat));
          }
          setFlatsForProject(flatsData);

          // If there's only one flat, auto-select it
          if (flatsData.length === 1) {
            form.setValue('flatId', flatsData[0].id);
          }
        }
      }
    }
    fetchProjectData();
  }, [customerId, projectId, firestore, form, tenantId]);


  async function onSubmit(data: AddPaymentFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role). You cannot record payments.',
      });
      return;
    }

    try {
        const counterRef = doc(firestore, 'counters', 'receipt');
        const inflowCollection = collection(
            firestore,
            'projects',
            data.projectId,
            'inflowTransactions'
        );
        const newInflowRef = doc(inflowCollection);

        // 1. Atomically generate sequential receipt ID and write payment in a single roundtrip
        const receiptId = await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextNum = 1200;
            if (!counterDoc.exists()) {
                transaction.set(counterRef, { current: 1200 });
            } else {
                nextNum = (counterDoc.data() as Counter).current + 1;
                transaction.update(counterRef, { current: nextNum });
            }

            const paymentDoc: InflowTransaction = {
                id: newInflowRef.id,
                receiptId: nextNum.toString(),
                projectId: data.projectId,
                flatId: data.flatId,
                customerId: data.customerId,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                paymentType: data.paymentPurpose === 'Booking Money' ? 'Booking' : 'Installment',
                paymentPurpose: data.paymentPurpose,
                otherPurpose: data.otherPurpose,
                reference: data.reference,
                date: new Date(data.date).toISOString(),
                tenantId: tenantId || 'default_workspace',
            };

            transaction.set(newInflowRef, paymentDoc);
            return nextNum.toString();
        });

        const customer = customers?.find(c => c.id === data.customerId);
        const project = projectsForCustomer?.find(p => p.id === data.projectId);
        const flat = flatsForProject?.find(f => f.id === data.flatId);

        const newPayment: InflowTransaction = {
            id: newInflowRef.id,
            receiptId,
            projectId: data.projectId,
            flatId: data.flatId,
            customerId: data.customerId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            paymentType: data.paymentPurpose === 'Booking Money' ? 'Booking' : 'Installment',
            paymentPurpose: data.paymentPurpose,
            otherPurpose: data.otherPurpose,
            reference: data.reference,
            date: new Date(data.date).toISOString(),
            tenantId: tenantId || 'default_workspace',
        };

        const enrichedPayment: EnrichedTransaction = {
            ...newPayment,
            customerName: customer?.fullName || 'N/A',
            projectName: project?.projectName || 'N/A',
            flatNumber: flat?.flatNumber || 'N/A',
            customer,
            project,
        };

        // 2. Optimistically update recent transactions table immediately
        setRecentTransactions(prev => prev ? [enrichedPayment, ...prev] : [enrichedPayment]);
        
        toast({
            title: 'Payment Recorded',
            description: `Payment of ${formatCurrency(data.amount)} has been successfully recorded with Receipt ID: ${receiptId}.`,
        });

        // Automated Email Notification via SMTP if customer has email configured
        if (customer?.email) {
          fetch('/api/notifications/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'customer_receipt',
              recipientEmail: customer.email,
              customerName: customer.fullName,
              receiptId,
              amount: data.amount,
              formattedAmount: formatCurrency(data.amount),
              currencySymbol,
              paymentMethod: data.paymentMethod,
              paymentPurpose: data.paymentPurpose === 'Other' && data.otherPurpose ? data.otherPurpose : data.paymentPurpose,
              date: data.date,
              projectName: project?.projectName,
              flatNumber: flat?.flatNumber,
              reference: data.reference,
              companyName: tenant?.name || companyName || 'EstateFlow Real Estate',
              companyPhone: tenant?.phone,
              companyEmail: tenant?.email,
              companyAddress: tenant?.address,
            }),
          })
            .then(res => res.json())
            .then(resData => {
              if (resData.success) {
                toast({
                  title: 'Email Receipt Sent',
                  description: `Money receipt #${receiptId} sent to ${customer.email}.`,
                });
              }
            })
            .catch(err => console.error('Failed to dispatch customer receipt email:', err));
        }

        if (customer && project && flat) {
            setSelectedPayment(enrichedPayment);
            setIsViewDialogOpen(true);
        }
        
        form.reset({
            ...form.getValues(),
            amount: 0,
            reference: '',
            otherPurpose: '',
            date: new Date().toISOString().split('T')[0],
        });
        
        // Background refresh without blocking UI
        fetchRecentTransactions();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: error.message || 'Could not record the payment.',
        });
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!recentTransactions) return [];
    return recentTransactions.filter(tx => {
        const searchTerm = searchQuery.toLowerCase();
        const searchMatch = !searchTerm || (
            tx.customerName.toLowerCase().includes(searchTerm) ||
            tx.projectName.toLowerCase().includes(searchTerm) ||
            tx.flatNumber.toLowerCase().includes(searchTerm) ||
            (tx.paymentMethod || '').toLowerCase().includes(searchTerm) ||
            tx.amount.toString().includes(searchTerm) ||
            formatDateForDisplay(tx.date).toLowerCase().includes(searchTerm)
        );

        const dateMatch = isDateWithinRange(tx.date, dateRange?.from, dateRange?.to);

        return searchMatch && dateMatch;
    });
  }, [recentTransactions, searchQuery, dateRange]);

  const handleExport = () => {
    const dataToExport = filteredTransactions.map(tx => ({
        'Receipt ID': tx.receiptId,
        'Date': formatDateForDisplay(tx.date),
        'Customer': tx.customerName,
        'Project': tx.projectName,
        'Flat': tx.flatNumber,
        'Amount': tx.amount,
        'Method': tx.paymentMethod,
        'Purpose': tx.paymentPurpose === 'Other' ? tx.otherPurpose : tx.paymentPurpose,
        'Reference': tx.reference,
    }));
    exportToCsv(dataToExport, `recent_payments_${new Date().toISOString().split('T')[0]}.csv`);
  };


  const handleEditClick = (payment: EnrichedTransaction) => {
    setTimeout(() => {
      setSelectedPayment(payment);
      setIsEditDialogOpen(true);
    }, 0);
  };

  const handleDeleteClick = (payment: InflowTransaction) => {
    setTimeout(() => {
      setSelectedPaymentForDelete(payment);
      setIsDeleteAlertOpen(true);
    }, 0);
  };

  const confirmDeletePayment = () => {
    if (!selectedPaymentForDelete) return;

    const paymentRef = doc(firestore, 'projects', selectedPaymentForDelete.projectId, 'inflowTransactions', selectedPaymentForDelete.id);
    deleteDocumentNonBlocking(paymentRef, () => {
        toast({
            title: "Payment Deleted",
            description: "The payment has been successfully deleted.",
        });
        fetchRecentTransactions(); // Refresh the list
        setIsDeleteAlertOpen(false);
        setSelectedPaymentForDelete(null);
    });
  };

  const handleViewClick = async (payment: EnrichedTransaction) => {
    let customerData: Customer | null = null;
    let projectData: Project | null = null;

    try {
      const customerSnap = await getDoc(doc(firestore, 'customers', payment.customerId));
      if (customerSnap.exists()) {
        customerData = customerSnap.data() as Customer;
      }
    } catch (e) {
      console.warn('Could not fetch customer by doc ID:', e);
    }

    try {
      const projectSnap = await getDoc(doc(firestore, 'projects', payment.projectId));
      if (projectSnap.exists()) {
        projectData = projectSnap.data() as Project;
      }
    } catch (e) {
      console.warn('Could not fetch project by doc ID:', e);
    }

    // Fallback: If customer not found by doc ref, try querying by id field
    if (!customerData && payment.customerId) {
      try {
        const q = query(collection(firestore, 'customers'), where('id', '==', payment.customerId), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          customerData = snap.docs[0].data() as Customer;
        }
      } catch {}
    }

    // Fallback if records are still missing
    if (!customerData) {
      customerData = {
        id: payment.customerId || 'N/A',
        fullName: payment.customerName || 'Valued Customer',
        mobile: 'N/A',
        address: 'N/A',
        nidNumber: 'N/A',
      };
    }

    if (!projectData) {
      projectData = {
        id: payment.projectId || 'N/A',
        projectName: payment.projectName || 'Project',
        location: 'N/A',
        totalFlats: 0,
        startDate: new Date().toISOString(),
        status: 'Ongoing',
        targetSell: 0,
      };
    }

    setSelectedPayment({
        ...payment,
        customer: customerData,
        project: projectData,
    });
    setTimeout(() => {
      setIsViewDialogOpen(true);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Add Customer Payment</CardTitle>
              <CardDescription className="text-xs">
                Record a new installment, booking advance, or milestone cash inflow from a customer.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Step 1: Customer & Property Target */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                      1
                    </span>
                    <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                      Customer & Property Allocation
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Select customer to load purchased flats and financial ledger
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-start">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-start space-y-2">
                        <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-primary" /> Customer <span className="text-rose-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Combobox
                            options={customers?.map(c => ({ value: c.id, label: c.fullName })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a customer"
                            searchPlaceholder="Search customers..."
                            emptyText="No customer found."
                            disabled={customersLoading}
                            className="h-11 w-full rounded-xl border-border/80 shadow-xs transition-all hover:border-primary/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            options={projectsForCustomer.map(p => ({ value: p.id, label: p.projectName }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a project"
                            searchPlaceholder="Search projects..."
                            emptyText="No projects for this customer."
                            disabled={!customerId || projectsForCustomer.length === 0}
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
                            options={flatsForProject.map(f => ({ value: f.id, label: f.flatNumber }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select a flat"
                            searchPlaceholder="Search flats..."
                            emptyText="No flats found."
                            disabled={!projectId || flatsForProject.length === 0}
                            className="h-11 w-full rounded-xl border-border/80 shadow-xs transition-all hover:border-primary/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {customerFinancials && (
                  <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-muted/20 to-card p-4 sm:p-5 shadow-xs backdrop-blur-md space-y-4 animate-in fade-in-50 duration-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <Badge variant={customerFinancials.isFlatSpecific ? "default" : "secondary"} className="font-semibold text-xs px-2.5 py-0.5 rounded-full">
                          {customerFinancials.isFlatSpecific ? "Flat Breakdown" : "Overall Customer Financials"}
                        </Badge>
                        {customerFinancials.isFlatSpecific && customerFinancials.flatNumber && (
                          <span className="text-xs text-muted-foreground font-medium">
                            Unit {customerFinancials.flatNumber} {customerFinancials.projectName ? `• ${customerFinancials.projectName}` : ''}
                          </span>
                        )}
                      </div>
                      {isCalculatingFinancials && (
                        <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recalculating ledger...
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="rounded-xl bg-background/90 border border-border/70 p-3.5 shadow-2xs">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {customerFinancials.isFlatSpecific ? "Flat Total Price" : "Total Agreed Value"}
                        </p>
                        <p className="text-xl font-bold tracking-tight text-foreground mt-1">
                          {formatCurrency(customerFinancials.totalPrice)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 shadow-2xs">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Total Inflows Paid
                        </p>
                        <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatCurrency(customerFinancials.totalPaid)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-3.5 shadow-2xs flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                            <Banknote className="h-3.5 w-3.5" /> Current Due
                          </p>
                          <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                            {formatCurrency(customerFinancials.totalDue)}
                          </p>
                        </div>
                        {customerFinancials.totalDue > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/60 rounded-lg transition-all"
                            onClick={() => {
                              form.setValue('amount', customerFinancials.totalDue, { shouldValidate: true });
                            }}
                          >
                            Pay Due
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Payment Execution & Method */}
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                      2
                    </span>
                    <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                      Payment Amount & Method
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Specify remittance amount and transaction channel
                  </span>
                </div>

                {/* Hero Financial Amount Input */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Banknote className="h-3.5 w-3.5 text-primary" /> Amount to Collect <span className="text-rose-500">*</span>
                        </FormLabel>
                        {customerFinancials && customerFinancials.totalDue > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Outstanding: <strong className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(customerFinancials.totalDue)}</strong>
                          </span>
                        )}
                      </div>
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
                      
                      {/* Fast Fill Chips */}
                      {customerFinancials && customerFinancials.totalDue > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground font-medium">Quick Fill:</span>
                          <button
                            type="button"
                            onClick={() => form.setValue('amount', customerFinancials.totalDue, { shouldValidate: true })}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary transition-colors cursor-pointer"
                          >
                            Full Due ({formatCurrency(customerFinancials.totalDue)})
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('amount', Math.round(customerFinancials.totalDue * 0.5), { shouldValidate: true })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                          >
                            50% ({formatCurrency(Math.round(customerFinancials.totalDue * 0.5))})
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('amount', Math.round(customerFinancials.totalDue * 0.25), { shouldValidate: true })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border/70 bg-muted/40 hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                          >
                            25% ({formatCurrency(Math.round(customerFinancials.totalDue * 0.25))})
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('amount', 0, { shouldValidate: true })}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Interactive Payment Method Cards */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Method <span className="text-rose-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              id: 'Cash',
                              title: 'Cash',
                              desc: 'Physical currency receipt',
                              icon: Banknote,
                              color: 'text-emerald-600 dark:text-emerald-400',
                              bg: 'bg-emerald-500/10',
                            },
                            {
                              id: 'Cheque',
                              title: 'Cheque / Pay Order',
                              desc: 'Bank cheque or draft',
                              icon: FileText,
                              color: 'text-blue-600 dark:text-blue-400',
                              bg: 'bg-blue-500/10',
                            },
                            {
                              id: 'Bank Transfer',
                              title: 'Bank Transfer',
                              desc: 'Direct wire, EFT, or online',
                              icon: Landmark,
                              color: 'text-purple-600 dark:text-purple-400',
                              bg: 'bg-purple-500/10',
                            },
                          ].map((method) => {
                            const isSelected = field.value === method.id;
                            const IconComponent = method.icon;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => field.onChange(method.id)}
                                className={`relative flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                                    : 'border-border/70 bg-card/60 hover:border-primary/40 hover:bg-muted/30'
                                }`}
                              >
                                <div className={`h-9 w-9 rounded-lg ${method.bg} ${method.color} flex items-center justify-center shrink-0 mt-0.5`}>
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-foreground truncate">{method.title}</p>
                                    {isSelected && (
                                      <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground shrink-0">
                                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{method.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Interactive Payment Purpose Selector */}
                <FormField
                  control={form.control}
                  name="paymentPurpose"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Purpose of Payment <span className="text-rose-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'Booking Money', label: 'Booking Money', desc: 'Initial token / advance' },
                            { id: 'Installment', label: 'Installment', desc: 'Scheduled installment' },
                            { id: 'Other', label: 'Other Purpose', desc: 'Ad-hoc or custom fee' },
                          ].map((purpose) => {
                            const isSelected = field.value === purpose.id;
                            return (
                              <button
                                key={purpose.id}
                                type="button"
                                onClick={() => field.onChange(purpose.id)}
                                className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/25 shadow-xs'
                                    : 'border-border/70 bg-card/60 hover:border-primary/40 hover:bg-muted/30'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm font-semibold text-foreground">{purpose.label}</span>
                                  {isSelected && (
                                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground">
                                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground mt-0.5">{purpose.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {paymentPurpose === 'Other' && (
                  <FormField
                    control={form.control}
                    name="otherPurpose"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-start space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                        <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Specify Purpose <span className="text-rose-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Parking Allocation, Utility Connection, Registration Fee"
                            className="h-11 rounded-xl border-border/80 shadow-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Step 3: Date & Reference Tracking */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                      3
                    </span>
                    <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                      Execution Date & Reference
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Accounting transaction date and instrument number
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-start space-y-2">
                        <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" /> Payment Date <span className="text-rose-500">*</span>
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
                    name="reference"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-start space-y-2">
                        <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Reference / Instrument # (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Cheque No. 48291, Deposit Slip #, Txn ID"
                            className="h-11 rounded-xl border-border/80 shadow-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action Bar & Live Summary */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {amount > 0 && selectedCustomer ? (
                    <span className="flex items-center gap-1.5 text-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Ready to record <strong className="text-primary">{formatCurrency(amount)}</strong> for <strong>{selectedCustomer.fullName}</strong> ({selectedFlat ? `Flat ${selectedFlat.flatNumber}` : 'Flat'}) via <strong>{paymentMethod}</strong>
                    </span>
                  ) : (
                    <span>Fill in the details above to record customer inflow remittance</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isViewer || form.formState.isSubmitting}
                    className="w-full sm:w-auto h-12 px-8 font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Recording Payment...
                      </>
                    ) : isViewer ? (
                      'Read-Only (Viewer Access)'
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>
                  A log of the most recent cash inflows.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Search payments..."
                            className="pl-8 sm:w-full lg:w-[300px] h-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto h-10">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLogLoading && (
            <div className="flex justify-center items-center h-60">
              <p>Loading recent payments...</p>
            </div>
          )}
          {!isLogLoading && !filteredTransactions?.length && (
            <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Ban className="h-12 w-12 mb-2" />
              <p className="text-lg font-semibold">No payments found.</p>
              <p className="text-sm">
                Once you add a payment, it will appear here. {searchQuery && 'Try a different search.'}
              </p>
            </div>
          )}
          {!isLogLoading && filteredTransactions && filteredTransactions.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project / Flat</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.customerName}</TableCell>
                      <TableCell>
                          <div className="font-medium">{tx.projectName}</div>
                          <div className="text-sm text-muted-foreground">{tx.flatNumber}</div>
                      </TableCell>
                      <TableCell>
                        {formatDateForDisplay(tx.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
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
                              <DropdownMenuItem onSelect={() => handleViewClick(tx)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEditClick(tx)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteClick(tx)}>
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
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this payment record.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={confirmDeletePayment}
                  className="bg-destructive hover:bg-destructive/90"
              >
                  Delete
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

        {selectedPayment && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Payment</DialogTitle>
                        <DialogDescription>Update the details for this payment record.</DialogDescription>
                    </DialogHeader>
                    <EditPaymentForm 
                        payment={selectedPayment} 
                        setDialogOpen={setIsEditDialogOpen}
                        onUpdate={fetchRecentTransactions}
                    />
                </DialogContent>
            </Dialog>
        )}
        
        {selectedPayment && (
          <PrintReceiptDialog
            isOpen={isViewDialogOpen}
            onClose={() => setIsViewDialogOpen(false)}
            payment={selectedPayment}
            customer={selectedPayment.customer!}
            project={selectedPayment.project!}
          />
        )}
    </div>
  );
}
