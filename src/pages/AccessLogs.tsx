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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LogIn, LogOut, Eye, Activity } from 'lucide-react';

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

export default function AccessLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

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
    } finally {
      setLoading(false);
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Keine Berechtigung</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>User Access Tracking</CardTitle>
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
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Seite</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Keine Logs vorhanden
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.profiles?.full_name || 'Unbekannt'}</span>
                            <span className="text-xs text-muted-foreground">{log.profiles?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(log.event_type)} className="flex items-center gap-1 w-fit">
                            {getEventIcon(log.event_type)}
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.page_path || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.event_data ? JSON.stringify(log.event_data) : '-'}
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
