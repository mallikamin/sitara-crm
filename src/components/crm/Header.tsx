import { Section } from '@/types/crm';
import { cn } from '@/lib/utils';
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
  Save
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
  return (
    <header className="gradient-header text-primary-foreground sticky top-0 z-50 shadow-lg border-b border-white/10">
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
            <button className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-all">
              <Save className="w-4 h-4" />
              <span className="hidden md:inline">Backup</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-all">
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
