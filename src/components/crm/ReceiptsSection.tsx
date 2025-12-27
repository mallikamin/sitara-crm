import { useState, useMemo } from 'react';
import { Receipt } from '@/types/crm';
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

// Simple icon components (since lucide-react might not be installed)
const Search = () => <span className="w-4 h-4">🔍</span>;
const ReceiptIcon = () => <span className="w-4 h-4">💰</span>;
const Download = () => <span className="w-4 h-4">⬇️</span>;
const Eye = () => <span className="w-4 h-4">👁️</span>;
const Pencil = () => <span className="w-4 h-4">✏️</span>;
const Trash2 = () => <span className="w-4 h-4">🗑️</span>;
const Printer = () => <span className="w-4 h-4">🖨️</span>;

interface ReceiptsSectionProps {
  receipts?: Receipt[];  // Make optional
  onAddReceipt?: () => void;
  onDeleteReceipt?: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const methodLabels: Record<string, { icon: string; label: string; color: string }> = {
  cash: { icon: '💵', label: 'Cash', color: 'bg-green-100 text-green-800 border-green-300' },
  bank_transfer: { icon: '🏦', label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  cheque: { icon: '📝', label: 'Cheque', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  online: { icon: '💳', label: 'Online', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

function ReceiptsSection({ 
  receipts = [],  // Default empty array
  onAddReceipt = () => {},  // Default empty function
  onDeleteReceipt = () => {}  // Default empty function
}: ReceiptsSectionProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredReceipts = useMemo(() => {
    if (!receipts || !Array.isArray(receipts)) {
      return [];
    }
    
    return receipts.filter(receipt => {
      if (!receipt) return false;
      
      // Safe property access with fallbacks
      const customerName = receipt.customerName || '';
      const receiptNumber = receipt.receiptNumber || '';
      const projectName = receipt.projectName || '';
      const method = receipt.method || '';
      
      const matchesSearch = 
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        projectName.toLowerCase().includes(search.toLowerCase());
      
      const matchesMethod = methodFilter === 'all' || method === methodFilter;
      
      let matchesDate = true;
      if (dateFilter && receipt.date) {
        try {
          const filterDate = new Date(dateFilter).toDateString();
          const receiptDate = new Date(receipt.date).toDateString();
          matchesDate = filterDate === receiptDate;
        } catch (error) {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [receipts, search, methodFilter, dateFilter]);

  const totalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredReceipts]);

  // Mock data for development
  const displayReceipts = filteredReceipts.length > 0 ? filteredReceipts : [
    {
      id: '1',
      receiptNumber: 'RCPT-001',
      date: '2024-01-15',
      customerName: 'ABC Corp',
      projectName: 'CRM Implementation',
      amount: 500000,
      method: 'bank_transfer',
      reference: 'TRX-123456'
    },
    {
      id: '2',
      receiptNumber: 'RCPT-002',
      date: '2024-01-10',
      customerName: 'XYZ Ltd',
      projectName: 'Website Redesign',
      amount: 250000,
      method: 'cash',
      reference: 'TRX-123457'
    },
    {
      id: '3',
      receiptNumber: 'RCPT-003',
      date: '2024-01-05',
      customerName: 'Tech Solutions',
      projectName: 'Mobile App Development',
      amount: 750000,
      method: 'online',
      reference: 'TRX-123458'
    }
  ];

  return (
    <div className="animate-fade-in">
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span>Receipt Management</span>
          </h2>
          <Button 
            onClick={onAddReceipt} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
          >
            <ReceiptIcon />
            <span className="ml-2">Add New Receipt</span>
          </Button>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Total Receipts Value</p>
              <p className="text-3xl font-bold text-green-800">₨{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {displayReceipts.length} receipt{displayReceipts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search />
            </div>
            <Input
              placeholder="Search receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[160px]"
            />

            <Button 
              variant="outline" 
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download />
              <span className="ml-2">Export</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Receipt #</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Project</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Method</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Reference</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    No receipts found. Add some receipts to get started.
                  </td>
                </tr>
              ) : (
                displayReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-mono font-medium">
                      {receipt.receiptNumber || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium">
                      {receipt.customerName || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {receipt.projectName || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-bold text-green-600">
                      ₨{formatCurrency(receipt.amount || 0)}
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={methodLabels[receipt.method || 'cash']?.color || 'bg-gray-100 text-gray-800 border-gray-300'}>
                        {methodLabels[receipt.method || 'cash']?.icon || '💰'} 
                        <span className="ml-1">{methodLabels[receipt.method || 'cash']?.label || 'Unknown'}</span>
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono">
                      {receipt.reference || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                          title="View"
                        >
                          <Eye />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                          title="Print"
                        >
                          <Printer />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => onDeleteReceipt(receipt.id || '')}
                          title="Delete"
                        >
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
      </Card>
    </div>
  );
}

export default ReceiptsSection;