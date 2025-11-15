import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Search, Filter, Building2, MapPin, Briefcase, Tag, Eye } from 'lucide-react';
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const sortedCustomers = filteredCustomers.sort((a, b) => {
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
    setIsSheetOpen(true);
  };

  const handleProjectsClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    navigate(`/projects?customer=${encodeURIComponent(customer.customer_name)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kunden</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Kundendaten</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Kunde suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
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
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.filter(col => col.visible).map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {columns.filter(col => col.visible).map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : sortedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Kunden gefunden</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Beginnen Sie mit dem Hochladen von Kundendaten'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns
                      .filter(col => col.visible)
                      .map((column, index) => (
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
                  {sortedCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      {columns.filter(col => col.visible).map((column) => (
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
