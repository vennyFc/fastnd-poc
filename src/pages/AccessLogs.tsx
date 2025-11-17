import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LogIn, LogOut, Eye, Activity, Download, ArrowUpDown, Filter, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface AccessLog {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'page_view' | 'action';
  event_data: any;
  page_path: string;
  user_agent: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

type SortField = 'created_at' | 'event_type' | 'email' | 'page_path';
type SortDirection = 'asc' | 'desc';

export default function AccessLogs() {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [logs, eventTypeFilter, userFilter, dateFromFilter, dateToFilter, sortField, sortDirection]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(log => log.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        // Map profiles to logs
        const logsWithProfiles = data.map(log => {
          const profile = profilesData?.find(p => p.id === log.user_id);
          return {
            ...log,
            profiles: profile ? {
              email: profile.email,
              full_name: profile.full_name || 'Unbekannt'
            } : undefined
          };
        });
        
        setLogs(logsWithProfiles);
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Error loading access logs:', error);
      toast.error('Fehler beim Laden der Access Logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...logs];

    // Apply filters
    if (eventTypeFilter !== 'all') {
      result = result.filter(log => log.event_type === eventTypeFilter);
    }

    if (userFilter) {
      result = result.filter(log => 
        log.profiles?.email?.toLowerCase().includes(userFilter.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      result = result.filter(log => new Date(log.created_at) >= fromDate);
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.created_at) <= toDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'event_type':
          aValue = a.event_type;
          bValue = b.event_type;
          break;
        case 'email':
          aValue = a.profiles?.email || '';
          bValue = b.profiles?.email || '';
          break;
        case 'page_path':
          aValue = a.page_path || '';
          bValue = b.page_path || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredLogs(result);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setEventTypeFilter('all');
    setUserFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredLogs.map(log => ({
        'Zeitstempel': format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de }),
        'Event-Typ': log.event_type,
        'Benutzer': log.profiles?.full_name || 'Unbekannt',
        'E-Mail': log.profiles?.email || '',
        'Seite': log.page_path || '',
        'User Agent': log.user_agent || '',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Zeitstempel
        { wch: 15 }, // Event-Typ
        { wch: 25 }, // Benutzer
        { wch: 30 }, // E-Mail
        { wch: 30 }, // Seite
        { wch: 40 }, // User Agent
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Access Logs');

      // Generate filename with current date
      const filename = `access-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success(`${filteredLogs.length} Einträge exportiert`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Fehler beim Excel-Export');
    }
  };


  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'logout':
        return <LogOut className="h-4 w-4" />;
      case 'page_view':
        return <Eye className="h-4 w-4" />;
      case 'action':
        return <Activity className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return 'default';
      case 'logout':
        return 'secondary';
      case 'page_view':
        return 'outline';
      case 'action':
        return 'default';
      default:
        return 'outline';
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <div 
      className="flex items-center gap-1 cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </div>
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Keine Berechtigung</p>
      </div>
    );
  }

  const hasActiveFilters = eventTypeFilter !== 'all' || userFilter || dateFromFilter || dateToFilter;

  // Calculate statistics
  const statistics = {
    total: filteredLogs.length,
    login: filteredLogs.filter(log => log.event_type === 'login').length,
    logout: filteredLogs.filter(log => log.event_type === 'logout').length,
    page_view: filteredLogs.filter(log => log.event_type === 'page_view').length,
    action: filteredLogs.filter(log => log.event_type === 'action').length,
    uniqueUsers: new Set(filteredLogs.map(log => log.user_id)).size,
  };

  const StatCard = ({ title, value, icon: Icon, variant = 'default' }: { 
    title: string; 
    value: number; 
    icon: any; 
    variant?: 'default' | 'login' | 'logout' | 'view' | 'action' 
  }) => {
    const variantStyles = {
      default: 'bg-primary/10 text-primary',
      login: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      logout: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      view: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      action: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-2">{value.toLocaleString('de-DE')}</p>
            </div>
            <div className={`p-3 rounded-full ${variantStyles[variant]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          title="Gesamt Events" 
          value={statistics.total} 
          icon={Activity}
        />
        <StatCard 
          title="Logins" 
          value={statistics.login} 
          icon={LogIn}
          variant="login"
        />
        <StatCard 
          title="Logouts" 
          value={statistics.logout} 
          icon={LogOut}
          variant="logout"
        />
        <StatCard 
          title="Seitenaufrufe" 
          value={statistics.page_view} 
          icon={Eye}
          variant="view"
        />
        <StatCard 
          title="Aktionen" 
          value={statistics.action} 
          icon={Activity}
          variant="action"
        />
        <StatCard 
          title="Unique Users" 
          value={statistics.uniqueUsers} 
          icon={Activity}
        />
      </div>

      {/* Access Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Access Tracking</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter {hasActiveFilters && `(${[eventTypeFilter !== 'all', userFilter, dateFromFilter, dateToFilter].filter(Boolean).length})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel Export
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="event-type">Event-Typ</Label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger id="event-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="page_view">Seitenaufruf</SelectItem>
                      <SelectItem value="action">Aktion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="user-filter">Benutzer</Label>
                  <Input
                    id="user-filter"
                    placeholder="Name oder E-Mail..."
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="date-from">Von Datum</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="date-to">Bis Datum</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                  />
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Filter zurücksetzen
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground mt-4">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'Eintrag' : 'Einträge'} 
            {logs.length !== filteredLogs.length && ` (von ${logs.length} gesamt)`}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortButton field="created_at">Zeitstempel</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="event_type">Event</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="email">Benutzer</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="page_path">Seite</SortButton>
                    </TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {hasActiveFilters ? 'Keine Einträge gefunden' : 'Keine Access Logs vorhanden'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(log.event_type) as any} className="flex items-center gap-1 w-fit">
                            {getEventIcon(log.event_type)}
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.profiles?.full_name || 'Unbekannt'}</div>
                            <div className="text-xs text-muted-foreground">{log.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={log.page_path}>
                          {log.page_path || '-'}
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-xs text-muted-foreground" title={log.user_agent}>
                          {log.user_agent || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
