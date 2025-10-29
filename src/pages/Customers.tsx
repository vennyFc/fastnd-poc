import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Search, Filter, Building2, MapPin, Briefcase, Tag, Eye, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  customer_name: string;
  industry: string | null;
  country: string | null;
  city: string | null;
  customer_category: string | null;
  created_at: string;
  project_count?: number;
  last_activity?: string;
}

interface Project {
  id: string;
  project_name: string;
  application: string;
  product: string;
  created_at: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerProjects, setCustomerProjects] = useState<Project[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      
      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('customer_name', { ascending: true });

      if (customersError) throw customersError;

      // Load projects to calculate counts and last activity
      const { data: projectsData, error: projectsError } = await supabase
        .from('customer_projects')
        .select('customer, project_name, created_at');

      if (projectsError) throw projectsError;

      // Aggregate project data per customer (count unique project names)
      const projectStats = (projectsData || []).reduce((acc, project) => {
        const customerName = project.customer;
        if (!acc[customerName]) {
          acc[customerName] = { 
            projectNames: new Set<string>(), 
            lastActivity: project.created_at 
          };
        }
        acc[customerName].projectNames.add(project.project_name);
        if (new Date(project.created_at) > new Date(acc[customerName].lastActivity)) {
          acc[customerName].lastActivity = project.created_at;
        }
        return acc;
      }, {} as Record<string, { projectNames: Set<string>; lastActivity: string }>);

      // Combine customer data with project stats
      const enrichedCustomers = (customersData || []).map(customer => ({
        ...customer,
        project_count: projectStats[customer.customer_name]?.projectNames.size || 0,
        last_activity: projectStats[customer.customer_name]?.lastActivity || customer.created_at,
      }));

      setCustomers(enrichedCustomers);
      setFilteredCustomers(enrichedCustomers);
    } catch (error) {
      toast({
        title: 'Fehler beim Laden',
        description: 'Kunden konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerProjects([]);
    setIsSheetOpen(true);
  };

  const handleProjectsClick = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setIsSheetOpen(true);
    
    try {
      setIsLoadingProjects(true);
      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .eq('customer', customer.customer_name)
        .order('project_name', { ascending: true });

      if (error) throw error;
      setCustomerProjects(data || []);
    } catch (error) {
      toast({
        title: 'Fehler beim Laden',
        description: 'Projekte konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Kunden</h1>
          <p className="text-muted-foreground">
            Übersicht aller Kunden und deren Projekte
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kundenname suchen..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Kunden</CardTitle>
          <CardDescription>
            Kundenübersicht mit Projektanzahl
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Kunde</th>
                  <th className="text-left p-3 text-sm font-semibold">Anzahl Projekte</th>
                  <th className="text-left p-3 text-sm font-semibold">Letzte Aktivität</th>
                  <th className="text-left p-3 text-sm font-semibold">Kategorie</th>
                  <th className="text-left p-3 text-sm font-semibold">Standort</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Lädt...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {searchTerm ? 'Keine Kunden gefunden.' : 'Keine Kunden vorhanden.'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      <td className="p-3 font-medium text-primary">{customer.customer_name}</td>
                      <td className="p-3 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{customer.project_count || 0}</span>
                          {customer.project_count && customer.project_count > 0 && (
                            <button
                              onClick={(e) => handleProjectsClick(e, customer)}
                              className="text-primary hover:text-primary/80 transition-colors"
                              aria-label="Projekte anzeigen"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {customer.last_activity 
                          ? new Date(customer.last_activity).toLocaleDateString('de-DE')
                          : '-'
                        }
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.customer_category === 'TOP' 
                            ? 'bg-primary/10 text-primary' 
                            : customer.customer_category === 'KEY'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {customer.customer_category || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {customer.city && customer.country
                          ? `${customer.city}, ${customer.country}`
                          : customer.city || customer.country || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedCustomer.customer_name}
                </SheetTitle>
                <SheetDescription>
                  Kundendetails und Informationen
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Branche</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.industry || 'Nicht angegeben'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Standort</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.city && selectedCustomer.country
                          ? `${selectedCustomer.city}, ${selectedCustomer.country}`
                          : selectedCustomer.city || selectedCustomer.country || 'Nicht angegeben'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Kategorie</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.customer_category || 'Nicht angegeben'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Projects Section */}
                {customerProjects.length > 0 && (
                  <div className="pt-6 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <FolderOpen className="h-5 w-5 text-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">
                        Projekte ({customerProjects.length})
                      </h3>
                    </div>
                    
                    {isLoadingProjects ? (
                      <p className="text-sm text-muted-foreground">Lädt...</p>
                    ) : (
                      <div className="space-y-3">
                        {customerProjects.map((project) => (
                          <Card key={project.id} className="p-4">
                            <h4 className="font-medium text-foreground mb-2">
                              {project.project_name}
                            </h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p><span className="font-medium">Anwendung:</span> {project.application}</p>
                              <p><span className="font-medium">Produkt:</span> {project.product}</p>
                              <p><span className="font-medium">Erstellt:</span> {new Date(project.created_at).toLocaleDateString('de-DE')}</p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
