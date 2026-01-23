// src/components/crm/ReportsSection.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Building2, 
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle,
  PieChart,
  BarChart,
  LineChart,
  Filter,
  Calendar,
  Eye,
  Printer,
  Share2,
  ChevronRight,
  Sparkles,
  Target,
  Award,
  Trophy
} from 'lucide-react';
import { useCRMStore } from '@/hooks/useCRMStore';
import { formatCurrency, formatDate, calculateDaysBetween } from '@/utils/formatters';

interface ReportsSectionProps {
  onGenerateReport: (type: string, config: any) => Promise<void>;
}

export function ReportsSection({ onGenerateReport }: ReportsSectionProps) {
  const { customers, projects, interactions, receipts } = useCRMStore();
  const [selectedReport, setSelectedReport] = useState<string>('financial-overview');
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const financials = calculateOverallFinancials();
    const aging = calculateAgingAnalysis();
    
    return {
      financials,
      aging,
      customerMetrics: {
        total: customers.length,
        active: customers.filter(c => c.status === 'active').length,
        highValue: customers.filter(c => {
          const customerProjects = projects.filter(p => p.customerId === c.id);
          const totalInvestment = customerProjects.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
          return totalInvestment > 10000000; // 1 crore
        }).length
      },
      recoveryMetrics: {
        collectionRate: (financials.totalReceived / financials.totalSaleValue) * 100,
        averageOverdueDays: calculateAverageOverdueDays(),
        recoveryEfficiency: calculateRecoveryEfficiency()
      }
    };
  }, [customers, projects]);

  // Calculate overall financials
  const calculateOverallFinancials = () => {
    let totalSale = 0;
    let totalReceived = 0;
    let totalReceivable = 0;
    let totalOverdue = 0;
    let futureReceivable = 0;
    
    projects.forEach(project => {
      const projectFinancials = calculateProjectFinancials(project);
      totalSale += projectFinancials.totalSale;
      totalReceived += projectFinancials.totalReceived;
      totalReceivable += projectFinancials.totalReceivable;
      totalOverdue += projectFinancials.totalOverdue;
      futureReceivable += projectFinancials.totalFuture;
    });
    
    return {
      totalSaleValue: totalSale,
      totalReceived,
      totalReceivable,
      totalOverdue,
      futureReceivable,
      percentagePaid: totalSale > 0 ? (totalReceived / totalSale) * 100 : 0
    };
  };

  // Calculate aging analysis
  const calculateAgingAnalysis = () => {
    const today = new Date();
    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days120: 0,
      over120: 0
    };
    
    projects.forEach(project => {
      if (project.installments) {
        project.installments.forEach(installment => {
          if (!installment.paid) {
            const dueDate = new Date(installment.dueDate);
            const daysOverdue = calculateDaysBetween(dueDate, today);
            const amount = installment.amount - (installment.partialPaid || 0);
            
            if (daysOverdue <= 0) {
              aging.current += amount;
            } else if (daysOverdue <= 30) {
              aging.days30 += amount;
            } else if (daysOverdue <= 60) {
              aging.days60 += amount;
            } else if (daysOverdue <= 90) {
              aging.days90 += amount;
            } else if (daysOverdue <= 120) {
              aging.days120 += amount;
            } else {
              aging.over120 += amount;
            }
          }
        });
      }
    });
    
    return aging;
  };

  // Calculate average overdue days
  const calculateAverageOverdueDays = () => {
    const today = new Date();
    let totalDays = 0;
    let count = 0;
    
    projects.forEach(project => {
      if (project.installments) {
        project.installments.forEach(installment => {
          if (!installment.paid) {
            const dueDate = new Date(installment.dueDate);
            const daysOverdue = calculateDaysBetween(dueDate, today);
            if (daysOverdue > 0) {
              totalDays += daysOverdue;
              count++;
            }
          }
        });
      }
    });
    
    return count > 0 ? Math.round(totalDays / count) : 0;
  };

  // Calculate recovery efficiency
  const calculateRecoveryEfficiency = () => {
    const today = new Date();
    const last30Days = new Date(today.setDate(today.getDate() - 30));
    
    const recentCollections = receipts.filter(r => 
      new Date(r.date) >= last30Days
    ).reduce((sum, r) => sum + r.amount, 0);
    
    const overdue30DaysAgo = calculateOverdueAmountAtDate(last30Days);
    const currentOverdue = metrics.aging.days30 + metrics.aging.days60 + metrics.aging.days90 + 
                          metrics.aging.days120 + metrics.aging.over120;
    
    if (overdue30DaysAgo === 0) return 100;
    
    const recovered = overdue30DaysAgo - currentOverdue + recentCollections;
    return Math.min(100, (recovered / overdue30DaysAgo) * 100);
  };

  const calculateOverdueAmountAtDate = (date: Date) => {
    let total = 0;
    projects.forEach(project => {
      if (project.installments) {
        project.installments.forEach(installment => {
          if (!installment.paid) {
            const dueDate = new Date(installment.dueDate);
            if (dueDate <= date) {
              total += installment.amount - (installment.partialPaid || 0);
            }
          }
        });
      }
    });
    return total;
  };

  const calculateProjectFinancials = (project: any) => {
    // Implementation from your existing code
    return {
      totalSale: project.totalPrice || 0,
      totalReceived: 0,
      totalReceivable: 0,
      totalOverdue: 0,
      totalFuture: 0
    };
  };

  // Generate comprehensive customer report
  const generateCustomerReport = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    const customerProjects = projects.filter(p => p.customerId === customerId);
    const customerInteractions = interactions.filter(i => i.customerId === customerId);
    const customerReceipts = receipts.filter(r => r.customerId === customerId);
    
    const reportData = {
      customer,
      projects: customerProjects.map(project => ({
        project,
        financials: calculateProjectFinancials(project),
        installments: project.installments || []
      })),
      interactions: customerInteractions,
      receipts: customerReceipts,
      summary: {
        totalInvested: customerProjects.reduce((sum, p) => sum + (p.totalPrice || 0), 0),
        totalRecovered: customerReceipts.reduce((sum, r) => sum + r.amount, 0),
        outstandingBalance: 0, // Calculate from installments
        averagePaymentDelay: calculateAveragePaymentDelay(customerId),
        riskScore: calculateCustomerRiskScore(customerId)
      }
    };
    
    await onGenerateReport('customer', reportData);
  };

  const calculateAveragePaymentDelay = (customerId: string) => {
    // Implementation for calculating average payment delay
    return 0;
  };

  const calculateCustomerRiskScore = (customerId: string) => {
    // Implementation for calculating risk score
    return 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Executive Summary */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Executive Reporting Dashboard</h1>
            <p className="text-slate-300">Real-time insights and comprehensive analytics for strategic decision making</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
              <Trophy className="w-3 h-3 mr-1" />
              Enterprise Edition
            </Badge>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Printer className="w-4 h-4 mr-2" />
              Print Dashboard
            </Button>
          </div>
        </div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Total Portfolio Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.financials.totalSaleValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: `${metrics.financials.percentagePaid}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.financials.percentagePaid.toFixed(1)}% Collected
              </p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Outstanding Recovery</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.financials.totalReceivable)}</p>
              </div>
              <Wallet className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {metrics.recoveryMetrics.collectionRate.toFixed(1)}% Collection Rate
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">High-Risk Exposure</p>
                <p className="text-2xl font-bold mt-1 text-rose-400">
                  {formatCurrency(metrics.financials.totalOverdue)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {metrics.recoveryMetrics.averageOverdueDays} days avg. overdue
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Recovery Efficiency</p>
                <p className="text-2xl font-bold mt-1">
                  {metrics.recoveryMetrics.recoveryEfficiency.toFixed(1)}%
                </p>
              </div>
              <Award className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Last 30 days performance
            </p>
          </div>
        </div>
      </div>

      {/* Main Reporting Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Report Selection & Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>Select report type and customize parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial-overview">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Financial Overview
                      </div>
                    </SelectItem>
                    <SelectItem value="customer-detail">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Customer Detail Report
                      </div>
                    </SelectItem>
                    <SelectItem value="aging-analysis">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Aging Analysis
                      </div>
                    </SelectItem>
                    <SelectItem value="project-performance">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Project Performance
                      </div>
                    </SelectItem>
                    <SelectItem value="recovery-tracking">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Recovery Tracking
                      </div>
                    </SelectItem>
                    <SelectItem value="broker-performance">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Broker Performance
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {selectedReport === 'customer-detail' && (
                <div className="space-y-2">
                  <Label>Select Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center justify-between">
                            <span>{customer.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {customer.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    date={dateRange.start}
                    onSelect={(date) => setDateRange({ ...dateRange, start: date })}
                  />
                  <DatePicker
                    date={dateRange.end}
                    onSelect={(date) => setDateRange({ ...dateRange, end: date })}
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={() => selectedReport === 'customer-detail' && selectedCustomer 
                    ? generateCustomerReport(selectedCustomer)
                    : onGenerateReport(selectedReport, { dateRange })
                  }
                  disabled={selectedReport === 'customer-detail' && !selectedCustomer}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="w-4 h-4 mr-2" />
                Preview Current Dashboard
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Share2 className="w-4 h-4 mr-2" />
                Share with Stakeholders
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Report Preview & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aging Analysis Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Aging Analysis
                </CardTitle>
                <Badge variant={metrics.financials.totalOverdue > 0 ? "destructive" : "default"}>
                  {metrics.financials.totalOverdue > 0 ? "Attention Required" : "Healthy"}
                </Badge>
              </div>
              <CardDescription>Receivables breakdown by aging period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.aging).map(([period, amount]) => (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{period.replace('days', 'Days ')}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-700 rounded-full" 
                        style={{ 
                          width: `${(amount / metrics.financials.totalReceivable) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Recovery Priority</p>
                    <p className="text-lg font-bold mt-1">
                      {Object.entries(metrics.aging)
                        .filter(([_, amount]) => amount > 0)
                        .map(([period]) => period.replace('days', 'Days '))
                        .join(', ') || 'None'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">Immediate Focus</p>
                    <p className="text-lg font-bold mt-1 text-rose-600">
                      {formatCurrency(metrics.aging.over120)}
                    </p>
                    <p className="text-xs text-slate-500">120+ Days Overdue</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Customer Portfolio Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Portfolio Overview
              </CardTitle>
              <CardDescription>Top customers by investment and risk profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.slice(0, 5).map(customer => {
                  const customerProjects = projects.filter(p => p.customerId === customer.id);
                  const totalInvestment = customerProjects.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                  const riskScore = calculateCustomerRiskScore(customer.id);
                  
                  return (
                    <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                          ${riskScore > 70 ? 'bg-rose-100 text-rose-600' : 
                            riskScore > 40 ? 'bg-amber-100 text-amber-600' : 
                            'bg-emerald-100 text-emerald-600'}`}>
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-slate-600">
                            {customerProjects.length} projects • {formatCurrency(totalInvestment)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full
                            ${riskScore > 70 ? 'bg-rose-500' : 
                              riskScore > 40 ? 'bg-amber-500' : 
                              'bg-emerald-500'}`}
                          />
                          <span className="text-sm font-medium">Risk: {riskScore}/100</span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedReport('customer-detail');
                            setSelectedCustomer(customer.id);
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                <Button variant="outline" className="w-full">
                  View Complete Customer Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Detailed Analytics Tabs */}
      <Card>
        <Tabs defaultValue="financial" className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Advanced Analytics</CardTitle>
              <TabsList>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Financial
                </TabsTrigger>
                <TabsTrigger value="recovery" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Recovery
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  Performance
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <CardContent>
            <TabsContent value="financial" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-600">Collection Efficiency</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-2xl font-bold">
                      {metrics.recoveryMetrics.collectionRate.toFixed(1)}%
                    </p>
                    <div className={`px-2 py-1 rounded text-xs
                      ${metrics.recoveryMetrics.collectionRate > 80 ? 'bg-emerald-100 text-emerald-700' :
                        metrics.recoveryMetrics.collectionRate > 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'}`}>
                      {metrics.recoveryMetrics.collectionRate > 80 ? 'Excellent' :
                       metrics.recoveryMetrics.collectionRate > 60 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-600">Average Payment Cycle</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-2xl font-bold">{metrics.recoveryMetrics.averageOverdueDays} days</p>
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-slate-600">Portfolio Health Score</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-2xl font-bold">
                      {Math.round(100 - (metrics.financials.totalOverdue / metrics.financials.totalReceivable * 100))}/100
                    </p>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recovery" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <h4 className="font-medium mb-2">Recovery Strategy Insights</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Immediate Action Required</span>
                    <Badge variant="destructive">{formatCurrency(metrics.aging.over120)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Follow-up Needed</span>
                    <Badge variant="outline">{formatCurrency(metrics.aging.days90)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Standard Collections</span>
                    <Badge variant="secondary">{formatCurrency(metrics.aging.days30)}</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-4">Project Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  {projects.slice(0, 4).map(project => {
                    const financials = calculateProjectFinancials(project);
                    return (
                      <div key={project.id} className="p-3 border rounded">
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-slate-600 mb-2">{project.unit}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Collection:</span>
                            <span>{((financials.totalReceived / financials.totalSale) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(financials.totalReceived / financials.totalSale) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}