import { useState, useMemo, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Customer, Project, Receipt } from '../../types/crm';

// Simple toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

interface EditReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (receipt: Receipt) => void;
  receipt: Receipt | null;
  customers: Customer[];
  projects: Project[];
  receipts: Receipt[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
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

const methodOptions = [
  { value: 'cash', icon: '💵', label: 'Cash', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'bank_transfer', icon: '🏦', label: 'Bank Transfer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'cheque', icon: '📝', label: 'Cheque', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'online', icon: '💳', label: 'Online', color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

export function EditReceiptModal({ 
  open, 
  onClose, 
  onSave, 
  receipt,
  customers, 
  projects,
  receipts 
}: EditReceiptModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    projectId: '',
    amount: 0,
    method: 'cash' as Receipt['method'],
    reference: '',
    date: '',
    notes: '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when receipt changes
  useEffect(() => {
    if (receipt && open) {
      const dateStr = receipt.date instanceof Date 
        ? receipt.date.toISOString().split('T')[0]
        : new Date(receipt.date).toISOString().split('T')[0];
      
      setFormData({
        customerId: receipt.customerId,
        projectId: receipt.projectId,
        amount: receipt.amount,
        method: receipt.method,
        reference: receipt.reference || '',
        date: dateStr,
        notes: receipt.notes || '',
      });
      setHasChanges(false);
    }
  }, [receipt, open]);

  // Track changes
  useEffect(() => {
    if (!receipt) return;
    
    const dateStr = receipt.date instanceof Date 
      ? receipt.date.toISOString().split('T')[0]
      : new Date(receipt.date).toISOString().split('T')[0];

    const changed = 
      formData.customerId !== receipt.customerId ||
      formData.projectId !== receipt.projectId ||
      formData.amount !== receipt.amount ||
      formData.method !== receipt.method ||
      formData.reference !== (receipt.reference || '') ||
      formData.date !== dateStr ||
      formData.notes !== (receipt.notes || '');

    setHasChanges(changed);
  }, [formData, receipt]);

  // Get eligible customers (non-brokers)
  const eligibleCustomers = useMemo(() => {
    return customers.filter(c => c.type === 'customer' || c.type === 'both');
  }, [customers]);

  // Get projects for selected customer
  const customerProjects = useMemo(() => {
    if (!formData.customerId) return [];
    return projects.filter(p => p.customerId === formData.customerId);
  }, [formData.customerId, projects]);

  // Get payment history
  const customerPaymentHistory = useMemo(() => {
    if (!formData.customerId) return [];
    return receipts
      .filter(r => r.customerId === formData.customerId && r.id !== receipt?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [formData.customerId, receipts, receipt?.id]);

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedProject = projects.find(p => p.id === formData.projectId);

  // Get project payment info
  const projectPaymentInfo = useMemo(() => {
    if (!formData.projectId || !receipt) return null;
    
    const projectReceipts = receipts
      .filter(r => r.projectId === formData.projectId && r.id !== receipt.id);
    const totalPaid = projectReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const lastPayment = projectReceipts.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    return { totalPaid, lastPayment, paymentCount: projectReceipts.length };
  }, [formData.projectId, receipts, receipt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receipt) return;

    if (!formData.customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (!formData.projectId) {
      showToast('Please select a project', 'error');
      return;
    }

    if (formData.amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const updatedReceipt: Receipt = {
      ...receipt,
      customerId: formData.customerId,
      customerName: selectedCustomer?.name || receipt.customerName,
      projectId: formData.projectId,
      projectName: selectedProject ? `${selectedProject.name} - ${selectedProject.unit}` : receipt.projectName,
      amount: formData.amount,
      method: formData.method,
      reference: formData.reference || undefined,
      date: new Date(formData.date),
      notes: formData.notes || undefined,
    };

    onSave(updatedReceipt);
    showToast('Receipt updated successfully');
    onClose();
  };

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">✏️</span>
              Edit Receipt
            </DialogTitle>
            {hasChanges && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Receipt: <span className="font-mono font-medium">{receipt.receiptNumber}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Customer *</label>
            <Select 
              value={formData.customerId} 
              onValueChange={(value) => setFormData({ ...formData, customerId: value, projectId: '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {eligibleCustomers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{customer.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Info Card */}
          {selectedCustomer && (
            <Card className="p-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {customerProjects.length} project(s) • {customerPaymentHistory.length + 1} payment(s)
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project *</label>
            <Select 
              value={formData.projectId} 
              onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              disabled={!formData.customerId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={formData.customerId ? "Select project" : "Select customer first"} />
              </SelectTrigger>
              <SelectContent>
                {customerProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2">
                        <span>🏢</span>
                        <span className="font-medium">{project.name} - {project.unit}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Balance Info */}
          {selectedProject && projectPaymentInfo && (
            <Card className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Balance</span>
                  <p className={`font-bold ${((selectedProject.sale || 0) - (selectedProject.received || 0)) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₨{formatCurrency((selectedProject.sale || 0) - (selectedProject.received || 0))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">After This Payment</span>
                  <p className="font-bold text-emerald-600">
                    ₨{formatCurrency(Math.max(0, ((selectedProject.sale || 0) - (selectedProject.received || 0)) - formData.amount))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Paid (Other)</span>
                  <p className="font-bold text-foreground">
                    ₨{formatCurrency(projectPaymentInfo.totalPaid)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Count</span>
                  <p className="font-bold text-foreground">
                    {projectPaymentInfo.paymentCount + 1}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount (PKR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₨</span>
                <Input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="pl-8 text-lg font-semibold"
                  required
                />
              </div>
              {receipt.amount !== formData.amount && (
                <p className="text-xs text-amber-600">
                  Original: ₨{formatCurrency(receipt.amount)} 
                  {formData.amount > receipt.amount ? ' (↑ increased)' : ' (↓ decreased)'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Receipt Date *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Payment Method *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {methodOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, method: option.value as Receipt['method'] })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.method === option.value
                      ? `${option.color} border-current ring-2 ring-offset-2 ring-current`
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">{option.icon}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reference Number</label>
            <Input
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder={
                formData.method === 'cheque' ? 'Cheque number' :
                formData.method === 'bank_transfer' ? 'Transaction ID' :
                formData.method === 'online' ? 'Transaction reference' :
                'Optional reference'
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this payment"
            />
          </div>

          {/* Original Receipt Info */}
          <Card className="p-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-muted-foreground mb-2">Original Receipt Info</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{receipt.createdAt ? formatDate(receipt.createdAt) : 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Original Amount</span>
                <p className="font-medium">₨{formatCurrency(receipt.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Original Date</span>
                <p className="font-medium">{formatDate(receipt.date)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Original Method</span>
                <p className="font-medium">{methodOptions.find(m => m.value === receipt.method)?.label}</p>
              </div>
            </div>
          </Card>

          <DialogFooter className="gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              disabled={!hasChanges || !formData.customerId || !formData.projectId || formData.amount <= 0}
            >
              <span className="mr-2">💾</span>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditReceiptModal;