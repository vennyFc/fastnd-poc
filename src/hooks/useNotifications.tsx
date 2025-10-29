import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'new_project' | 'new_action_item' | 'overdue_action_item';
  title: string;
  message: string;
  link?: string;
  created_at: string;
  read: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch new projects (last 7 days)
  const { data: newProjects = [] } = useQuery({
    queryKey: ['notifications-new-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('customer_projects')
        .select('id, project_name, customer, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!user,
  });

  // Fetch new action items (last 7 days)
  const { data: newActionItems = [] } = useQuery({
    queryKey: ['notifications-new-action-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('action_items')
        .select('id, title, description, created_at, due_date, priority')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!user,
  });

  // Fetch overdue action items
  const { data: overdueActionItems = [] } = useQuery({
    queryKey: ['notifications-overdue-action-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date().toISOString();

      const { data } = await supabase
        .from('action_items')
        .select('id, title, description, due_date, priority')
        .lt('due_date', now)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(10);

      return data || [];
    },
    enabled: !!user,
  });

  // Transform data into notifications
  useEffect(() => {
    const allNotifications: Notification[] = [];

    // Add new project notifications
    newProjects.forEach((project) => {
      allNotifications.push({
        id: `project-${project.id}`,
        type: 'new_project',
        title: 'Neues Projekt',
        message: `${project.project_name} für ${project.customer} wurde erstellt`,
        link: `/projects?search=${encodeURIComponent(project.project_name)}`,
        created_at: project.created_at,
        read: false,
      });
    });

    // Add new action item notifications
    newActionItems.forEach((item) => {
      allNotifications.push({
        id: `action-${item.id}`,
        type: 'new_action_item',
        title: 'Neue Aufgabe',
        message: item.title,
        created_at: item.created_at,
        read: false,
      });
    });

    // Add overdue action item notifications
    overdueActionItems.forEach((item) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      allNotifications.push({
        id: `overdue-${item.id}`,
        type: 'overdue_action_item',
        title: 'Überfällige Aufgabe',
        message: `${item.title} (${daysOverdue} ${daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig)`,
        created_at: item.due_date,
        read: false,
      });
    });

    // Sort by date (most recent first)
    allNotifications.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(allNotifications);
  }, [newProjects, newActionItems, overdueActionItems]);

  // Set up realtime listeners for new projects and action items
  useEffect(() => {
    if (!user) return;

    const projectsChannel = supabase
      .channel('new-projects-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_projects',
        },
        (payload) => {
          console.log('New project created:', payload);
          // Refetch to update notifications
          // The query will automatically update
        }
      )
      .subscribe();

    const actionItemsChannel = supabase
      .channel('new-action-items-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'action_items',
        },
        (payload) => {
          console.log('New action item created:', payload);
          // Refetch to update notifications
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(actionItemsChannel);
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
