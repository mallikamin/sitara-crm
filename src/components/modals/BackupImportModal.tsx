import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
import { useCRMStore } from '../../store/useCRMStore';

// Simple toast notification helper
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window !== 'undefined') {
    const toastEl = document.createElement('div');
    toastEl.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};

interface BackupImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ImportStats {
  customers: { imported: number; skipped: number };
  projects: { imported: number; skipped: number };
  receipts: { imported: number; skipped: number };
  interactions: { imported: number; skipped: number };
  inventory: { imported: number; skipped: number };
}

// Field definitions for filtering imported data
const ENTITY_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  customers: {
    required: ['id', 'name', 'type', 'status', 'createdAt'],
    optional: ['cnic', 'phone', 'email', 'company', 'address', 'updatedAt'],
  },
  projects: {
    required: ['id', 'customerId', 'name', 'unit', 'sale', 'received', 'status', 'createdAt'],
    optional: ['brokerId', 'marlas', 'rate', 'cycle', 'notes', 'installments', 'updatedAt'],
  },
  receipts: {
    required: ['id', 'customerId', 'projectId', 'amount', 'date', 'method', 'createdAt'],
    optional: ['installmentId', 'reference', 'notes', 'receiptNumber', 'customerName', 'projectName', 'updatedAt'],
  },
  interactions: {
    required: ['id', 'contactType', 'type', 'status', 'priority', 'date', 'createdAt'],
    optional: ['customerId', 'brokerId', 'notes', 'nextFollowUp', 'updatedAt'],
  },
  inventory: {
    required: ['id', 'projectName', 'status', 'createdAt'],
    optional: ['block', 'unitShopNumber', 'unit', 'unitType', 'marlas', 'ratePerMarla', 'totalValue', 'saleValue', 'plotFeatures', 'plotFeature', 'transactionId', 'updatedAt'],
  },
};

function filterEntityFields<T extends Record<string, any>>(
  entity: T,
  entityType: keyof typeof ENTITY_FIELDS
): T | null {
  const fieldDef = ENTITY_FIELDS[entityType];
  if (!fieldDef) return entity;

  // Check required fields
  const hasAllRequired = fieldDef.required.every(field => entity[field] !== undefined);
  if (!hasAllRequired) {
    return null;
  }

  // Build filtered entity with only known fields
  const allFields = [...fieldDef.required, ...fieldDef.optional];
  const filtered: Record<string, any> = {};

  allFields.forEach(field => {
    if (entity[field] !== undefined) {
      filtered[field] = entity[field];
    }
  });

  // Preserve nested objects like installments
  if (entityType === 'projects' && entity.installments) {
    filtered.installments = entity.installments;
  }

  return filtered as T;
}

function generateReceiptNumber(dateStr: string, index: number): string {
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `RCP-${year}${month}-${(index + 1).toString().padStart(4, '0')}`;
  } catch {
    return `RCP-${Date.now()}-${index + 1}`;
  }
}

export function BackupImportModal({ open, onClose }: BackupImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'import' | 'export' | 'view'>('view');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  const store = useCRMStore();
  const { customers, projects, receipts, interactions, inventory } = store;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setPreviewData(data);
      setMode('import');
    } catch (error) {
      showToast('Invalid JSON file', 'error');
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;
    
    setImporting(true);
    const stats: ImportStats = {
      customers: { imported: 0, skipped: 0 },
      projects: { imported: 0, skipped: 0 },
      receipts: { imported: 0, skipped: 0 },
      interactions: { imported: 0, skipped: 0 },
      inventory: { imported: 0, skipped: 0 },
    };

    try {
      // Get existing data for merge mode
      const existingData = importMode === 'merge' ? {
        customers: new Set(customers.map(c => c.id)),
        projects: new Set(projects.map(p => p.id)),
        receipts: new Set(receipts.map(r => r.id)),
        interactions: new Set(interactions.map(i => i.id)),
        inventory: new Set(inventory.map(i => i.id)),
      } : {
        customers: new Set<string>(),
        projects: new Set<string>(),
        receipts: new Set<string>(),
        interactions: new Set<string>(),
        inventory: new Set<string>(),
      };

      // Process customers
      const importedCustomers = importMode === 'merge' ? [...customers] : [];
      (previewData.customers || []).forEach((c: any) => {
        const filtered = filterEntityFields(c, 'customers');
        if (filtered) {
          if (existingData.customers.has(filtered.id) && importMode === 'merge') {
            // Update existing
            const idx = importedCustomers.findIndex(ec => ec.id === filtered.id);
            if (idx >= 0) importedCustomers[idx] = filtered;
            stats.customers.imported++;
          } else if (!existingData.customers.has(filtered.id)) {
            importedCustomers.push(filtered);
            stats.customers.imported++;
          } else {
            stats.customers.skipped++;
          }
        } else {
          stats.customers.skipped++;
        }
      });

      // Process projects
      const importedProjects = importMode === 'merge' ? [...projects] : [];
      (previewData.projects || []).forEach((p: any) => {
        const filtered = filterEntityFields(p, 'projects');
        if (filtered) {
          if (existingData.projects.has(filtered.id) && importMode === 'merge') {
            const idx = importedProjects.findIndex(ep => ep.id === filtered.id);
            if (idx >= 0) importedProjects[idx] = filtered;
            stats.projects.imported++;
          } else if (!existingData.projects.has(filtered.id)) {
            importedProjects.push(filtered);
            stats.projects.imported++;
          } else {
            stats.projects.skipped++;
          }
        } else {
          stats.projects.skipped++;
        }
      });

      // Process receipts with enrichment
      let importedReceipts = importMode === 'merge' ? [...receipts] : [];
      (previewData.receipts || []).forEach((r: any, idx: number) => {
        const filtered = filterEntityFields(r, 'receipts');
        if (filtered) {
          // Enrich with denormalized data
          const customer = importedCustomers.find(c => c.id === filtered.customerId);
          const project = importedProjects.find(p => p.id === filtered.projectId);
          
          const enriched = {
            ...filtered,
            customerName: filtered.customerName || customer?.name || '',
            projectName: filtered.projectName || (project ? `${project.name} - ${project.unit}` : ''),
            receiptNumber: filtered.receiptNumber || generateReceiptNumber(filtered.createdAt || filtered.date, idx),
          };

          if (existingData.receipts.has(filtered.id) && importMode === 'merge') {
            const existingIdx = importedReceipts.findIndex(er => er.id === filtered.id);
            if (existingIdx >= 0) importedReceipts[existingIdx] = enriched;
            stats.receipts.imported++;
          } else if (!existingData.receipts.has(filtered.id)) {
            importedReceipts.push(enriched);
            stats.receipts.imported++;
          } else {
            stats.receipts.skipped++;
          }
        } else {
          stats.receipts.skipped++;
        }
      });

      // Process interactions
      const importedInteractions = importMode === 'merge' ? [...interactions] : [];
      (previewData.interactions || []).forEach((i: any) => {
        const filtered = filterEntityFields(i, 'interactions');
        if (filtered) {
          if (existingData.interactions.has(filtered.id) && importMode === 'merge') {
            const idx = importedInteractions.findIndex(ei => ei.id === filtered.id);
            if (idx >= 0) importedInteractions[idx] = filtered;
            stats.interactions.imported++;
          } else if (!existingData.interactions.has(filtered.id)) {
            importedInteractions.push(filtered);
            stats.interactions.imported++;
          } else {
            stats.interactions.skipped++;
          }
        } else {
          stats.interactions.skipped++;
        }
      });

      // Process inventory
      const importedInventory = importMode === 'merge' ? [...inventory] : [];
      (previewData.inventory || []).forEach((i: any) => {
        const filtered = filterEntityFields(i, 'inventory');
        if (filtered) {
          if (existingData.inventory.has(filtered.id) && importMode === 'merge') {
            const idx = importedInventory.findIndex(ei => ei.id === filtered.id);
            if (idx >= 0) importedInventory[idx] = filtered;
            stats.inventory.imported++;
          } else if (!existingData.inventory.has(filtered.id)) {
            importedInventory.push(filtered);
            stats.inventory.imported++;
          } else {
            stats.inventory.skipped++;
          }
        } else {
          stats.inventory.skipped++;
        }
      });

      // Import into store
      store.importData({
        customers: importedCustomers,
        projects: importedProjects,
        receipts: importedReceipts,
        interactions: importedInteractions,
        inventory: importedInventory,
        settings: previewData.settings || store.settings,
      });

      setImportStats(stats);
      showToast('Data imported successfully!');
    } catch (error) {
      showToast(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const data = {
      version: '3.1',
      customers,
      projects,
      receipts,
      interactions,
      inventory,
      masterProjects: store.masterProjects,
      settings: store.settings,
      exportDate: new Date().toISOString(),
      lastUpdated: store.lastUpdated,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitara_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Backup exported successfully!');
  };

  const resetModal = () => {
    setMode('view');
    setSelectedFile(null);
    setPreviewData(null);
    setImportStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">💾</span>
            Backup & Import
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Data Stats */}
          <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-sm mb-3 text-foreground">Current Data</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Customers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-600">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{receipts.length}</p>
                <p className="text-xs text-muted-foreground">Receipts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{interactions.length}</p>
                <p className="text-xs text-muted-foreground">Interactions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pink-600">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">Inventory</p>
              </div>
            </div>
          </Card>

          {mode === 'view' && (
            <>
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-2 border-transparent hover:border-blue-300"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">📥</span>
                    <h4 className="font-semibold">Import Backup</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Load data from a JSON backup file
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </Card>

                <Card 
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-2 border-transparent hover:border-emerald-300"
                  onClick={handleExport}
                >
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">📤</span>
                    <h4 className="font-semibold">Export Backup</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Download current data as JSON
                    </p>
                  </div>
                </Card>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>💡 Tip:</strong> Export backups regularly. The import process automatically filters and validates data, making it compatible even with older backup formats.
                </p>
              </div>
            </>
          )}

          {mode === 'import' && previewData && (
            <>
              {/* File Info */}
              <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="font-medium">{selectedFile?.name}</span>
                  </div>
                  <Badge variant="outline">
                    v{previewData.version || '?'}
                  </Badge>
                </div>
              </Card>

              {/* Import Preview */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3">Data to Import</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{previewData.customers?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Customers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600">{previewData.projects?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{previewData.receipts?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Receipts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{previewData.interactions?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Interactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-600">{previewData.inventory?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Inventory</p>
                  </div>
                </div>
              </Card>

              {/* Import Mode Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Import Mode</label>
                <Select value={importMode} onValueChange={(v: 'replace' | 'merge') => setImportMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">
                      <div className="flex items-center gap-2">
                        <span>🔄</span>
                        <span>Replace All - Clear existing data and import new</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="merge">
                      <div className="flex items-center gap-2">
                        <span>🔀</span>
                        <span>Merge - Keep existing, add new, update matching IDs</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {importMode === 'replace' && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>⚠️ Warning:</strong> Replace mode will delete all current data before importing. Consider exporting a backup first.
                  </p>
                </div>
              )}

              {/* Import Stats (after import) */}
              {importStats && (
                <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-semibold mb-3 text-emerald-800 dark:text-emerald-200">
                    ✅ Import Complete
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Customers:</span>
                      <span>{importStats.customers.imported} imported, {importStats.customers.skipped} skipped</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projects:</span>
                      <span>{importStats.projects.imported} imported, {importStats.projects.skipped} skipped</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receipts:</span>
                      <span>{importStats.receipts.imported} imported, {importStats.receipts.skipped} skipped</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interactions:</span>
                      <span>{importStats.interactions.imported} imported, {importStats.interactions.skipped} skipped</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inventory:</span>
                      <span>{importStats.inventory.imported} imported, {importStats.inventory.skipped} skipped</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-border">
          {mode === 'view' && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
          
          {mode === 'import' && !importStats && (
            <>
              <Button variant="outline" onClick={resetModal}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importing}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {importing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📥</span>
                    Import Data
                  </>
                )}
              </Button>
            </>
          )}

          {mode === 'import' && importStats && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BackupImportModal;