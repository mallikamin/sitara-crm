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
import { Customer, Project } from '@/types/crm';
import { toast } from 'sonner';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  customers: Customer[];
}

export function AddProjectModal({ open, onClose, onAdd, customers }: AddProjectModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    brokerId: '',
    projectName: '',
    unit: '',
    block: '',
    marlas: 0,
    ratePerMarla: 0,
    received: 0,
    overdue: 0,
    status: 'active' as 'active' | 'completed' | 'cancelled',
  });

  const customerOptions = useMemo(() => 
    customers.filter(c => c.type === 'customer' || c.type === 'both'),
    [customers]
  );

  const brokerOptions = useMemo(() => 
    customers.filter(c => c.type === 'broker' || c.type === 'both'),
    [customers]
  );

  const saleValue = formData.marlas * formData.ratePerMarla;
  const balance = saleValue - formData.received;

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedBroker = customers.find(c => c.id === formData.brokerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.projectName || !formData.unit) {
      toast.error('Please fill in all required fields');
      return;
    }

    onAdd({
      customerId: formData.customerId,
      customerName: selectedCustomer?.name || '',
      brokerId: formData.brokerId || undefined,
      brokerName: selectedBroker?.name,
      projectName: formData.projectName,
      unit: formData.unit,
      block: formData.block || undefined,
      marlas: formData.marlas,
      ratePerMarla: formData.ratePerMarla,
      saleValue,
      received: formData.received,
      balance,
      overdue: formData.overdue,
      status: formData.status,
    });

    toast.success('Project added successfully');
    setFormData({
      customerId: '',
      brokerId: '',
      projectName: '',
      unit: '',
      block: '',
      marlas: 0,
      ratePerMarla: 0,
      received: 0,
      overdue: 0,
      status: 'active',
    });
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK').format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            🏗 Add New Sale
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broker">Broker (Optional)</Label>
              <Select 
                value={formData.brokerId} 
                onValueChange={(value) => setFormData({ ...formData, brokerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Broker</SelectItem>
                  {brokerOptions.map(broker => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="e.g., Sitara Square"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block">Block (Optional)</Label>
              <Input
                id="block"
                value={formData.block}
                onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                placeholder="e.g., Block A, Tower 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit/Shop Number *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., Shop-101"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'active' | 'completed' | 'cancelled') => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marlas">Marlas *</Label>
              <Input
                id="marlas"
                type="number"
                step="0.01"
                value={formData.marlas || ''}
                onChange={(e) => setFormData({ ...formData, marlas: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ratePerMarla">Rate per Marla *</Label>
              <Input
                id="ratePerMarla"
                type="number"
                value={formData.ratePerMarla || ''}
                onChange={(e) => setFormData({ ...formData, ratePerMarla: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="received">Amount Received</Label>
              <Input
                id="received"
                type="number"
                value={formData.received || ''}
                onChange={(e) => setFormData({ ...formData, received: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overdue">Overdue Amount</Label>
              <Input
                id="overdue"
                type="number"
                value={formData.overdue || ''}
                onChange={(e) => setFormData({ ...formData, overdue: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Calculated Values */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div>
              <Label className="text-muted-foreground">Sale Value</Label>
              <p className="text-xl font-bold text-foreground">₨{formatCurrency(saleValue)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Balance</Label>
              <p className="text-xl font-bold text-primary">₨{formatCurrency(balance)}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary">
              Add Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
