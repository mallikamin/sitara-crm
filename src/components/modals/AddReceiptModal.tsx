import { useState, useMemo, useEffect } from 'react';

// Simple toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window !== 'undefined') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-[9999] ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
};

interface Customer {
  id: string;
  name: string;
  phone?: string;
  type?: string;
}

interface Project {
  id: string;
  name: string;
  unit?: string;
  customerId: string;
  sale?: number;
  received?: number;
}

interface Receipt {
  id?: string;
  receiptNumber?: string;
  customerId: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  reference?: string;
  date: Date | string;
  notes?: string;
}

interface AddReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => void;
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
  return `${Math.floor(diffDays / 30)} months ago`;
}

const methodOptions = [
  { value: 'cash', icon: '💵', label: 'Cash', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'bank_transfer', icon: '🏦', label: 'Bank Transfer', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'cheque', icon: '📝', label: 'Cheque', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'online', icon: '💳', label: 'Online', color: 'bg-violet-50 text-violet-700 border-violet-200' },
];

export function AddReceiptModal({ 
  open, 
  onClose, 
  onAdd, 
  customers = [], 
  projects = [],
  receipts = [] 
}: AddReceiptModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    amount: 0,
    method: 'cash' as Receipt['method'],
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get eligible customers (non-brokers only)
  const eligibleCustomers = useMemo(() => {
    return (customers || []).filter(c => 
      c.type === 'customer' || c.type === 'individual' || c.type === 'both' || !c.type
    );
  }, [customers]);

  // Get projects for selected customer
  const customerProjects = useMemo(() => {
    if (!formData.customerId) return [];
    return (projects || []).filter(p => 
      String(p.customerId) === String(formData.customerId)
    );
  }, [formData.customerId, projects]);

  // Get payment history for selected customer
  const customerPaymentHistory = useMemo(() => {
    if (!formData.customerId) return [];
    return (receipts || [])
      .filter(r => String(r.customerId) === String(formData.customerId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [formData.customerId, receipts]);

  // Get last payment info
  const lastPaymentInfo = useMemo(() => {
    if (customerPaymentHistory.length === 0) return null;
    const lastPayment = customerPaymentHistory[0];
    const totalPaid = (receipts || [])
      .filter(r => String(r.customerId) === String(formData.customerId))
      .reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0);
    
    return { lastPayment, totalPaid, paymentCount: customerPaymentHistory.length };
  }, [customerPaymentHistory, formData.customerId, receipts]);

  const selectedCustomer = (customers || []).find(c => String(c.id) === String(formData.customerId));

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        customerId: '',
        amount: 0,
        method: 'cash',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setSelectedProjectId('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Auto-select project if customer has only one
  useEffect(() => {
    setSelectedProjectId('');
    if (customerProjects.length === 1) {
      setSelectedProjectId(String(customerProjects[0].id));
    }
  }, [formData.customerId, customerProjects]);

  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}-${random}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!formData.customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (formData.amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (customerProjects.length > 0 && !selectedProjectId) {
      showToast('Please select a project', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const project = (projects || []).find(p => String(p.id) === String(selectedProjectId));
      
      onAdd({
        receiptNumber: generateReceiptNumber(),
        customerId: formData.customerId,
        customerName: selectedCustomer?.name || '',
        projectId: selectedProjectId || '',
        projectName: project ? `${project.name} - ${project.unit || ''}` : '',
        amount: formData.amount,
        method: formData.method,
        reference: formData.reference || undefined,
        date: formData.date, // Keep as string YYYY-MM-DD
        notes: formData.notes || undefined,
      });

      showToast('Receipt added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding receipt:', error);
      showToast('Failed to add receipt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Don't render if not open
  if (!open) return null;

  // Get selected project details
  const selectedProject = selectedProjectId 
    ? (projects || []).find(p => String(p.id) === String(selectedProjectId))
    : null;
  
  const projectBalance = selectedProject 
    ? (parseFloat(String(selectedProject.sale)) || 0) - (parseFloat(String(selectedProject.received)) || 0)
    : 0;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Backdrop - clicking closes modal */}
      <div 
        className="absolute inset-0" 
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-[600px] w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            Add New Receipt
          </h2>
          <button 
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Customer *
              </label>
              
              {eligibleCustomers.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="font-medium">No customers available</p>
                      <p className="text-sm">Please add customers first in the Customers section.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select a customer</option>
                  {eligibleCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Customer Payment History */}
            {selectedCustomer && lastPaymentInfo && (
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="font-semibold">{selectedCustomer.name}</h4>
                      <p className="text-xs text-gray-500">{customerProjects.length} active project(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      ₨{formatCurrency(lastPaymentInfo.totalPaid)}
                    </p>
                    <p className="text-xs text-gray-500">Total paid</p>
                  </div>
                </div>
                
                {lastPaymentInfo.lastPayment && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 mb-1">Last Payment</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {getRelativeTime(lastPaymentInfo.lastPayment.date)} ({formatDate(lastPaymentInfo.lastPayment.date)})
                      </span>
                      <span className="font-semibold text-emerald-600">
                        ₨{formatCurrency(parseFloat(String(lastPaymentInfo.lastPayment.amount)) || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amount and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount (PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₨</span>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Receipt Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Project Selection */}
            {formData.customerId && customerProjects.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project *
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Select a project</option>
                  {customerProjects.map(project => {
                    const balance = (parseFloat(String(project.sale)) || 0) - (parseFloat(String(project.received)) || 0);
                    return (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.unit || 'N/A'} (Balance: ₨{formatCurrency(balance)})
                      </option>
                    );
                  })}
                </select>

                {/* Selected Project Info */}
                {selectedProject && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Balance</span>
                        <p className={`font-bold ${projectBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ₨{formatCurrency(projectBalance)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">After Payment</span>
                        <p className="font-bold text-emerald-600">
                          ₨{formatCurrency(Math.max(0, projectBalance - formData.amount))}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Sale</span>
                        <p className="font-bold">
                          ₨{formatCurrency(parseFloat(String(selectedProject.sale)) || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Received</span>
                        <p className="font-bold">
                          ₨{formatCurrency(parseFloat(String(selectedProject.received)) || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No projects warning */}
            {formData.customerId && customerProjects.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="font-medium">No projects found</p>
                    <p className="text-sm">This customer doesn't have any active projects yet.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {methodOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, method: option.value as Receipt['method'] })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.method === option.value
                        ? `${option.color} border-current ring-2 ring-offset-2`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder={
                  formData.method === 'cheque' ? 'Cheque number' :
                  formData.method === 'bank_transfer' ? 'Transaction ID' :
                  formData.method === 'online' ? 'Transaction reference' :
                  'Optional reference'
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this payment"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || 
                !formData.customerId || 
                formData.amount <= 0 ||
                (customerProjects.length > 0 && !selectedProjectId)
              }
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>💰</span>
              {isSubmitting ? 'Adding...' : 'Add Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddReceiptModal;