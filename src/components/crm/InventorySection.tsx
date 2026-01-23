import { useState, useMemo } from 'react';
import { InventoryItem } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ImportInventoryModal from '@/components/modals/ImportInventoryModal';
import { useCRMStore } from "../../store/useCRMStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';



console.log('InventorySection props:', {
  inventoryLength: inventory.length,
  onAddInventory: typeof onAddInventory,
  onImportInventory: typeof onImportInventory,
  onDeleteInventory: typeof onDeleteInventory
});






function ParentComponent() {
  const { 
    db, 
    addInventory, 
    deleteInventory,
    bulkImportInventory // Use this for Excel import
  } = useCRMStore();
  
  return (
    <InventorySection
      inventory={db.inventory}
      onAddInventory={() => addInventory({
        // Your inventory data here
      })}
      onDeleteInventory={deleteInventory}
      onImportInventory={bulkImportInventory} // Pass the import function
    />
  );
}







import { Search, Package, Download, Upload, Eye, Pencil, Trash2 } from 'lucide-react';

interface InventorySectionProps {
  inventory: InventoryItem[];
  onAddInventory: () => void;
  onDeleteInventory: (id: string) => void;
  onImportInventory?: (items: Partial<InventoryItem>[]) => void; // Add this prop
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
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
  Residential: '🏠 Residential',
  Commercial: '🏢 Commercial', 
  Apartment: '🏘️ Apartment',
  Other: '📍 Other',
  // Keep backward compatibility
  shop: '🏪 Shop',
  office: '🏢 Office',
  apartment: '🏠 Apartment',
  plot: '📍 Plot',
  warehouse: '🏭 Warehouse',
  showroom: '🪟 Showroom',
};

export function InventorySection({ 
  inventory, 
  onAddInventory, 
  onDeleteInventory,
  onImportInventory 
}: InventorySectionProps) {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importModalOpen, setImportModalOpen] = useState(false); // State for modal

  const projectNames = useMemo(() => {
    return ['all', ...new Set(inventory.map(item => item.projectName))];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.unitShopNumber?.toLowerCase().includes(search.toLowerCase()) ||
        item.projectName?.toLowerCase().includes(search.toLowerCase()) ||
        item.block?.toLowerCase().includes(search.toLowerCase()) ||
        item.unit?.toLowerCase().includes(search.toLowerCase()); // Keep backward compatibility
      
      const matchesProject = projectFilter === 'all' || item.projectName === projectFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [inventory, search, projectFilter, statusFilter]);

  const handleExport = () => {
    // Export functionality
    const exportData = filteredInventory.map(item => ({
      'Project Name': item.projectName,
      'Block': item.block,
      'Unit/Shop#': item.unitShopNumber || item.unit,
      'Unit Type': item.unitType,
      'Marlas': item.marlas || '',
      'Rate per Marla': item.ratePerMarla || '',
      'Total Value': item.totalValue || item.saleValue,
      'Plot Features': item.plotFeatures?.join(', ') || item.plotFeature,
      'Status': item.status
    }));

    const csv = convertToCSV(exportData);
    downloadCSV(csv, 'inventory-export.csv');
  };

  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0] || {});
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📦 Inventory Management
          </h2>
          <div className="flex gap-3">
  
          
          // In InventorySection.tsx, add this right after the header:
<button 
  onClick={() => {
    alert('Button clicked!');
    console.log('Direct button click in InventorySection');
  }}
  style={{
    background: 'red',
    color: 'white',
    padding: '10px',
    margin: '10px'
  }}
>
  TEST BUTTON - CLICK ME
</button>
          
          
          
          <Button 
  onClick={() => {
  console.log('Add Inventory button clicked');
    if (onAddInventory && typeof onAddInventory === 'function') {
      console.log('Calling onAddInventory function');
      onAddInventory();
    } else {
      console.error('onAddInventory is not a function or is undefined');
      console.log('onAddInventory value:', onAddInventory);
    }
  }} 
  className="gradient-primary"
>
  <Package className="w-4 h-4 mr-2" />
  Add Inventory Item
</Button>


           <Button 
  onClick={() => {
    console.log('Bulk Import button clicked');
    if (onImportInventory && typeof onImportInventory === 'function') {
      console.log('Opening import modal');
      setImportModalOpen(true);
    } else {
      console.error('onImportInventory is not a function or is undefined');
      console.log('onImportInventory value:', onImportInventory);
    }
  }}
  variant="outline" 
  className="border-success text-success hover:bg-success hover:text-success-foreground"
>
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
              placeholder="Search by project, block, or unit..."
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
                {projectNames.map(name => (
                  <SelectItem key={name} value={name}>
                    {name === 'all' ? 'All Projects' : name}
                  </SelectItem>
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

            <Button 
              variant="outline" 
              className="border-success text-success hover:bg-success hover:text-success-foreground"
              onClick={handleExport}
            >
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
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit/Shop#</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Marlas</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Rate/Marla</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Features</th>
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
                filteredInventory.map((item) => {
                  const displayValue = item.totalValue || item.saleValue || 0;
                  const unitShop = item.unitShopNumber || item.unit;
                  
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 text-sm font-mono">{item.id.slice(0, 8)}...</td>
                      <td className="py-4 px-4 text-sm font-medium">{item.projectName}</td>
                      <td className="py-4 px-4 text-sm">{item.block || '-'}</td>
                      <td className="py-4 px-4 text-sm font-medium">{unitShop}</td>
                      <td className="py-4 px-4 text-sm">
                        {unitTypeLabels[item.unitType] || item.unitType}
                      </td>
                      <td className="py-4 px-4 text-sm text-right">{item.marlas || '-'}</td>
                      <td className="py-4 px-4 text-sm text-right">
                        {item.ratePerMarla ? formatCurrency(item.ratePerMarla) : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-right font-medium">
                        {formatCurrency(displayValue)}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(item.plotFeatures || (item.plotFeature ? [item.plotFeature] : [])).map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import Modal */}
      <ImportInventoryModal 
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={onImportInventory}
      />
    </div>
  );
}