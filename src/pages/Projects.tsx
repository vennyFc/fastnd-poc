import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';

type SortField = 'project_name' | 'customer' | 'applications' | 'products' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

export default function Projects() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'projects-columns',
    [
      { key: 'project_name', label: 'Projektname', visible: true, width: 200, order: 0 },
      { key: 'customer', label: 'Kunde', visible: true, width: 180, order: 1 },
      { key: 'applications', label: 'Applikation', visible: true, width: 200, order: 2 },
      { key: 'products', label: 'Produkt', visible: true, width: 200, order: 3 },
      { key: 'created_at', label: 'Erstellt', visible: true, width: 120, order: 4 },
    ]
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      // @ts-ignore
      const { data, error } = await supabase
        // @ts-ignore
        .from('customer_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch user preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['user_preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
  });

  // Group projects by customer and project_name
  const groupedProjects = projects?.reduce((acc: any[], project: any) => {
    const key = `${project.customer}-${project.project_name}`;
    const existing = acc.find(
      (p) => p.customer === project.customer && p.project_name === project.project_name
    );

    if (existing) {
      // Add application and product if not already included
      if (project.application && !existing.applications.includes(project.application)) {
        existing.applications.push(project.application);
      }
      if (project.product && !existing.products.includes(project.product)) {
        existing.products.push(project.product);
      }
      // Keep the earliest created_at date
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
    } else {
      acc.push({
        id: project.id,
        customer: project.customer,
        project_name: project.project_name,
        applications: project.application ? [project.application] : [],
        products: project.product ? [project.product] : [],
        created_at: project.created_at,
      });
    }
    return acc;
  }, []);

  const filteredProjects = groupedProjects?.filter((project: any) => {
    // Search filter
    const matchesSearch = searchQuery.length < 2 ? true :
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.applications?.some((app: string) => app?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.products?.some((prod: string) => prod?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Preferences filter
    if (userPreferences) {
      const selectedApps = userPreferences.target_applications || [];
      const selectedFamilies = userPreferences.product_families || [];
      
      // If no preferences are selected, show nothing (unless both are empty arrays meaning show all)
      const hasAppPreference = selectedApps.length === 0;
      const matchesApp = hasAppPreference || project.applications?.some((app: string) => selectedApps.includes(app));
      
      if (!matchesApp) return false;
    }

    return true;
  });

  const sortedProjects = filteredProjects?.sort((a: any, b: any) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle array fields
    if (sortField === 'applications' || sortField === 'products') {
      aValue = aValue?.join(', ') || '';
      bValue = bValue?.join(', ') || '';
    }

    // Handle date fields
    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle string fields
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
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projekte</h1>
          <p className="text-muted-foreground">
            Übersicht aller Kundenprojekte mit Opportunity-Scores
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Projektname, Kunde, Applikation oder Produkt suchen..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <ColumnVisibilityToggle
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Projekte</CardTitle>
          <CardDescription>
            {filteredProjects?.length || 0} Kundenprojekte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedProjects && sortedProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column, index) => (
                    <ResizableTableHeader
                      key={column.key}
                      label={column.label}
                      width={column.width}
                      onResize={(width) => updateColumnWidth(column.key, width)}
                      sortable={true}
                      sortDirection={sortField === column.key ? sortDirection : null}
                      onSort={() => handleSort(column.key as SortField)}
                      draggable={true}
                      onDragStart={() => setDraggedIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          reorderColumns(draggedIndex, index);
                        }
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects.map((project: any) => (
                  <TableRow key={project.id}>
                    {visibleColumns.map((column) => {
                      const value = column.key === 'applications' 
                        ? (project.applications.length > 0 ? project.applications.join(', ') : '-')
                        : column.key === 'products'
                        ? (project.products.length > 0 ? project.products.join(', ') : '-')
                        : column.key === 'created_at'
                        ? (project.created_at ? format(new Date(project.created_at), 'dd.MM.yyyy') : '-')
                        : project[column.key];
                      
                      return (
                        <TableCell 
                          key={column.key}
                          className={column.key === 'project_name' ? 'font-medium' : ''}
                          style={{ width: `${column.width}px` }}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery.length >= 2
                ? 'Keine Projekte gefunden.'
                : 'Keine Projekte vorhanden. Laden Sie Projektdaten im Datenhub hoch.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
