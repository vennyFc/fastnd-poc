import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type EntityType = 'project' | 'product' | 'collection' | 'customer';

export function useFavorites(entityType: EntityType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's favorites for this entity type
  const { data: favorites = [] } = useQuery({
    queryKey: ['user-favorites', user?.id, entityType],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_favorites')
        .select('entity_id')
        .eq('user_id', user.id)
        .eq('entity_type', entityType);
      return data?.map(f => f.entity_id) || [];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (entityId: string) => {
      if (!user) return;
      await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites', user?.id, entityType] });
      toast.success('Zu Favoriten hinzugefügt');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (entityId: string) => {
      if (!user) return;
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites', user?.id, entityType] });
      toast.success('Aus Favoriten entfernt');
    },
  });

  const toggleFavorite = (entityId: string) => {
    if (favorites.includes(entityId)) {
      removeFavorite.mutate(entityId);
    } else {
      addFavorite.mutate(entityId);
    }
  };

  const isFavorite = (entityId: string) => favorites.includes(entityId);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    addFavorite: (entityId: string) => addFavorite.mutate(entityId),
    removeFavorite: (entityId: string) => removeFavorite.mutate(entityId),
  };
}
