import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Building2, MapPin, Briefcase, Tag, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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

type SortField = 'customer_name' | 'industry' | 'country' | 'city' | 'customer_category' | 'project_count';
type SortDirection = 'asc' | 'desc' | null;

export default function Customers() {
  const { user, isSuperAdmin, activeTenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Filter states
  const [filterIndustry, setFilterIndustry] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const defaultColumns = [
    { key: 'customer_name', label: 'Kunde', visible: true, width: 250, order: 0 },
    { key: 'industry', label: 'Branche', visible: true, width: 180, order: 1 },
    { key: 'country', label: 'Land', visible: true, width: 150, order: 2 },
    { key: 'city', label: 'Stadt', visible: true, width: 150, order: 3 },
    { key: 'customer_category', label: 'Kategorie', visible: true, width: 150, order: 4 },
    { key: 'project_count', label: 'Projekte', visible: true, width: 120, order: 5 },
  ];

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'customers-columns',
    defaultColumns
  );

  // Compute unique filter options
  const filterOptions = useMemo(() => {
    const industries = new Set<string>();
    const countries = new Set<string>();
    const cities = new Set<string>();
    const categories = new Set<string>();
    
    customers.forEach(customer => {
      if (customer.industry) industries.add(customer.industry);
      if (customer.country) countries.add(customer.country);
      if (customer.city) cities.add(customer.city);
      if (customer.customer_category) categories.add(customer.customer_category);
    });
    
    return {
      industries: Array.from(industries).sort(),
      countries: Array.from(countries).sort(),
      cities: Array.from(cities).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [customers]);

  // Count active filters
  const activeFilterCount = [filterIndustry, filterCountry, filterCity, filterCategory].filter(Boolean).length;

  useEffect(() => {
    loadCustomers();
  }, [activeTenant?.id]);

  useEffect(() => {
    let filtered = customers;
    
    // Apply search
    if (searchTerm.trim()) {
      filtered = filtered.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filters
    if (filterIndustry) {
      filtered = filtered.filter(c => c.industry === filterIndustry);
    }
    if (filterCountry) {
      filtered = filtered.filter(c => c.country === filterCountry);
    }
    if (filterCity) {
      filtered = filtered.filter(c => c.city === filterCity);
    }
    if (filterCategory) {
      filtered = filtered.filter(c => c.customer_category === filterCategory);
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, customers, filterIndustry, filterCountry, filterCity, filterCategory]);

  const clearAllFilters = () => {
    setFilterIndustry('');
    setFilterCountry('');
    setFilterCity('');
    setFilterCategory('');
  };

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalItems = sortedCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderColumns(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      
      if (!activeTenant) {
        setCustomers([]);
        setFilteredCustomers([]);
        return;
      }
      
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('customer_name', { ascending: true });

      if (customersError) throw customersError;

      const { data: projectsData, error: projectsError } = await supabase
        .from('customer_projects')
        .select('customer, project_name, created_at')
        .eq('tenant_id', activeTenant.id);

      if (projectsError) throw projectsError;

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
    setIsSheetOpen(true);
  };

  const handleProjectsClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    navigate(`/projects?customer=${encodeURIComponent(customer.customer_name)}`);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium font-clash">Kunden</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Kunde suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {activeFilterCount > 0 && (
                      <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filter</h4>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-auto p-1 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Zurücksetzen
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Branche</label>
                        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Alle Branchen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Alle Branchen</SelectItem>
                            {filterOptions.industries.map(industry => (
                              <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Land</label>
                        <Select value={filterCountry} onValueChange={setFilterCountry}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Alle Länder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Alle Länder</SelectItem>
                            {filterOptions.countries.map(country => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Stadt</label>
                        <Select value={filterCity} onValueChange={setFilterCity}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Alle Städte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Alle Städte</SelectItem>
                            {filterOptions.cities.map(city => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Kategorie</label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Alle Kategorien" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Alle Kategorien</SelectItem>
                            {filterOptions.categories.map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <ColumnVisibilityToggle
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      {visibleColumns.map((column) => (
                        <TableCell key={column.key}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Kunden gefunden</h3>
              <p className="text-muted-foreground">
                {searchTerm || activeFilterCount > 0 ? 'Versuchen Sie andere Suchkriterien oder Filter' : 'Beginnen Sie mit dem Hochladen von Kundendaten'}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column, index) => (
                        <ResizableTableHeader
                          key={column.key}
                          label={column.label}
                          width={column.width}
                          onResize={(newWidth) => updateColumnWidth(column.key, newWidth)}
                          sortable={true}
                          sortDirection={sortField === column.key ? sortDirection : null}
                          onSort={() => handleSort(column.key as SortField)}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleCustomerClick(customer)}
                      >
                        {visibleColumns.map((column) => (
                          <TableCell key={column.key} style={{ width: column.width }}>
                            {column.key === 'customer_name' && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{customer.customer_name}</span>
                              </div>
                            )}
                            {column.key === 'industry' && customer.industry}
                            {column.key === 'country' && customer.country}
                            {column.key === 'city' && customer.city}
                            {column.key === 'customer_category' && customer.customer_category && (
                              <Badge variant="outline">{customer.customer_category}</Badge>
                            )}
                            {column.key === 'project_count' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleProjectsClick(e, customer)}
                              >
                                {customer.project_count || 0}
                              </Button>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="border-t pt-4 mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {totalItems > 0 ? `${startIndex + 1}-${Math.min(endIndex, totalItems)} von ${totalItems} Ergebnissen` : '0 Ergebnisse'}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ergebnisse pro Seite:</span>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(val) => {
                        setItemsPerPage(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Zurück
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 px-3"
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
