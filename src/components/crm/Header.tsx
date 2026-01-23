import { useState, useRef } from 'react';
import { Section } from '@/types/crm';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContextAPI';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  MessageSquare, 
  Receipt, 
  BarChart3,
  Download,
  Upload,
  Save,
  Database,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface HeaderProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
  { id: 'projects', label: 'Sales Transactions', icon: <Building2 className="w-4 h-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  { id: 'interactions', label: 'Interactions', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'receipts', label: 'Receipts', icon: <Receipt className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
];

export function Header({ activeSection, onSectionChange }: HeaderProps) {
  const { 
    exportToFile, 
    importBackup, 
    createManualBackup, 
    saveStatus,
    lastSaved,
    customers,
    projects,
    receipts,
    inventory
  } = useData();

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle Export
  const handleExport = () => {
    setIsProcessing('export');
    try {
      const result = exportToFile();
      if (result.success) {
        showNotification(`✓ Exported to ${result.filename}`, 'success');
      } else {
        showNotification('Export failed', 'error');
      }
    } catch (error) {
      showNotification('Export failed: ' + (error as Error).message, 'error');
    }
    setTimeout(() => setIsProcessing(null), 500);
  };

  // Handle Backup
  const handleBackup = () => {
    setIsProcessing('backup');
    try {
      const result = createManualBackup();
      if (result.success) {
        showNotification('✓ Backup created successfully!', 'success');
      } else {
        showNotification('Backup failed: ' + result.error, 'error');
      }
    } catch (error) {
      showNotification('Backup failed: ' + (error as Error).message, 'error');
    }
    setTimeout(() => setIsProcessing(null), 500);
  };

  // Handle Import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Confirm before import
    const confirmMsg = `Import data from "${file.name}"?\n\nThis will replace your current data:\n• ${customers.length} customers\n• ${projects.length} transactions\n• ${receipts.length} receipts\n• ${inventory.length} inventory items\n\nA backup will be created automatically before import.`;
    
    if (!window.confirm(confirmMsg)) {
      event.target.value = '';
      return;
    }

    setIsProcessing('import');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const result = importBackup(e.target?.result as string);
        if (result.success) {
          const stats = result.stats || {};
          let msg = `✓ Imported: ${stats.customers || 0} customers, ${stats.projects || 0} transactions, ${stats.receipts || 0} receipts`;
          if (result.warnings && result.warnings.length > 0) {
            msg += ` (${result.warnings.length} warnings)`;
          }
          showNotification(msg, 'success');
        } else {
          const errorMsg = result.errors?.join(', ') || result.error || 'Unknown error';
          showNotification('Import failed: ' + errorMsg, 'error');
        }
      } catch (error) {
        showNotification('Import failed: ' + (error as Error).message, 'error');
      }
      setIsProcessing(null);
    };

    reader.onerror = () => {
      showNotification('Failed to read file', 'error');
      setIsProcessing(null);
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const date = new Date(lastSaved);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <header className="gradient-header text-primary-foreground sticky top-0 z-50 shadow-lg border-b border-white/10">
      {/* Notification Toast */}
      {notification && (
        <div 
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2",
            notification.type === 'success' 
              ? "bg-emerald-500 text-white" 
              : "bg-red-500 text-white"
          )}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {notification.message}
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏢</div>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
                Sitara Builders
              </h1>
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
                Enterprise Recovery CRM
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "border border-white/10 hover:border-white/20",
                  activeSection === item.id
                    ? "gradient-primary text-white shadow-lg shadow-primary/30"
                    : "bg-white/5 text-gray-200 hover:bg-white/10 hover:-translate-y-0.5"
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
              {saveStatus === 'saving' ? (
                <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
              ) : saveStatus === 'saved' ? (
                <Database className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-400" />
              )}
              <span>{formatLastSaved()}</span>
            </div>

            {/* Export Button */}
            <button 
              onClick={handleExport}
              disabled={isProcessing !== null}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Export data to JSON file"
            >
              {isProcessing === 'export' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Export</span>
            </button>

            {/* Backup Button */}
            <button 
              onClick={handleBackup}
              disabled={isProcessing !== null}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Create a backup"
            >
              {isProcessing === 'backup' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Backup</span>
            </button>

            {/* Import Button */}
            <button 
              onClick={handleImportClick}
              disabled={isProcessing !== null}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Import data from JSON file"
            >
              {isProcessing === 'import' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Import</span>
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
}