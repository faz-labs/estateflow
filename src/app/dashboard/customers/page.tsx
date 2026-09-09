
'use client';

import { Ban, PlusCircle, Pencil, Trash2, MoreHorizontal, View, Search, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { AddCustomerForm } from '@/components/dashboard/customers/add-customer-form';
import { EditCustomerForm } from '@/components/dashboard/customers/edit-customer-form';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { exportToCsv } from '@/lib/csv';

const ITEMS_PER_PAGE = 15;

export default function CustomersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { tenantId, isSuperAdmin } = useUserProfile();

  const customersQuery = useMemoFirebase(
    () => {
      if (!firestore || (!tenantId && !isSuperAdmin)) return null;
      return isSuperAdmin
        ? collection(firestore, 'customers')
        : query(collection(firestore, 'customers'), where('tenantId', '==', tenantId));
    },
    [firestore, tenantId, isSuperAdmin]
  );
  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditDialogOpen(true);
  };
  
  const confirmDeleteCustomer = () => {
    if (!deletingCustomer) return;
    const customerRef = doc(firestore, 'customers', deletingCustomer.id);
    deleteDocumentNonBlocking(customerRef);
    toast({
        title: "Customer Deleted",
        description: `${deletingCustomer.fullName} has been successfully deleted.`,
    });
    setIsDeleteAlertOpen(false);
    setDeletingCustomer(null);
  };

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const searchTerm = searchQuery.toLowerCase();
    return customers
      .filter(c => isSuperAdmin || !c.tenantId || c.tenantId === tenantId)
      .filter(customer =>
        customer.fullName.toLowerCase().includes(searchTerm) ||
        customer.mobile.toLowerCase().includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm) ||
        customer.nidNumber.toLowerCase().includes(searchTerm)
      );
  }, [customers, searchQuery, tenantId, isSuperAdmin]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
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
    const dataToExport = filteredCustomers.map(c => ({
        'ID': c.id,
        'Full Name': c.fullName,
        'Mobile': c.mobile,
        'Address': c.address,
        'NID Number': c.nidNumber,
    }));
    exportToCsv(dataToExport, `customers_${new Date().toISOString().split('T')[0]}.csv`);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Manage all your customers.
              </CardDescription>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center gap-2">
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search" 
                        placeholder="Search customers..."
                        className="pl-8 sm:w-[300px]"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to first page on search
                        }}
                    />
                </div>
                 <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <AddCustomerForm setDialogOpen={setIsAddDialogOpen} />
                </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-60">
              <p>Loading customers...</p>
            </div>
          )}
          {!isLoading && !paginatedCustomers?.length && (
            <div className="flex flex-col items-center justify-center h-60 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Ban className="h-12 w-12 mb-2" />
              <p className="text-lg font-semibold">No customers found.</p>
              <p className="text-sm">
                {searchQuery ? 'Try a different search term or' : 'Click "Add Customer" to'} get started.
              </p>
            </div>
          )}
          {!isLoading && paginatedCustomers && paginatedCustomers.length > 0 && (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>NID Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.fullName}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{customer.mobile}</div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{customer.email}</div>
                        )}
                      </TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell>{customer.nidNumber}</TableCell>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/customers/${customer.id}`}>
                                <View className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => {
                              setTimeout(() => handleEditClick(customer), 0);
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onSelect={() => {
                                setTimeout(() => {
                                  setDeletingCustomer(customer);
                                  setIsDeleteAlertOpen(true);
                                }, 0);
                              }}
                            >
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
      {editingCustomer && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            <EditCustomerForm customer={editingCustomer} setDialogOpen={setIsEditDialogOpen} />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete customer{' '}
              <span className="font-semibold text-foreground">{deletingCustomer?.fullName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCustomer}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
