import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProjectHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addToHistory = useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) return;

      // Update or insert project view history
      const { data: existing } = await supabase
        .from('user_project_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (existing) {
        await supabase
          .from('user_project_history')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_project_history')
          .insert({ user_id: user.id, project_id: projectId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-project-history'] });
    },
  });

  return {
    addToHistory: (projectId: string) => addToHistory.mutate(projectId),
  };
}
