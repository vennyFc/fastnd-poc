import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch read notification states from database
  const { data: readStates = [] } = useQuery({
    queryKey: ['notification-read-states', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data } = await supabase
        .from('user_notifications')
        .select('notification_id, read')
        .eq('user_id', user.id)
        .eq('read', true);

      return data || [];
    },
    enabled: !!user,
  });

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

  // Transform data into notifications and filter out read ones
  useEffect(() => {
    const allNotifications: Notification[] = [];
    const readNotificationIds = new Set(readStates.map(rs => rs.notification_id));

    // Add new project notifications
    newProjects.forEach((project) => {
      const id = `project-${project.id}`;
      if (!readNotificationIds.has(id)) {
        allNotifications.push({
          id,
          type: 'new_project',
          title: 'Neues Projekt',
          message: `${project.project_name} für ${project.customer} wurde erstellt`,
          link: `/projects?search=${encodeURIComponent(project.project_name)}`,
          created_at: project.created_at,
          read: false,
        });
      }
    });

    // Add new action item notifications
    newActionItems.forEach((item) => {
      const id = `action-${item.id}`;
      if (!readNotificationIds.has(id)) {
        allNotifications.push({
          id,
          type: 'new_action_item',
          title: 'Neue Aufgabe',
          message: item.title,
          created_at: item.created_at,
          read: false,
        });
      }
    });

    // Add overdue action item notifications
    overdueActionItems.forEach((item) => {
      const id = `overdue-${item.id}`;
      if (!readNotificationIds.has(id)) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        allNotifications.push({
          id,
          type: 'overdue_action_item',
          title: 'Überfällige Aufgabe',
          message: `${item.title} (${daysOverdue} ${daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig)`,
          created_at: item.due_date,
          read: false,
        });
      }
    });

    // Sort by date (most recent first)
    allNotifications.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Only update if there are actual changes to prevent infinite loops
    setNotifications(prev => {
      const prevIds = prev.map(n => n.id).join(',');
      const newIds = allNotifications.map(n => n.id).join(',');
      if (prevIds === newIds) {
        return prev;
      }
      return allNotifications;
    });
  }, [newProjects, newActionItems, overdueActionItems, readStates]);

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

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('user_notifications')
        .upsert({
          user_id: user.id,
          notification_id: notificationId,
          read: true,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,notification_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-read-states', user?.id] });
    },
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (!user) return;
      
      const records = notificationIds.map(id => ({
        user_id: user.id,
        notification_id: id,
        read: true,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('user_notifications')
        .upsert(records, {
          onConflict: 'user_id,notification_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-read-states', user?.id] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    // First mark as read for visual feedback
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    
    // Save to database
    markAsReadMutation.mutate(id);
    
    // Then remove after a short delay
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  };

  const markAllAsRead = () => {
    const notificationIds = notifications.map(n => n.id);
    
    // First mark all as read
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    
    // Save to database
    markAllAsReadMutation.mutate(notificationIds);
    
    // Then remove all after a short delay
    setTimeout(() => {
      setNotifications([]);
    }, 300);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
