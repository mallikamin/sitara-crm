import { useState, useMemo } from 'react';
import { InventoryItem } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, Download, Upload, Eye, Pencil, Trash2 } from 'lucide-react';

interface InventorySectionProps {
  inventory: InventoryItem[];
  onAddInventory: () => void;
  onDeleteInventory: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusColors: Record<string, string> = {
  available: 'bg-success/10 text-success border-success',
  reserved: 'bg-warning/10 text-warning border-warning',
  blocked: 'bg-muted text-muted-foreground border-muted-foreground',
  sold: 'bg-primary/10 text-primary border-primary',
};

const unitTypeLabels: Record<string, string> = {
  shop: '🏪 Shop',
  office: '🏢 Office',
  apartment: '🏠 Apartment',
  plot: '📍 Plot',
  warehouse: '🏭 Warehouse',
  showroom: '🪟 Showroom',
};

export function InventorySection({ inventory, onAddInventory, onDeleteInventory }: InventorySectionProps) {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const projectNames = useMemo(() => {
    return [...new Set(inventory.map(item => item.projectName))];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.unit.toLowerCase().includes(search.toLowerCase()) ||
        item.projectName.toLowerCase().includes(search.toLowerCase()) ||
        (item.block?.toLowerCase().includes(search.toLowerCase()));
      
      const matchesProject = projectFilter === 'all' || item.projectName === projectFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [inventory, search, projectFilter, statusFilter]);

  return (
    <div className="animate-fade-in">
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📦 Inventory Management
          </h2>
          <div className="flex gap-3">
            <Button onClick={onAddInventory} className="gradient-primary">
              <Package className="w-4 h-4 mr-2" />
              Add Inventory Item
            </Button>
            <Button variant="outline" className="border-success text-success hover:bg-success hover:text-success-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-xs font-semibold text-success uppercase tracking-wider">Available</p>
            <p className="text-2xl font-bold text-success">
              {inventory.filter(i => i.status === 'available').length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs font-semibold text-warning uppercase tracking-wider">Reserved</p>
            <p className="text-2xl font-bold text-warning">
              {inventory.filter(i => i.status === 'reserved').length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocked</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {inventory.filter(i => i.status === 'blocked').length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Sold</p>
            <p className="text-2xl font-bold text-primary">
              {inventory.filter(i => i.status === 'sold').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="border-success text-success hover:bg-success hover:text-success-foreground">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Project</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Block</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Marlas</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rate/Marla</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Sale Value</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Feature</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 text-sm font-mono">{item.id}</td>
                    <td className="py-4 px-4 text-sm font-medium">{item.projectName}</td>
                    <td className="py-4 px-4 text-sm">{item.block || '-'}</td>
                    <td className="py-4 px-4 text-sm font-medium">{item.unit}</td>
                    <td className="py-4 px-4 text-sm">
                      {unitTypeLabels[item.unitType] || item.unitType}
                    </td>
                    <td className="py-4 px-4 text-sm text-right">{item.marlas}</td>
                    <td className="py-4 px-4 text-sm text-right">
                      ₨{formatCurrency(item.ratePerMarla)}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-medium">
                      ₨{formatCurrency(item.saleValue)}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {item.plotFeature && (
                        <Badge variant="outline" className="text-xs">
                          {item.plotFeature}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteInventory(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
