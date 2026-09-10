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
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Layers, PlusCircle, Loader2 } from 'lucide-react';

const addItemFormSchema = z.object({
  name: z.string().min(2, { message: 'Item name must be at least 2 characters.' }),
});
type AddItemFormValues = z.infer<typeof addItemFormSchema>;

interface AddOperatingCostItemFormProps {
  setDialogOpen: (open: boolean) => void;
}

export function AddOperatingCostItemForm({ setDialogOpen }: AddOperatingCostItemFormProps) {
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
        title: 'Action Restricted',
        description: 'Viewers do not have permission to add operating cost categories.',
      });
      return;
    }

    try {
      const itemsCollection = collection(firestore, 'operatingCostItems');
      const newItemRef = doc(itemsCollection);
      addDocumentNonBlocking(itemsCollection, {
        id: newItemRef.id,
        name: data.name,
        tenantId: tenantId || 'default_workspace',
      });
      toast({ title: 'Category Added', description: `${data.name} has been added.` });
      form.reset();
      setDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
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
                <Layers className="h-3.5 w-3.5 text-primary" /> Category / Item Name <span className="text-rose-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g., Office Rent, Executive Salaries, Internet" className="h-11 rounded-xl border-border/80 shadow-xs px-3.5" {...field} />
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
                <Loader2 className="h-4 w-4 animate-spin" /> Adding Category...
              </>
            ) : isViewer ? (
              'Read-Only (Viewer Access)'
            ) : (
              <>
                <PlusCircle className="h-4 w-4" /> Add Category
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
