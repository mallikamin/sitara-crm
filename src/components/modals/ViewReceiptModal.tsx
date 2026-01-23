import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Receipt, Customer, Project } from '../../types/crm';

interface ViewReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  customer: Customer | null;
  project: Project | null;
  allReceipts: Receipt[];
  onPrint?: () => void;
  onEdit?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

const methodLabels: Record<string, { icon: string; label: string; color: string }> = {
  cash: { icon: '💵', label: 'Cash', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bank_transfer: { icon: '🏦', label: 'Bank Transfer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cheque: { icon: '📝', label: 'Cheque', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  online: { icon: '💳', label: 'Online', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export function ViewReceiptModal({ 
  open, 
  onClose, 
  receipt, 
  customer, 
  project,
  allReceipts,
  onPrint,
  onEdit,
}: ViewReceiptModalProps) {
  const projectReceipts = useMemo(() => {
    if (!receipt) return [];
    return allReceipts
      .filter(r => r.projectId === receipt.projectId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [receipt, allReceipts]);

  const customerReceipts = useMemo(() => {
    if (!receipt) return [];
    return allReceipts
      .filter(r => r.customerId === receipt.customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipt, allReceipts]);

  const paymentInfo = useMemo(() => {
    if (!receipt) return null;
    
    const receiptIndex = projectReceipts.findIndex(r => r.id === receipt.id);
    const previousReceipt = receiptIndex > 0 ? projectReceipts[receiptIndex - 1] : null;
    const nextReceipt = receiptIndex < projectReceipts.length - 1 ? projectReceipts[receiptIndex + 1] : null;
    
    const runningTotal = projectReceipts
      .slice(0, receiptIndex + 1)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const daysSinceLastPayment = previousReceipt 
      ? Math.floor((new Date(receipt.date).getTime() - new Date(previousReceipt.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalProjectPayments = projectReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCustomerPayments = customerReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      paymentNumber: receiptIndex + 1,
      totalPayments: projectReceipts.length,
      previousReceipt,
      nextReceipt,
      runningTotal,
      daysSinceLastPayment,
      totalProjectPayments,
      totalCustomerPayments,
    };
  }, [receipt, projectReceipts, customerReceipts]);

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🧾</span>
              Receipt Details
            </DialogTitle>
            <Badge 
              className={`${methodLabels[receipt.method]?.color || ''} border text-sm px-3 py-1`}
            >
              {methodLabels[receipt.method]?.icon} {methodLabels[receipt.method]?.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Receipt Header */}
          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Receipt Number</p>
                <p className="text-xl font-mono font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                  {receipt.receiptNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Amount</p>
                <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                  ₨{formatCurrency(receipt.amount)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <span>📅</span>
                <span>{formatDate(receipt.date)}</span>
                <span className="text-emerald-500">•</span>
                <span>{getRelativeTime(receipt.date)}</span>
              </div>
            </div>
          </Card>

          {/* Customer & Project Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {(receipt.customerName || customer?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Customer</p>
                  <p className="font-semibold text-foreground">{receipt.customerName || customer?.name}</p>
                  {customer && (
                    <>
                      {customer.phone && (
                        <p className="text-sm text-muted-foreground mt-1">📞 {customer.phone}</p>
                      )}
                      {customer.email && (
                        <p className="text-sm text-muted-foreground">✉️ {customer.email}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {paymentInfo && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total payments made</span>
                    <span className="font-semibold">₨{formatCurrency(paymentInfo.totalCustomerPayments)}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl">
                  🏢
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Project</p>
                  <p className="font-semibold text-foreground">
                    {receipt.projectName || (project ? `${project.name} - ${project.unit}` : 'N/A')}
                  </p>
                  {project && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Current Balance</span>
                        <span className={`font-semibold ${((project.sale || 0) - (project.received || 0)) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ₨{formatCurrency((project.sale || 0) - (project.received || 0))}
                        </span>
                      </div>
                      {(project.overdue || 0) > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Overdue</span>
                          <span className="font-semibold text-red-600">
                            ₨{formatCurrency(project.overdue || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Details */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>💳</span>
              Payment Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="font-medium mt-1 flex items-center gap-1">
                  {methodLabels[receipt.method]?.icon}
                  {methodLabels[receipt.method]?.label}
                </p>
              </div>
              {receipt.reference && (
                <div>
                  <p className="text-xs text-muted-foreground">Reference Number</p>
                  <p className="font-mono font-medium mt-1">{receipt.reference}</p>
                </div>
              )}
              {paymentInfo && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Number</p>
                    <p className="font-medium mt-1">
                      #{paymentInfo.paymentNumber} of {paymentInfo.totalPayments}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Running Total (Project)</p>
                    <p className="font-medium mt-1 text-emerald-600">
                      ₨{formatCurrency(paymentInfo.runningTotal)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Payment Timeline */}
          {paymentInfo && (paymentInfo.previousReceipt || paymentInfo.nextReceipt) && (
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>⏰</span>
                Payment Timeline
              </h3>
              
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                
                <div className="space-y-4">
                  {paymentInfo.previousReceipt && (
                    <div className="relative pl-10">
                      <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900" />
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Previous Payment</p>
                            <p className="font-medium text-sm">{formatShortDate(paymentInfo.previousReceipt.date)}</p>
                          </div>
                          <Badge variant="outline">₨{formatCurrency(paymentInfo.previousReceipt.amount)}</Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentInfo.daysSinceLastPayment !== null && (
                    <div className="relative pl-10">
                      <div className="absolute left-[7px] top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-white dark:bg-slate-900 px-1">
                        ↕️ {paymentInfo.daysSinceLastPayment} days
                      </div>
                    </div>
                  )}

                  <div className="relative pl-10">
                    <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 ring-4 ring-emerald-100 dark:ring-emerald-900/50" />
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">This Payment</p>
                          <p className="font-medium text-sm">{formatShortDate(receipt.date)}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                          ₨{formatCurrency(receipt.amount)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {paymentInfo.nextReceipt && (
                    <div className="relative pl-10">
                      <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900" />
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Next Payment</p>
                            <p className="font-medium text-sm">{formatShortDate(paymentInfo.nextReceipt.date)}</p>
                          </div>
                          <Badge variant="outline">₨{formatCurrency(paymentInfo.nextReceipt.amount)}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Project Payment History */}
          {projectReceipts.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>📊</span>
                Project Payment History
                <Badge variant="outline" className="ml-auto">{projectReceipts.length} payments</Badge>
              </h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {projectReceipts.slice().reverse().map((r, index) => (
                  <div 
                    key={r.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      r.id === receipt.id 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        r.id === receipt.id 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {projectReceipts.length - index}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatShortDate(r.date)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.receiptNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${r.id === receipt.id ? 'text-emerald-600' : 'text-foreground'}`}>
                        ₨{formatCurrency(r.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {methodLabels[r.method]?.icon} {methodLabels[r.method]?.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Total Collected (Project)</span>
                  <span className="text-lg font-bold text-emerald-600">
                    ₨{formatCurrency(paymentInfo?.totalProjectPayments || 0)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          {receipt.notes && (
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <span>📝</span>
                Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <span className="mr-2">✏️</span>
              Edit
            </Button>
          )}
          {onPrint && (
            <Button 
              onClick={onPrint}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white"
            >
              <span className="mr-2">🖨️</span>
              Print Receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ViewReceiptModal;