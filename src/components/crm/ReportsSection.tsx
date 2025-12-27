import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Building2, 
  Wallet,
  Download,
  Calendar,
  FileText
} from 'lucide-react';

interface ReportsSectionProps {
  stats: {
    totalCustomers: number;
    totalBrokers: number;
    activeProjects: number;
    totalSaleValue: number;
    totalReceived: number;
    totalReceivable: number;
    totalOverdue: number;
    futureReceivable: number;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ReportsSection({ stats }: ReportsSectionProps) {
  const reportTypes = [
    {
      title: 'Sales Summary Report',
      description: 'Complete overview of all sales transactions, revenue, and balances',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'bg-primary/10 text-primary border-primary/20',
    },
    {
      title: 'Customer Report',
      description: 'Detailed customer information with their projects and payment history',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-success/10 text-success border-success/20',
    },
    {
      title: 'Recovery Status Report',
      description: 'Outstanding amounts, overdue payments, and collection status',
      icon: <Wallet className="w-8 h-8" />,
      color: 'bg-warning/10 text-warning border-warning/20',
    },
    {
      title: 'Inventory Report',
      description: 'Available, sold, and reserved inventory across all projects',
      icon: <Building2 className="w-8 h-8" />,
      color: 'bg-accent text-accent-foreground border-accent',
    },
    {
      title: 'Broker Commission Report',
      description: 'Broker-wise sales and commission calculations',
      icon: <PieChart className="w-8 h-8" />,
      color: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
    },
    {
      title: 'Monthly Collection Report',
      description: 'Month-wise collection summary with trends',
      icon: <Calendar className="w-8 h-8" />,
      color: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sale Value</p>
              <p className="text-3xl font-bold text-primary">₨{formatCurrency(stats.totalSaleValue)}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary/20" />
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              <p className="text-3xl font-bold text-success">₨{formatCurrency(stats.totalReceived)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.totalReceived / stats.totalSaleValue) * 100).toFixed(1)}% of total
              </p>
            </div>
            <Wallet className="w-12 h-12 text-success/20" />
          </div>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
              <p className="text-3xl font-bold text-destructive">₨{formatCurrency(stats.totalOverdue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Requires immediate attention
              </p>
            </div>
            <FileText className="w-12 h-12 text-destructive/20" />
          </div>
        </Card>
      </div>

      {/* Report Types */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📈 Generate Reports
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report, index) => (
            <div 
              key={index}
              className={`p-6 rounded-xl border-2 ${report.color} hover:shadow-md transition-all cursor-pointer group`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-card">
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {report.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full group-hover:bg-card"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">📊 Quick Statistics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-2xl font-bold">{stats.activeProjects}</p>
            <p className="text-sm text-muted-foreground">Active Projects</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-warning/10 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
            <p className="text-2xl font-bold">{stats.totalBrokers}</p>
            <p className="text-sm text-muted-foreground">Active Brokers</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-2xl font-bold">₨{formatCurrency(stats.totalReceivable)}</p>
            <p className="text-sm text-muted-foreground">Total Receivable</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
