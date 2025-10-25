import { useState } from 'react';
import { Search, ArrowRight, ExternalLink, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SearchWidgetProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  projects: any[];
  products: any[];
  applications: any[];
  crossSells: any[];
}

export function SearchWidget({
  searchQuery,
  setSearchQuery,
  projects,
  products,
  applications,
  crossSells,
}: SearchWidgetProps) {
  const [quickFilter, setQuickFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  // Load recently viewed projects from localStorage
  const getRecentlyViewed = (): Array<{ customer: string; project_name: string }> => {
    const stored = localStorage.getItem('recentlyViewedProjects');
    return stored ? JSON.parse(stored) : [];
  };

  // Fetch favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['project_favorites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_favorites')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  const isFavorite = (customer: string, project_name: string) => {
    return favorites.some(
      (fav: any) => fav.customer === customer && fav.project_name === project_name
    );
  };

  const searchResults = () => {
    if (searchQuery.length < 3) return null;

    const query = searchQuery.toLowerCase();
    const results: any = {
      projects: [],
      products: [],
      applications: [],
      crossSells: [],
    };

    results.projects = projects?.filter((p: any) =>
      p.customer?.toLowerCase().includes(query) ||
      p.project_name?.toLowerCase().includes(query) ||
      p.application?.toLowerCase().includes(query) ||
      p.product?.toLowerCase().includes(query)
    ) || [];

    // Apply quick filter to projects
    if (quickFilter === 'favorites') {
      results.projects = results.projects.filter((p: any) =>
        isFavorite(p.customer, p.project_name)
      );
    } else if (quickFilter === 'recent') {
      const recentlyViewed = getRecentlyViewed();
      results.projects = results.projects.filter((p: any) =>
        recentlyViewed.some(
          rv => rv.customer === p.customer && rv.project_name === p.project_name
        )
      );
    }

    results.products = products?.filter((p: any) =>
      p.product?.toLowerCase().includes(query) ||
      p.product_family?.toLowerCase().includes(query) ||
      p.manufacturer?.toLowerCase().includes(query) ||
      p.product_description?.toLowerCase().includes(query)
    ) || [];

    results.applications = applications?.filter((a: any) =>
      a.application?.toLowerCase().includes(query) ||
      a.related_product?.toLowerCase().includes(query)
    ) || [];

    results.crossSells = crossSells?.filter((c: any) =>
      c.application?.toLowerCase().includes(query) ||
      c.base_product?.toLowerCase().includes(query) ||
      c.cross_sell_product?.toLowerCase().includes(query)
    ) || [];

    return results;
  };

  const results = searchResults();
  const hasResults = results && (
    results.projects.length > 0 ||
    results.products.length > 0 ||
    results.applications.length > 0 ||
    results.crossSells.length > 0
  );

  return (
    <div className="bg-gradient-to-br from-primary to-primary-hover rounded-lg p-12 text-white">
      <h1 className="text-4xl font-bold mb-4">Opportunity Optimizer</h1>
      <p className="text-lg mb-8 opacity-90">
        Finden Sie Cross-Selling und Up-Selling Potenziale in Ihren Kundenprojekten
      </p>
      
      <div className="relative max-w-3xl">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Suchen Sie nach Kunden, Projekten, Applikationen oder Produkten..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-lg text-foreground bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Quick Filter Chips */}
      <div className="flex gap-2 mt-4">
        <Badge
          variant={quickFilter === 'favorites' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm bg-white/90 hover:bg-white transition-colors"
          onClick={() => setQuickFilter(quickFilter === 'favorites' ? 'all' : 'favorites')}
        >
          <Star className={`mr-1.5 h-3.5 w-3.5 ${quickFilter === 'favorites' ? 'fill-current' : ''}`} />
          Favoriten
        </Badge>
        <Badge
          variant={quickFilter === 'recent' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm bg-white/90 hover:bg-white transition-colors"
          onClick={() => setQuickFilter(quickFilter === 'recent' ? 'all' : 'recent')}
        >
          Zuletzt angesehen
        </Badge>
      </div>
      
      {searchQuery.length >= 3 && (
        <div className="mt-4 bg-white rounded-lg shadow-lg text-foreground max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground">
              Suche nach: <span className="font-semibold">{searchQuery}</span>
            </p>
          </div>

          {!hasResults ? (
            <div className="p-4 text-sm text-muted-foreground">
              Keine Ergebnisse gefunden. Laden Sie Daten im Datenhub hoch, um zu beginnen.
            </div>
          ) : (
            <div className="divide-y">
              {results.projects.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Projekte ({results.projects.length})</h3>
                    <Link to="/projects" className="text-sm text-primary hover:underline flex items-center gap-1">
                      Alle anzeigen <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {results.projects.slice(0, 3).map((project: any) => (
                      <Link
                        key={project.id}
                        to={`/projects?search=${encodeURIComponent(project.project_name)}`}
                        className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="font-medium">{project.project_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Kunde: {project.customer} • Produkt: {project.product}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.products.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Produkte ({results.products.length})</h3>
                    <Link to="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
                      Alle anzeigen <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {results.products.slice(0, 3).map((product: any) => (
                      <Link
                        key={product.id}
                        to={`/products?search=${encodeURIComponent(product.product)}`}
                        className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{product.product}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.manufacturer} • {product.product_family}
                            </div>
                          </div>
                          {product.manufacturer_link && (
                            <a
                              href={product.manufacturer_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.applications.length > 0 && (
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Applikationen ({results.applications.length})</h3>
                  <div className="space-y-2">
                    {results.applications.slice(0, 3).map((app: any) => (
                      <div
                        key={app.id}
                        className="p-3 bg-muted rounded-lg"
                      >
                        <div className="font-medium">{app.application}</div>
                        <div className="text-sm text-muted-foreground">
                          Produkt: {app.related_product}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.crossSells.length > 0 && (
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Cross-Selling Möglichkeiten ({results.crossSells.length})</h3>
                  <div className="space-y-2">
                    {results.crossSells.slice(0, 3).map((cs: any) => (
                      <div
                        key={cs.id}
                        className="p-3 bg-muted rounded-lg"
                      >
                        <div className="font-medium">{cs.cross_sell_product}</div>
                        <div className="text-sm text-muted-foreground">
                          Basis: {cs.base_product} • Applikation: {cs.application}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
