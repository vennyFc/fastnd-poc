import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AccessEventType = 'login' | 'logout' | 'page_view' | 'action';

export function useAccessTracking() {
  const { user } = useAuth();
  const location = useLocation();

  // Track page views
  useEffect(() => {
    if (user) {
      trackEvent('page_view', {
        path: location.pathname,
      });
    }
  }, [location.pathname, user]);

  const trackEvent = async (
    eventType: AccessEventType,
    eventData?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase.from('user_access_logs').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData || null,
        page_path: location.pathname,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Error tracking access event:', error);
    }
  };

  return { trackEvent };
}
