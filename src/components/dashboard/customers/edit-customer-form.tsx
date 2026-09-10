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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Customer } from '@/lib/types';
import { User, Phone, Mail, MapPin, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';

const customerFormSchema = z.object({
  fullName: z.string().min(2, {
    message: 'Full name must be at least 2 characters.',
  }),
  mobile: z.string().min(11, {
    message: 'Mobile number must be at least 11 digits.',
  }),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  address: z.string().min(5, {
    message: 'Address must be at least 5 characters.',
  }),
  nidNumber: z.string().min(10, {
    message: 'NID number must be at least 10 digits.',
  }),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface EditCustomerFormProps {
  customer: Customer;
  setDialogOpen: (open: boolean) => void;
}

export function EditCustomerForm({ customer, setDialogOpen }: EditCustomerFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isViewer } = useUserProfile();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email || '',
      address: customer.address,
      nidNumber: customer.nidNumber,
    },
  });

  async function onSubmit(data: CustomerFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Action Restricted',
        description: 'Viewers do not have permission to update customer records.',
      });
      return;
    }

    try {
      const customerRef = doc(firestore, 'customers', customer.id);
      
      updateDocumentNonBlocking(customerRef, data);

      toast({
        title: 'Customer Updated',
        description: `${data.fullName}'s information has been successfully updated.`,
      });
      form.reset();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating customer: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update the customer. ' + error.message,
      });
    }
  }

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <User className="h-3.5 w-3.5 text-primary" /> Full Legal Name <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., John Doe" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Mobile Number <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., 01712345678" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" /> Email Address (For receipts)
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="E.g., customer@example.com" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nidNumber"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <CreditCard className="h-3.5 w-3.5 text-primary" /> National ID (NID) <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter National ID number" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-start space-y-1.5">
                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Permanent / Present Address <span className="text-rose-500">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter full mailing address..." className="rounded-xl border-border/80 shadow-xs min-h-[85px] p-3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

    