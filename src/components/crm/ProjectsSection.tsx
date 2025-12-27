import { useState, useMemo } from 'react';
import { Project } from '@/types/crm';
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
import { Search, Building2, Download, Eye, Pencil, Trash2 } from 'lucide-react';

interface ProjectsSectionProps {
  projects: Project[];
  onAddProject: () => void;
  onDeleteProject: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectsSection({ projects, onAddProject, onDeleteProject }: ProjectsSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = 
        project.customerName.toLowerCase().includes(search.toLowerCase()) ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.unit.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="animate-fade-in">
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🏗 Sales Transactions
          </h2>
          <Button onClick={onAddProject} className="gradient-primary">
            <Building2 className="w-4 h-4 mr-2" />
            Add New Sale
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Broker</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Project</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Sale Value</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Received</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Balance</th>
                <th className="text-right py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Overdue</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    No projects found
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 text-sm font-mono">{project.id}</td>
                    <td className="py-4 px-4 text-sm font-medium">{project.customerName}</td>
                    <td className="py-4 px-4 text-sm">{project.brokerName || '-'}</td>
                    <td className="py-4 px-4 text-sm">{project.projectName}</td>
                    <td className="py-4 px-4 text-sm">
                      {project.block && `${project.block} - `}{project.unit}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-medium">
                      ₨{formatCurrency(project.saleValue)}
                    </td>
                    <td className="py-4 px-4 text-sm text-right text-success font-medium">
                      ₨{formatCurrency(project.received)}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-medium">
                      ₨{formatCurrency(project.balance)}
                    </td>
                    <td className="py-4 px-4 text-sm text-right">
                      {project.overdue > 0 ? (
                        <span className="text-destructive font-semibold">
                          ₨{formatCurrency(project.overdue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                          onClick={() => onDeleteProject(project.id)}
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
