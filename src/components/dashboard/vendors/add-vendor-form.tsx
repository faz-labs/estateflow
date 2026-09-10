
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
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { User, Building2, Phone, Mail, FileText, CheckCircle2, Loader2 } from 'lucide-react';

const vendorFormSchema = z.object({
  vendorName: z.string().min(2, {
    message: 'Vendor name must be at least 2 characters.',
  }),
  phoneNumber: z.string().min(11, {
    message: 'Phone number must be at least 11 digits.',
  }),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  enterpriseName: z.string().min(2, {
    message: 'Enterprise name must be at least 2 characters.',
  }),
  details: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface AddVendorFormProps {
  setDialogOpen: (open: boolean) => void;
}

export function AddVendorForm({ setDialogOpen }: AddVendorFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, isViewer } = useUserProfile();
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendorName: '',
      phoneNumber: '',
      email: '',
      enterpriseName: '',
      details: '',
    },
  });

  async function onSubmit(data: VendorFormValues) {
    if (isViewer) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Your account has read-only access (Viewer role). You cannot add vendors.',
      });
      return;
    }

    try {
      const vendorsCollection = collection(firestore, 'vendors');
      const newVendorRef = doc(vendorsCollection);

      const newVendor = {
        id: newVendorRef.id,
        ...data,
        tenantId: tenantId || 'default_workspace',
      };

      setDocumentNonBlocking(newVendorRef, newVendor, { merge: true });

      toast({
        title: 'Vendor Added',
        description: `${data.vendorName} has been successfully created.`,
      });
      form.reset();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding vendor: ', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not add the vendor. ' + error.message,
      });
    }
  }

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              control={form.control}
              name="vendorName"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <User className="h-3.5 w-3.5 text-primary" /> Vendor Contact Name <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Abul Kashem" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enterpriseName"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Enterprise / Company <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Kashem Traders Ltd" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Phone Number <span className="text-rose-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., 01712345678" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-start space-y-1.5">
                  <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" /> Remittance Email (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="E.g., billing@kashemtraders.com" className="h-11 rounded-xl border-border/80 shadow-xs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-start space-y-1.5">
                <FormLabel className="h-5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Supply Scope & Contract Notes
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Prime vendor for 500W grade rebar steel, cement bags, and structural materials..." className="rounded-xl border-border/80 shadow-xs min-h-[85px] p-3" {...field} />
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding Vendor...
                </>
              ) : isViewer ? (
                'Read-Only (Viewer Access)'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Add Vendor
                </>
              )}
            </Button>
          </div>
      </form>
    </Form>
  );
}

