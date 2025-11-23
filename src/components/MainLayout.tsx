import { ReactNode, useState, useRef, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Search, HelpCircle, ArrowRight, Building2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { UserPreferencesPopover } from './UserPreferencesPopover';
import { LanguageSelector } from './LanguageSelector';
import { NotificationPopover } from './NotificationPopover';
import { useAccessTracking } from '@/hooks/useAccessTracking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useAccessTracking();
  const { user, activeTenant, setActiveTenant, isSuperAdmin, isTenantAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Admin routes that should always be accessible
  const adminRoutes = ['/super-admin', '/access-logs', '/admin'];
  const isAdminRoute = adminRoutes.some(route => location.pathname.startsWith(route));

  // Show warning if Super Admin has no tenant selected AND it's not an admin route
  const showTenantWarning = isSuperAdmin && !activeTenant && !isAdminRoute;
  
  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  // Fetch all tenants for super admin
  const { data: allTenants } = useQuery({
    queryKey: ['all_tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, name').order('name');
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Fetch data for search
  const { data: projects } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('customer_projects')
        .select('*');
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('products')
        .select('*');
      return data || [];
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['collections_search'],
    queryFn: async () => {
      const { data } = await supabase
        .from('collections')
        .select('id, name, description, visibility')
        .order('updated_at', { ascending: false });
      return data || [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('customers')
        .select('*');
      return data || [];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('applications')
        .select('*');
      return data || [];
    },
  });

  // Search function
  const searchResults = () => {
    if (searchQuery.length < 2) return null;

    const query = searchQuery.toLowerCase();
    const results: any = {
      projects: [],
      products: [],
      customers: [],
      applications: [],
      collections: [],
    };

    const filteredProjects = projects?.filter((p: any) =>
      p.project_name?.toLowerCase().includes(query) ||
      p.customer?.toLowerCase().includes(query) ||
      p.application?.toLowerCase().includes(query) ||
      p.product?.toLowerCase().includes(query)
    ) || [];
    
    // Group projects by project_name and aggregate products
    const projectMap = new Map();
    filteredProjects.forEach((p: any) => {
      if (projectMap.has(p.project_name)) {
        const existing = projectMap.get(p.project_name);
        if (p.product && !existing.products.includes(p.product)) {
          existing.products.push(p.product);
        }
      } else {
        projectMap.set(p.project_name, {
          ...p,
          products: p.product ? [p.product] : []
        });
      }
    });
    
    results.projects = Array.from(projectMap.values()).slice(0, 3);

    results.products = products?.filter((p: any) =>
      p.product?.toLowerCase().includes(query) ||
      p.product_family?.toLowerCase().includes(query) ||
      p.manufacturer?.toLowerCase().includes(query)
    ).slice(0, 3) || [];

    results.customers = customers?.filter((c: any) =>
      c.customer_name?.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.country?.toLowerCase().includes(query)
    ).slice(0, 3) || [];

    const filteredApplications = applications?.filter((a: any) => {
      const appName = String(a?.application ?? '').toLowerCase();
      const related = String(a?.related_product ?? '').toLowerCase();
      return appName.includes(query) || related.includes(query);
    }) || [];
    
    // Group applications by application name and aggregate related products
    const applicationMap = new Map();
    filteredApplications.forEach((a: any) => {
      const appName = String(a.application || '');
      if (applicationMap.has(appName)) {
        const existing = applicationMap.get(appName);
        const relatedProduct = String(a.related_product || '');
        if (relatedProduct && !existing.related_products.includes(relatedProduct)) {
          existing.related_products.push(relatedProduct);
        }
      } else {
        applicationMap.set(appName, {
          ...a,
          application: appName,
          related_products: a.related_product ? [String(a.related_product)] : []
        });
      }
    });
    
    results.applications = Array.from(applicationMap.values()).slice(0, 3);

    results.collections = collections?.filter((c: any) =>
      c.name?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    ).slice(0, 3) || [];

    return results;
  };

  const results = searchResults();
  const hasResults = results && (
    results.projects.length > 0 || 
    results.products.length > 0 || 
    results.customers.length > 0 ||
    results.applications.length > 0 ||
    results.collections.length > 0
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.length >= 2) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setShowResults(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="h-8 w-8" />
              
              <div className="relative flex-1 max-w-2xl" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(e.target.value.length >= 2);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                />
                
                {/* Search Results Dropdown */}
                {showResults && searchQuery.length >= 2 && (
                  <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {!hasResults ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        {t('search.noResults')}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {/* Projects Results */}
                        {results.projects.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-xs text-muted-foreground">{t('search.projects').toUpperCase()}</h3>
                              <Link
                                to={`/projects?search=${encodeURIComponent(searchQuery)}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => setShowResults(false)}
                              >
                                Alle <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                            <div className="space-y-1">
                              {results.projects.map((project: any) => (
                                <Link
                                  key={project.id}
                                  to={`/projects?search=${encodeURIComponent(project.project_name)}`}
                                  className="block p-2 hover:bg-muted rounded text-sm"
                                  onClick={() => setShowResults(false)}
                                >
                                  <div className="font-medium">{project.project_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {project.customer}
                                    {project.products.length > 0 && (
                                      <span> • {project.products.join(', ')}</span>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Products Results */}
                        {results.products.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-xs text-muted-foreground">{t('search.products').toUpperCase()}</h3>
                              <Link
                                to={`/products?search=${encodeURIComponent(searchQuery)}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => setShowResults(false)}
                              >
                                Alle <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                            <div className="space-y-1">
                              {results.products.map((product: any) => (
                                <Link
                                  key={product.id}
                                  to={`/products?search=${encodeURIComponent(product.product)}`}
                                  className="block p-2 hover:bg-muted rounded text-sm"
                                  onClick={() => setShowResults(false)}
                                >
                                  <div className="font-medium">{product.product}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {product.manufacturer}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Customers Results */}
                        {results.customers.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-xs text-muted-foreground">{t('search.customers').toUpperCase()}</h3>
                              <Link
                                to={`/customers?search=${encodeURIComponent(searchQuery)}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => setShowResults(false)}
                              >
                                Alle <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                            <div className="space-y-1">
                              {results.customers.map((customer: any) => (
                                <Link
                                  key={customer.id}
                                  to={`/customers?search=${encodeURIComponent(customer.customer_name)}`}
                                  className="block p-2 hover:bg-muted rounded text-sm"
                                  onClick={() => setShowResults(false)}
                                >
                                  <div className="font-medium">{customer.customer_name}</div>
                                  {customer.industry && (
                                    <div className="text-xs text-muted-foreground">
                                      {customer.industry}
                                    </div>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Applications Results */}
                        {results.applications.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-xs text-muted-foreground">{t('search.applications').toUpperCase()}</h3>
                              <Link
                                to={`/applications?search=${encodeURIComponent(searchQuery)}`}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => setShowResults(false)}
                              >
                                Alle <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                             <div className="space-y-1">
                              {results.applications.map((application: any) => (
                                <Link
                                  key={application.id}
                                  to={`/applications?search=${encodeURIComponent(application.application || '')}`}
                                  className="block p-2 hover:bg-muted rounded text-sm"
                                  onClick={() => setShowResults(false)}
                                >
                                  <div className="font-medium">{application.application || '-'}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {Array.isArray(application.related_products) && application.related_products.length > 0 ? (
                                      application.related_products.map((p: any) => String(p)).join(', ')
                                    ) : '-'}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Collections Results */}
                        {results.collections.length > 0 && (
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-xs text-muted-foreground">{t('search.collections').toUpperCase()}</h3>
                              <Link
                                to="/collections"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => setShowResults(false)}
                              >
                                Alle <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                            <div className="space-y-1">
                              {results.collections.map((collection: any) => (
                              <Link
                                key={collection.id}
                                to={`/collections?search=${encodeURIComponent(collection.name)}`}
                                className="block p-2 hover:bg-muted rounded text-sm"
                                onClick={() => setShowResults(false)}
                              >
                                  <div className="font-medium">{collection.name}</div>
                                  {collection.description && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {collection.description}
                                    </div>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Tenant Selector / Display */}
              {isSuperAdmin ? (
                <div className="w-[200px]">
                  <Select
                    value={activeTenant?.id || ""}
                    onValueChange={(value) => {
                      const tenant = allTenants?.find(t => t.id === value);
                      if (tenant) setActiveTenant(tenant);
                    }}
                  >
                    <SelectTrigger className={!activeTenant ? "border-destructive" : ""}>
                      <SelectValue placeholder="Mandant auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                activeTenant && (
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground px-3 py-1.5 rounded-md bg-muted/50 border border-border">
                    <Building2 className="h-4 w-4" />
                    <span>{activeTenant.name}</span>
                  </div>
                )
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <LanguageSelector />
              <UserPreferencesPopover />
              <button className="p-2 hover:bg-muted rounded-md">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </button>
              <NotificationPopover />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {showTenantWarning ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Kein Mandant ausgewählt</AlertTitle>
                  <AlertDescription>
                    Bitte wählen Sie einen Mandanten aus, um das Dashboard und andere Funktionen nutzen zu können.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
