import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function UserPreferencesPopover() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);

  // Fetch available applications
  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('application')
        .eq('user_id', user?.id);
      const uniqueApps = [...new Set(data?.map(a => a.application) || [])];
      return uniqueApps.sort();
    },
    enabled: !!user,
  });

  // Fetch available product families
  const { data: productFamilies } = useQuery({
    queryKey: ['product_families'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('product_family')
        .eq('user_id', user?.id)
        .not('product_family', 'is', null);
      const uniqueFamilies = [...new Set(data?.map(p => p.product_family).filter(Boolean) || [])];
      return uniqueFamilies.sort();
    },
    enabled: !!user,
  });

  // Fetch available manufacturers
  const { data: manufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('manufacturer')
        .eq('user_id', user?.id)
        .not('manufacturer', 'is', null);
      const uniqueManufacturers = [...new Set(data?.map(p => p.manufacturer).filter(Boolean) || [])];
      return uniqueManufacturers.sort();
    },
    enabled: !!user,
  });

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  // Initialize selections when data loads
  useEffect(() => {
    if (preferences) {
      setSelectedApplications(preferences.target_applications || []);
      setSelectedFamilies(preferences.product_families || []);
      setSelectedManufacturers(preferences.manufacturers || []);
    } else if (applications && productFamilies && manufacturers) {
      // Default: select all
      setSelectedApplications(applications);
      setSelectedFamilies(productFamilies);
      setSelectedManufacturers(manufacturers);
    }
  }, [preferences, applications, productFamilies, manufacturers]);

  // Save preferences mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update({
            target_applications: selectedApplications,
            product_families: selectedFamilies,
            manufacturers: selectedManufacturers,
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            target_applications: selectedApplications,
            product_families: selectedFamilies,
            manufacturers: selectedManufacturers,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
      toast.success('Präferenzen gespeichert');
    },
    onError: () => {
      toast.error('Fehler beim Speichern der Präferenzen');
    },
  });

  const toggleApplication = (app: string) => {
    setSelectedApplications(prev => {
      const newSelection = prev.includes(app)
        ? prev.filter(a => a !== app)
        : [...prev, app];
      return newSelection;
    });
  };

  const toggleFamily = (family: string) => {
    setSelectedFamilies(prev => {
      const newSelection = prev.includes(family)
        ? prev.filter(f => f !== family)
        : [...prev, family];
      return newSelection;
    });
  };

  const selectAllApplications = () => {
    setSelectedApplications(applications || []);
  };

  const deselectAllApplications = () => {
    setSelectedApplications([]);
  };

  const selectAllFamilies = () => {
    setSelectedFamilies(productFamilies || []);
  };

  const deselectAllFamilies = () => {
    setSelectedFamilies([]);
  };

  const toggleManufacturer = (manufacturer: string) => {
    setSelectedManufacturers(prev => {
      const newSelection = prev.includes(manufacturer)
        ? prev.filter(m => m !== manufacturer)
        : [...prev, manufacturer];
      return newSelection;
    });
  };

  const selectAllManufacturers = () => {
    setSelectedManufacturers(manufacturers || []);
  };

  const deselectAllManufacturers = () => {
    setSelectedManufacturers([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-2 hover:bg-muted rounded-md">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1">Benutzer Präferenzen</h3>
            <p className="text-xs text-muted-foreground">
              Wählen Sie Applikationen und Produktfamilien aus, die in den Ergebnissen angezeigt werden sollen.
            </p>
          </div>

          <Separator />

          {/* Applications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Zielapplikationen</Label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllApplications}
                  className="text-xs text-primary hover:underline"
                >
                  Alle
                </button>
                <span className="text-xs text-muted-foreground">|</span>
                <button
                  onClick={deselectAllApplications}
                  className="text-xs text-primary hover:underline"
                >
                  Keine
                </button>
              </div>
            </div>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {applications?.map(app => (
                  <div key={app} className="flex items-center space-x-2">
                    <Checkbox
                      id={`app-${app}`}
                      checked={selectedApplications.includes(app)}
                      onCheckedChange={() => toggleApplication(app)}
                    />
                    <label
                      htmlFor={`app-${app}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {app}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Product Families */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Produktfamilien</Label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFamilies}
                  className="text-xs text-primary hover:underline"
                >
                  Alle
                </button>
                <span className="text-xs text-muted-foreground">|</span>
                <button
                  onClick={deselectAllFamilies}
                  className="text-xs text-primary hover:underline"
                >
                  Keine
                </button>
              </div>
            </div>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {productFamilies?.map(family => (
                  <div key={family} className="flex items-center space-x-2">
                    <Checkbox
                      id={`family-${family}`}
                      checked={selectedFamilies.includes(family)}
                      onCheckedChange={() => toggleFamily(family)}
                    />
                    <label
                      htmlFor={`family-${family}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {family}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Manufacturers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Hersteller</Label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllManufacturers}
                  className="text-xs text-primary hover:underline"
                >
                  Alle
                </button>
                <span className="text-xs text-muted-foreground">|</span>
                <button
                  onClick={deselectAllManufacturers}
                  className="text-xs text-primary hover:underline"
                >
                  Keine
                </button>
              </div>
            </div>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {manufacturers?.map(manufacturer => (
                  <div key={manufacturer} className="flex items-center space-x-2">
                    <Checkbox
                      id={`manufacturer-${manufacturer}`}
                      checked={selectedManufacturers.includes(manufacturer)}
                      onCheckedChange={() => toggleManufacturer(manufacturer)}
                    />
                    <label
                      htmlFor={`manufacturer-${manufacturer}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {manufacturer}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md text-sm font-medium"
          >
            {saveMutation.isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
