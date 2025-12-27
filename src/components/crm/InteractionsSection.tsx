import { useState, useMemo } from 'react';
import { Interaction } from '@/types/crm';
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
import { Search, MessageSquare, Download, Eye, Pencil, Trash2, Calendar } from 'lucide-react';

interface InteractionsSectionProps {
  interactions: Interaction[];
  onAddInteraction: () => void;
  onDeleteInteraction: (id: string) => void;
}

const typeLabels: Record<string, { icon: string; label: string }> = {
  call: { icon: '📞', label: 'Phone Call' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  sms: { icon: '📱', label: 'SMS' },
  email: { icon: '📧', label: 'Email' },
  meeting: { icon: '🤝', label: 'Meeting' },
  site_visit: { icon: '🏗', label: 'Site Visit' },
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-primary text-primary-foreground',
  low: 'bg-success text-success-foreground',
};

const statusColors: Record<string, string> = {
  follow_up: 'bg-warning/10 text-warning border-warning',
  no_follow_up: 'bg-muted text-muted-foreground border-muted-foreground',
  resolved: 'bg-success/10 text-success border-success',
};

export function InteractionsSection({ interactions, onAddInteraction, onDeleteInteraction }: InteractionsSectionProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInteractions = useMemo(() => {
    return interactions.filter(interaction => {
      const matchesSearch = 
        interaction.customerName.toLowerCase().includes(search.toLowerCase()) ||
        interaction.notes.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = typeFilter === 'all' || interaction.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || interaction.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [interactions, search, typeFilter, statusFilter]);

  // Lead tracking dashboard stats
  const leadStats = {
    urgent: interactions.filter(i => i.priority === 'urgent' && i.status === 'follow_up').length,
    high: interactions.filter(i => i.priority === 'high' && i.status === 'follow_up').length,
    medium: interactions.filter(i => i.priority === 'medium' && i.status === 'follow_up').length,
    low: interactions.filter(i => i.priority === 'low' && i.status === 'follow_up').length,
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Lead Tracking Dashboard */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">📊 Lead Tracking Dashboard</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-destructive/10 border-l-4 border-destructive">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Urgent</p>
            <p className="text-2xl font-bold text-destructive">{leadStats.urgent}</p>
            <p className="text-xs text-muted-foreground">Needs immediate attention</p>
          </div>
          <div className="p-4 rounded-lg bg-warning/10 border-l-4 border-warning">
            <p className="text-xs font-semibold text-warning uppercase tracking-wider">High Priority</p>
            <p className="text-2xl font-bold text-warning">{leadStats.high}</p>
            <p className="text-xs text-muted-foreground">Follow up soon</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 border-l-4 border-primary">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Medium</p>
            <p className="text-2xl font-bold text-primary">{leadStats.medium}</p>
            <p className="text-xs text-muted-foreground">Regular follow-up</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 border-l-4 border-success">
            <p className="text-xs font-semibold text-success uppercase tracking-wider">Low</p>
            <p className="text-2xl font-bold text-success">{leadStats.low}</p>
            <p className="text-xs text-muted-foreground">When time permits</p>
          </div>
        </div>
      </Card>

      {/* Interactions Table */}
      <Card className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            💬 Interaction Tracking
          </h2>
          <Button onClick={onAddInteraction} className="gradient-primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log New Interaction
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search interactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="no_follow_up">No Follow Up</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
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
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Priority</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</th>
                <th className="text-left py-4 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInteractions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No interactions found
                  </td>
                </tr>
              ) : (
                filteredInteractions.map((interaction) => (
                  <tr key={interaction.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 text-sm">
                      <div className="flex flex-col">
                        <span>{new Date(interaction.createdAt).toLocaleDateString()}</span>
                        {interaction.followUpDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Follow-up: {new Date(interaction.followUpDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium">{interaction.customerName}</td>
                    <td className="py-4 px-4 text-sm">
                      <span className="flex items-center gap-2">
                        {typeLabels[interaction.type]?.icon}
                        {typeLabels[interaction.type]?.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className={statusColors[interaction.status]}>
                        {interaction.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={priorityColors[interaction.priority]}>
                        {interaction.priority}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm max-w-xs truncate">
                      {interaction.notes}
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
                          onClick={() => onDeleteInteraction(interaction.id)}
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
