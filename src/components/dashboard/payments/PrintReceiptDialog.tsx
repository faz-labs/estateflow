'use client';

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt } from '@/components/dashboard/receipt';
import { Printer, Save, Loader2, X } from 'lucide-react';
import type { EnrichedTransaction } from '@/app/dashboard/add-payment/page';
import type { Customer, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface PrintReceiptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payment: EnrichedTransaction;
  customer: Customer;
  project: Project;
}

export function PrintReceiptDialog({
  isOpen,
  onClose,
  payment,
  customer,
  project,
}: PrintReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    if (!receiptRef.current) {
      toast({ variant: 'destructive', title: 'Error', description: 'Receipt content is not ready.' });
      return;
    }

    setIsPrinting(true);

    try {
      // Remove any leftover iframe
      const oldFrame = document.getElementById('estateflow-print-frame');
      if (oldFrame) {
        document.body.removeChild(oldFrame);
      }

      // Create an invisible iframe for printing (bypasses browser popup blockers 100%)
      const iframe = document.createElement('iframe');
      iframe.id = 'estateflow-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc || !iframe.contentWindow) {
        throw new Error('Unable to access print frame.');
      }

      const printContent = receiptRef.current.innerHTML;

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt_${payment.receiptId || 'Invoice'}</title>
            <style>
              @page { 
                size: A4; 
                margin: 10mm; 
              }
              * {
                box-sizing: border-box;
              }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                background-color: #ffffff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              img {
                max-width: 100%;
                height: auto;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
            </style>
            <link rel="stylesheet" href="/globals.css" />
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      iframeDoc.close();

      // Allow DOM and styles to process before invoking print dialog
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print execution error:', e);
        } finally {
          setIsPrinting(false);
          // Clean up frame after print
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 400);

    } catch (error: any) {
      console.error('Printing error:', error);
      setIsPrinting(false);
      toast({
        variant: 'destructive',
        title: 'Print Failed',
        description: error.message || 'Could not launch print dialog.',
      });
    }
  };

  const handleSavePdf = async () => {
    const node = receiptRef.current;
    if (!node) {
      toast({ variant: 'destructive', title: 'Error', description: 'Receipt content not found.' });
      return;
    }

    setIsSaving(true);

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      
      let finalImgWidth = pdfWidth;
      let finalImgHeight = pdfWidth / canvasAspectRatio;

      if (finalImgHeight > pdfHeight) {
          finalImgHeight = pdfHeight;
          finalImgWidth = pdfHeight * canvasAspectRatio;
      }
      
      const x = (pdfWidth - finalImgWidth) / 2;
      const y = (pdfHeight - finalImgHeight) / 2;
      
      pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
      pdf.save(`Receipt_${payment.receiptId || 'Payment'}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: `Receipt_${payment.receiptId}.pdf has been saved.`,
      });

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: error.message || 'An unexpected error occurred while creating the PDF.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Payment Receipt / Invoice</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Receipt #{payment.receiptId} &bull; Generated for {customer?.fullName || payment.customerName || 'Customer'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[72vh] p-6 bg-slate-100/60 dark:bg-slate-900/60">
          <div ref={receiptRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mx-auto">
            <Receipt
              payment={payment}
              customer={customer}
              project={project}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Close
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleSavePdf} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {isSaving ? 'Generating PDF...' : 'Save as PDF'}
            </Button>
            <Button type="button" size="sm" onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
