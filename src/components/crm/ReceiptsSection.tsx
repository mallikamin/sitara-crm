import { useState, useMemo, useCallback } from 'react';
import { Receipt, Customer, Project } from '../../types/crm';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useData } from '../../contexts/DataContextAPI';
import AddReceiptModal from '../modals/AddReceiptModal';
import EditReceiptModal from '../modals/EditReceiptModal';
import ViewReceiptModal from '../modals/ViewReceiptModal';
import PrintReceiptModal from '../modals/PrintReceiptModal';

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

// Icon components
const Search = () => <span className="text-base">🔍</span>;
const ReceiptIcon = () => <span className="text-base">🧾</span>;
const Download = () => <span className="text-base">📥</span>;
const Eye = () => <span className="text-base">👁️</span>;
const Pencil = () => <span className="text-base">✏️</span>;
const Trash2 = () => <span className="text-base">🗑️</span>;
const Printer = () => <span className="text-base">🖨️</span>;
const Calendar = () => <span className="text-base">📅</span>;
const TrendUp = () => <span className="text-base">📈</span>;
const Clock = () => <span className="text-base">⏰</span>;
const User = () => <span className="text-base">👤</span>;
const Building = () => <span className="text-base">🏢</span>;
const Filter = () => <span className="text-base">🔽</span>;
const RefreshCw = () => <span className="text-base">🔄</span>;

interface ReceiptsSectionProps {
  receipts?: Receipt[];
  customers?: Customer[];
  projects?: Project[];
  onAddReceipt?: () => void;
  onEditReceipt?: (receipt: Receipt) => void;
  onDeleteReceipt?: (id: string) => void;
  onViewReceipt?: (receipt: Receipt) => void;
  onPrintReceipt?: (receipt: Receipt) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-PK', {
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

const methodLabels: Record<string, { icon: string; label: string; bgClass: string; textClass: string }> = {
  cash: { 
    icon: '💵', 
    label: 'Cash', 
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
  },
  bank_transfer: { 
    icon: '🏦', 
    label: 'Bank Transfer', 
    bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
  },
  cheque: { 
    icon: '📝', 
    label: 'Cheque', 
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
  },
  online: { 
    icon: '💳', 
    label: 'Online', 
    bgClass: 'bg-violet-50 dark:bg-violet-900/30',
    textClass: 'text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700'
  },
};

// Payment Activity Mini Chart Component
function PaymentActivityChart({ receipts }: { receipts: Receipt[] }) {
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayReceipts = (receipts || []).filter(r => {
        const rDate = new Date(r.date).toISOString().split('T')[0];
        return rDate === dateStr;
      });
      const total = dayReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
      days.push({
        date: date.toLocaleDateString('en-PK', { weekday: 'short' }),
        total,
        count: dayReceipts.length,
      });
    }
    return days;
  }, [receipts]);

  const maxAmount = Math.max(...last7Days.map(d => d.total), 1);

  return (
    <div className="flex items-end gap-1 h-12">
      {last7Days.map((day, i) => (
        <div key={i} className="flex flex-col items-center flex-1 group relative">
          <div 
            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500 cursor-pointer min-h-[4px]"
            style={{ height: `${Math.max((day.total / maxAmount) * 100, 8)}%` }}
          />
          <span className="text-[10px] text-muted-foreground mt-1">{day.date}</span>
          
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            ₨{formatCurrency(day.total)} ({day.count} receipts)
          </div>
        </div>
      ))}
    </div>
  );
}

// Customer Payment Summary Component
function CustomerPaymentSummary({ 
  customerId, 
  receipts, 
  customers, 
  projects 
}: { 
  customerId: string; 
  receipts: Receipt[]; 
  customers: Customer[];
  projects: Project[];
}) {
  const customer = customers.find(c => String(c.id) === String(customerId));
  const customerReceipts = receipts.filter(r => String(r.customerId) === String(customerId));
  const customerProjects = projects.filter(p => String(p.customerId) === String(customerId));
  
  const totalPaid = customerReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  const lastPayment = customerReceipts.length > 0 
    ? customerReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  if (!customer) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {customer.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{customer.name}</h4>
            <p className="text-xs text-muted-foreground">{customerProjects.length} project(s)</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          ₨{formatCurrency(totalPaid)} paid
        </Badge>
      </div>
      
      {lastPayment && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock />
          <span>Last payment: {getRelativeTime(lastPayment.date)} - ₨{formatCurrency(lastPayment.amount)}</span>
        </div>
      )}
    </div>
  );
}

function ReceiptsSection({ 
  receipts: propReceipts,
  customers: propCustomers,
  projects: propProjects,
  onAddReceipt: externalOnAddReceipt,
  onEditReceipt: externalOnEditReceipt,
  onDeleteReceipt: externalOnDeleteReceipt,
  onViewReceipt: externalOnViewReceipt,
  onPrintReceipt: externalOnPrintReceipt,
}: ReceiptsSectionProps) {
  // Get data from DataContext (useData) - this is the correct store
  const { 
    customers: contextCustomers, 
    projects: contextProjects, 
    receipts: contextReceipts,
    addReceipt,
    updateReceipt,
    deleteReceipt: contextDeleteReceipt
  } = useData();
  
  // Use props if provided, otherwise use context data
  const receipts = propReceipts ?? contextReceipts ?? [];
  const customers = propCustomers ?? contextCustomers ?? [];
  const projects = propProjects ?? contextProjects ?? [];

  // Internal modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Filter and sort state
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Handlers
  const handleAddReceipt = useCallback(() => {
    if (externalOnAddReceipt) {
      externalOnAddReceipt();
    } else {
      setShowAddModal(true);
    }
  }, [externalOnAddReceipt]);

  const handleEditReceipt = useCallback((receipt: Receipt) => {
    if (externalOnEditReceipt) {
      externalOnEditReceipt(receipt);
    } else {
      setSelectedReceipt(receipt);
      setShowEditModal(true);
    }
  }, [externalOnEditReceipt]);

  const handleViewReceipt = useCallback((receipt: Receipt) => {
    if (externalOnViewReceipt) {
      externalOnViewReceipt(receipt);
    } else {
      setSelectedReceipt(receipt);
      setShowViewModal(true);
    }
  }, [externalOnViewReceipt]);

  const handlePrintReceipt = useCallback((receipt: Receipt) => {
    if (externalOnPrintReceipt) {
      externalOnPrintReceipt(receipt);
    } else {
      setSelectedReceipt(receipt);
      setShowPrintModal(true);
    }
  }, [externalOnPrintReceipt]);

  const handleDeleteReceipt = useCallback((id: string) => {
    if (externalOnDeleteReceipt) {
      externalOnDeleteReceipt(id);
    } else if (contextDeleteReceipt) {
      if (confirm('Are you sure you want to delete this receipt?')) {
        contextDeleteReceipt(id);
        showToast('Receipt deleted');
      }
    }
  }, [externalOnDeleteReceipt, contextDeleteReceipt]);

  const handleReceiptAdded = useCallback((receipt: Omit<Receipt, 'id' | 'createdAt'>) => {
    if (addReceipt) {
      addReceipt(receipt);
      showToast('Receipt added successfully');
    }
    setShowAddModal(false);
  }, [addReceipt]);

  const handleReceiptUpdated = useCallback((receipt: Receipt) => {
    if (updateReceipt) {
      updateReceipt(receipt.id, receipt);
      showToast('Receipt updated successfully');
    }
    setShowEditModal(false);
    setSelectedReceipt(null);
  }, [updateReceipt]);

  // Get eligible customers (non-brokers)
  const eligibleCustomers = useMemo(() => {
    return (customers || []).filter(c => c.type === 'customer' || c.type === 'individual' || c.type === 'both');
  }, [customers]);

  // Get projects for selected customer
  const filteredProjects = useMemo(() => {
    if (customerFilter === 'all') return projects || [];
    return (projects || []).filter(p => String(p.customerId) === String(customerFilter));
  }, [customerFilter, projects]);

  // Enhanced receipt data with computed fields
  const enrichedReceipts = useMemo(() => {
    return (receipts || []).map(receipt => {
      const customer = (customers || []).find(c => String(c.id) === String(receipt.customerId));
      const project = (projects || []).find(p => String(p.id) === String(receipt.projectId));
      
      const relatedReceipts = (receipts || [])
        .filter(r => String(r.customerId) === String(receipt.customerId) && String(r.projectId) === String(receipt.projectId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const receiptIndex = relatedReceipts.findIndex(r => r.id === receipt.id);
      const previousReceipt = receiptIndex > 0 ? relatedReceipts[receiptIndex - 1] : null;
      
      const daysSinceLastPayment = previousReceipt 
        ? Math.floor((new Date(receipt.date).getTime() - new Date(previousReceipt.date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const runningTotal = relatedReceipts
        .slice(0, receiptIndex + 1)
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      return {
        ...receipt,
        customer,
        project,
        daysSinceLastPayment,
        previousPaymentDate: previousReceipt?.date,
        previousPaymentAmount: previousReceipt?.amount,
        runningTotal,
        paymentNumber: receiptIndex + 1,
        totalPayments: relatedReceipts.length,
      };
    });
  }, [receipts, customers, projects]);

  // Filter and sort receipts
  const filteredReceipts = useMemo(() => {
    let result = enrichedReceipts.filter(receipt => {
      if (!receipt) return false;
      
      const customerName = receipt.customerName || receipt.customer?.name || '';
      const receiptNumber = receipt.receiptNumber || '';
      const projectName = receipt.projectName || '';
      const reference = receipt.reference || '';
      
      const matchesSearch = search === '' || 
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        projectName.toLowerCase().includes(search.toLowerCase()) ||
        reference.toLowerCase().includes(search.toLowerCase());
      
      const matchesMethod = methodFilter === 'all' || receipt.method === methodFilter;
      const matchesCustomer = customerFilter === 'all' || String(receipt.customerId) === String(customerFilter);
      const matchesProject = projectFilter === 'all' || String(receipt.projectId) === String(projectFilter);
      
      let matchesDateRange = true;
      if (dateRange.start) {
        matchesDateRange = new Date(receipt.date) >= new Date(dateRange.start);
      }
      if (dateRange.end && matchesDateRange) {
        matchesDateRange = new Date(receipt.date) <= new Date(dateRange.end);
      }

      return matchesSearch && matchesMethod && matchesCustomer && matchesProject && matchesDateRange;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case 'customer':
          comparison = (a.customerName || '').localeCompare(b.customerName || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enrichedReceipts, search, methodFilter, customerFilter, projectFilter, dateRange, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const thisMonth = filteredReceipts
      .filter(r => {
        const d = new Date(r.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const lastMonth = filteredReceipts
      .filter(r => {
        const d = new Date(r.date);
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    
    const byMethod = {
      cash: filteredReceipts.filter(r => r.method === 'cash').reduce((sum, r) => sum + (r.amount || 0), 0),
      bank_transfer: filteredReceipts.filter(r => r.method === 'bank_transfer').reduce((sum, r) => sum + (r.amount || 0), 0),
      cheque: filteredReceipts.filter(r => r.method === 'cheque').reduce((sum, r) => sum + (r.amount || 0), 0),
      online: filteredReceipts.filter(r => r.method === 'online').reduce((sum, r) => sum + (r.amount || 0), 0),
    };

    const avgPayment = filteredReceipts.length > 0 ? total / filteredReceipts.length : 0;

    return { total, thisMonth, lastMonth, growth, byMethod, avgPayment, count: filteredReceipts.length };
  }, [filteredReceipts]);

  // Recent payers for quick reference
  const recentPayers = useMemo(() => {
    const uniqueCustomers = new Map<string, { customerId: string; lastDate: Date; totalAmount: number }>();
    
    (receipts || []).forEach(r => {
      const existing = uniqueCustomers.get(r.customerId);
      const receiptDate = new Date(r.date);
      
      if (!existing || receiptDate > existing.lastDate) {
        uniqueCustomers.set(r.customerId, {
          customerId: r.customerId,
          lastDate: receiptDate,
          totalAmount: (existing?.totalAmount || 0) + (r.amount || 0),
        });
      } else {
        existing.totalAmount += r.amount || 0;
      }
    });

    return Array.from(uniqueCustomers.values())
      .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())
      .slice(0, 5);
  }, [receipts]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setMethodFilter('all');
    setCustomerFilter('all');
    setProjectFilter('all');
    setDateRange({ start: '', end: '' });
    setSortBy('date');
    setSortOrder('desc');
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = [
      ['Receipt #', 'Date', 'Customer', 'Project', 'Amount', 'Method', 'Reference', 'Notes'].join(','),
      ...filteredReceipts.map(r => [
        r.receiptNumber,
        formatDate(r.date),
        `"${r.customerName || ''}"`,
        `"${r.projectName || ''}"`,
        r.amount,
        methodLabels[r.method]?.label || r.method,
        r.reference || '',
        `"Payment ${r.paymentNumber}/${r.totalPayments}${r.daysSinceLastPayment ? ` - ${r.daysSinceLastPayment} days since last payment` : ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredReceipts]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <span className="text-3xl">💰</span>
            <span>Receipt Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage all customer payments across projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            type="button"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="border-slate-300 dark:border-slate-600"
          >
            {viewMode === 'table' ? '📊 Cards View' : '📋 Table View'}
          </Button>
          <Button 
            type="button"
            onClick={handleAddReceipt}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <ReceiptIcon />
            <span className="ml-2">Add Receipt</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                ₨{formatCurrency(stats.total)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.count} receipt{stats.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">
              💰
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">This Month</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mt-1">
                ₨{formatCurrency(stats.thisMonth)}
              </p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${stats.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <TrendUp />
                {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}% vs last month
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
              📈
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Avg. Payment</p>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-200 mt-1">
                ₨{formatCurrency(stats.avgPayment)}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                Per receipt
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">7-Day Activity</p>
            <PaymentActivityChart receipts={receipts} />
          </div>
        </Card>
      </div>

      {/* Method Breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Payment Methods Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(methodLabels).map(([method, config]) => (
            <div 
              key={method}
              className={`p-3 rounded-lg ${config.bgClass} border ${config.textClass}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{config.icon}</span>
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <p className="text-lg font-bold">
                ₨{formatCurrency(stats.byMethod[method as keyof typeof stats.byMethod])}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters Section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search />
              </div>
              <Input
                placeholder="Search receipts, customers, projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-slate-100 dark:bg-slate-800' : ''}
              >
                <Filter />
                <span className="ml-2">Filters</span>
                {(methodFilter !== 'all' || customerFilter !== 'all' || projectFilter !== 'all' || dateRange.start || dateRange.end) && (
                  <Badge className="ml-2 bg-emerald-500 text-white text-xs">Active</Badge>
                )}
              </Button>

              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RefreshCw />
                <span className="ml-2">Reset</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Download />
                <span className="ml-2">Export</span>
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="cheque">📝 Cheque</SelectItem>
                    <SelectItem value="online">💳 Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Customer</label>
                <Select value={customerFilter} onValueChange={(value) => {
                  setCustomerFilter(value);
                  setProjectFilter('all');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {eligibleCustomers.map(customer => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        <span className="flex items-center gap-2">
                          <User />
                          {customer.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {filteredProjects.map(project => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        <span className="flex items-center gap-2">
                          <Building />
                          {project.name} - {project.unit}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From Date</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card className="overflow-hidden">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
                  <th 
                    className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('date')}
                  >
                    Receipt / Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('customer')}
                  >
                    Customer {sortBy === 'customer' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Project</th>
                  <th 
                    className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('amount')}
                  >
                    Amount {sortBy === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Method</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Info</th>
                  <th className="text-center py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <span className="text-5xl">🧾</span>
                        <p className="font-medium">No receipts found</p>
                        <p className="text-sm">Try adjusting your filters or add a new receipt</p>
                        <Button type="button" onClick={handleAddReceipt} className="mt-2 cursor-pointer">
                          <ReceiptIcon />
                          <span className="ml-2">Add First Receipt</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((receipt, index) => (
                    <tr 
                      key={receipt.id} 
                      className={`border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-25 dark:bg-slate-900/20'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-mono font-semibold text-sm text-foreground">{receipt.receiptNumber}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar />
                            {formatDate(receipt.date)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {(receipt.customerName || receipt.customer?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-foreground">
                            {receipt.customerName || receipt.customer?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {receipt.projectName || (receipt.project ? `${receipt.project.name} - ${receipt.project.unit}` : 'N/A')}
                          </p>
                          {receipt.project && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Balance: ₨{formatCurrency((receipt.project.sale || 0) - (receipt.project.received || 0))}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ₨{formatCurrency(receipt.amount || 0)}
                        </p>
                        {receipt.runningTotal && (
                          <p className="text-xs text-muted-foreground">Total: ₨{formatCurrency(receipt.runningTotal)}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`${methodLabels[receipt.method]?.bgClass || ''} ${methodLabels[receipt.method]?.textClass || ''} border`}>
                          {methodLabels[receipt.method]?.icon || '💰'} 
                          <span className="ml-1">{methodLabels[receipt.method]?.label || receipt.method}</span>
                        </Badge>
                        {receipt.reference && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">Ref: {receipt.reference}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Payment #{receipt.paymentNumber}/{receipt.totalPayments}</p>
                          {receipt.daysSinceLastPayment !== null && (
                            <p className="text-xs flex items-center gap-1">
                              <Clock />
                              <span className={receipt.daysSinceLastPayment > 30 ? 'text-amber-600' : 'text-muted-foreground'}>
                                {receipt.daysSinceLastPayment} days since last payment
                              </span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600" onClick={() => handleViewReceipt(receipt)} title="View">
                            <Eye />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-600" onClick={() => handlePrintReceipt(receipt)} title="Print">
                            <Printer />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600" onClick={() => handleEditReceipt(receipt)} title="Edit">
                            <Pencil />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeleteReceipt(receipt.id)} title="Delete">
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            {filteredReceipts.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <span className="text-5xl">🧾</span>
                  <p className="font-medium">No receipts found</p>
                  <Button onClick={handleAddReceipt} className="mt-2">
                    <ReceiptIcon />
                    <span className="ml-2">Add First Receipt</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReceipts.map((receipt) => (
                  <Card key={receipt.id} className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono font-semibold text-sm text-foreground">{receipt.receiptNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(receipt.date)} • {getRelativeTime(receipt.date)}</p>
                      </div>
                      <Badge className={`${methodLabels[receipt.method]?.bgClass || ''} ${methodLabels[receipt.method]?.textClass || ''} border`}>
                        {methodLabels[receipt.method]?.icon}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {(receipt.customerName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{receipt.customerName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{receipt.projectName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₨{formatCurrency(receipt.amount || 0)}</p>
                        <p className="text-xs text-muted-foreground">Payment #{receipt.paymentNumber}/{receipt.totalPayments}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleViewReceipt(receipt)}><Eye /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePrintReceipt(receipt)}><Printer /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditReceipt(receipt)}><Pencil /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeleteReceipt(receipt.id)}><Trash2 /></Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Recent Payers Summary */}
      {recentPayers.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock />
            Recent Payers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPayers.slice(0, 3).map(payer => (
              <CustomerPaymentSummary
                key={payer.customerId}
                customerId={payer.customerId}
                receipts={receipts}
                customers={customers}
                projects={projects}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddReceiptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleReceiptAdded}
        customers={customers}
        projects={projects}
        receipts={receipts}
      />

      {selectedReceipt && (
        <>
          <EditReceiptModal
            open={showEditModal}
            onClose={() => { setShowEditModal(false); setSelectedReceipt(null); }}
            onSave={handleReceiptUpdated}
            receipt={selectedReceipt}
            customers={customers}
            projects={projects}
            receipts={receipts}
          />

          <ViewReceiptModal
            open={showViewModal}
            onClose={() => { setShowViewModal(false); setSelectedReceipt(null); }}
            receipt={selectedReceipt}
            customer={(customers || []).find(c => String(c.id) === String(selectedReceipt.customerId)) || null}
            project={(projects || []).find(p => String(p.id) === String(selectedReceipt.projectId)) || null}
            allReceipts={receipts}
            onEdit={() => { setShowViewModal(false); setShowEditModal(true); }}
            onPrint={() => { setShowViewModal(false); setShowPrintModal(true); }}
          />

          <PrintReceiptModal
            open={showPrintModal}
            onClose={() => { setShowPrintModal(false); setSelectedReceipt(null); }}
            receipt={selectedReceipt}
            customer={(customers || []).find(c => String(c.id) === String(selectedReceipt.customerId)) || null}
            project={(projects || []).find(p => String(p.id) === String(selectedReceipt.projectId)) || null}
          />
        </>
      )}
    </div>
  );
}

export default ReceiptsSection;