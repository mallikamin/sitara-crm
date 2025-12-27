import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Customer, Project, Receipt } from '@/types/crm';
import { toast } from 'sonner';

interface AddReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => void;
  customers: Customer[];
  projects: Project[];
}

export function AddReceiptModal({ open, onClose, onAdd, customers, projects }: AddReceiptModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    projectId: '',
    amount: 0,
    method: 'cash' as Receipt['method'],
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });

  const customerProjects = useMemo(() => {
    if (!formData.customerId) return [];
    return projects.filter(p => p.customerId === formData.customerId);
  }, [formData.customerId, projects]);

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedProject = projects.find(p => p.id === formData.projectId);

  const generateReceiptNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${year}-${random}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.projectId || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    onAdd({
      receiptNumber: generateReceiptNumber(),
      customerId: formData.customerId,
      customerName: selectedCustomer?.name || '',
      projectId: formData.projectId,
      projectName: selectedProject ? `${selectedProject.projectName} - ${selectedProject.unit}` : '',
      amount: formData.amount,
      method: formData.method,
      reference: formData.reference || undefined,
      date: new Date(formData.date),
    });

    toast.success('Receipt added successfully');
    setFormData({
      customerId: '',
      projectId: '',
      amount: 0,
      method: 'cash',
      reference: '',
      date: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            💰 Add New Receipt
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => setFormData({ ...formData, customerId: value, projectId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.filter(c => c.type !== 'broker').map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                disabled={!formData.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.customerId ? "Select project" : "Select customer first"} />
                </SelectTrigger>
                <SelectContent>
                  {customerProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectName} - {project.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Receipt Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select 
                value={formData.method} 
                onValueChange={(value: Receipt['method']) => 
                  setFormData({ ...formData, method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                  <SelectItem value="cheque">📝 Cheque</SelectItem>
                  <SelectItem value="online">💳 Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Transaction/Cheque number"
              />
            </div>
          </div>

          {selectedProject && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="ml-2 font-bold text-foreground">
                    ₨{new Intl.NumberFormat('en-PK').format(selectedProject.balance)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Overdue:</span>
                  <span className={`ml-2 font-bold ${selectedProject.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    ₨{new Intl.NumberFormat('en-PK').format(selectedProject.overdue)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary">
              Add Receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
