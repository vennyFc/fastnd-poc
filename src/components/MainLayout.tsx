import { ReactNode, useState, useRef, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Search, HelpCircle, ArrowRight, Building2, AlertTriangle, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const { user, activeTenant, setActiveTenant, isSuperAdmin, isTenantAdmin, signOut } = useAuth();
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

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isTenantAdmin) return 'Tenant Administrator';
    return 'Benutzer';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Set default "Global" for Super Admins
  useEffect(() => {
    if (isSuperAdmin && !activeTenant) {
      setActiveTenant({ id: 'global', name: 'Global' });
    }
  }, [isSuperAdmin, activeTenant, setActiveTenant]);

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
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customer_projects')
        .select('*');
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && !!activeTenant,
  });

  const { data: products } = useQuery({
    queryKey: ['products', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*');
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && !!activeTenant,
  });

  const { data: collections } = useQuery({
    queryKey: ['collections_search', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('collections')
        .select('id, name, description, visibility')
        .order('updated_at', { ascending: false });
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && !!activeTenant,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*');
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && !!activeTenant,
  });

  const { data: applications } = useQuery({
    queryKey: ['applications', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select('*');
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.or(`tenant_id.eq.${activeTenant.id},tenant_id.is.null`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && !!activeTenant,
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
          <header className="h-16 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="h-8 w-8" />
              
              <div className="relative flex-1 max-w-2xl" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('search.placeholder')}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(e.target.value.length >= 2);
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  disabled={isSuperAdmin && activeTenant?.id === 'global'}
                />
                
                {/* Search Results Dropdown */}
                {showResults && searchQuery.length >= 2 && (
                  <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {!hasResults ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Keine Ergebnisse gefunden
                      </div>
                    ) : (
                      <div className="p-2">
                        {/* Projects */}
                        {results.projects.length > 0 && (
                          <div className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Projekte
                            </div>
                            {results.projects.map((project: any) => (
                              <Link
                                key={project.id}
                                to={`/projects?search=${project.project_name}`}
                                className="block px-2 py-2 hover:bg-muted rounded-md"
                                onClick={() => setShowResults(false)}
                              >
                                <div className="text-sm font-medium">{project.project_name}</div>
                                <div className="text-xs text-muted-foreground">{project.customer}</div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Products */}
                        {results.products.length > 0 && (
                          <div className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Produkte
                            </div>
                            {results.products.map((product: any) => (
                              <Link
                                key={product.id}
                                to={`/products?search=${product.product}`}
                                className="block px-2 py-2 hover:bg-muted rounded-md"
                                onClick={() => setShowResults(false)}
                              >
                                <div className="text-sm font-medium">{product.product}</div>
                                <div className="text-xs text-muted-foreground">{product.product_family}</div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Customers */}
                        {results.customers.length > 0 && (
                          <div className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Kunden
                            </div>
                            {results.customers.map((customer: any) => (
                              <Link
                                key={customer.id}
                                to={`/customers?search=${customer.customer_name}`}
                                className="block px-2 py-2 hover:bg-muted rounded-md"
                                onClick={() => setShowResults(false)}
                              >
                                <div className="text-sm font-medium">{customer.customer_name}</div>
                                <div className="text-xs text-muted-foreground">{customer.industry}</div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Applications */}
                        {results.applications.length > 0 && (
                          <div className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Anwendungen
                            </div>
                            {results.applications.map((app: any, index: number) => (
                              <Link
                                key={`${app.application}-${index}`}
                                to={`/applications?search=${app.application}`}
                                className="block px-2 py-2 hover:bg-muted rounded-md"
                                onClick={() => setShowResults(false)}
                              >
                                <div className="text-sm font-medium">{app.application}</div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Collections */}
                        {results.collections.length > 0 && (
                          <div className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Sammlungen
                            </div>
                            {results.collections.map((collection: any) => (
                              <Link
                                key={collection.id}
                                to={`/collections`}
                                className="block px-2 py-2 hover:bg-muted rounded-md"
                                onClick={() => setShowResults(false)}
                              >
                                <div className="text-sm font-medium">{collection.name}</div>
                                <div className="text-xs text-muted-foreground">{collection.description}</div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* View all link */}
                        <div className="border-t border-border pt-2">
                          <Link
                            to={`/?search=${encodeURIComponent(searchQuery)}`}
                            className="block px-2 py-2 text-sm text-primary hover:bg-muted rounded-md flex items-center justify-between"
                            onClick={() => setShowResults(false)}
                          >
                            <span>Alle Ergebnisse anzeigen</span>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Tenant Selector for Super Admin */}
              {isSuperAdmin && (
                <div className="w-[200px]">
                  <Select
                    value={activeTenant?.id || ""}
                    onValueChange={(value) => {
                      if (value === 'global') {
                        setActiveTenant({ id: 'global', name: 'Global' });
                      } else {
                        const tenant = allTenants?.find(t => t.id === value);
                        if (tenant) setActiveTenant(tenant);
                      }
                    }}
                  >
                    <SelectTrigger className={!activeTenant ? "border-destructive" : ""}>
                      <SelectValue placeholder="Mandant auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        <span className="font-semibold">🌐 Global (Alle Mandanten)</span>
                      </SelectItem>
                      {allTenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Tenant Display for User and Tenant Admin */}
              {!isSuperAdmin && activeTenant && (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground px-3 py-1.5 rounded-full bg-muted/50">
                  <Building2 className="h-4 w-4" />
                  <span>{activeTenant.name}</span>
                </div>
              )}
              <LanguageSelector />
              <UserPreferencesPopover />
              <button className="p-2 hover:bg-muted rounded-full transition-colors">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </button>
              <NotificationPopover />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar className={`h-8 w-8 cursor-pointer ${isSuperAdmin ? 'ring-2 ring-red-500' : isTenantAdmin ? 'ring-2 ring-green-500' : ''}`}>
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border z-50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {getRoleLabel()}
                      </p>
                      {activeTenant && (
                        <p className="text-xs leading-none text-muted-foreground mt-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {activeTenant.name}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Einstellungen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
