import { useState, useEffect } from 'react';
import { Search, ExternalLink, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams } from 'react-router-dom';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Fetch all data for search
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

  const { data: crossSells } = useQuery({
    queryKey: ['cross_sells'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('cross_sells')
        .select('*');
      return data || [];
    },
  });

  // Search function
  const searchResults = () => {
    if (searchQuery.length < 3) return null;

    const query = searchQuery.toLowerCase();
    const results: any = {
      projects: [],
      products: [],
      applications: [],
      crossSells: [],
    };

    // Search projects
    results.projects = projects?.filter((p: any) =>
      p.customer?.toLowerCase().includes(query) ||
      p.project_name?.toLowerCase().includes(query) ||
      p.application?.toLowerCase().includes(query) ||
      p.product?.toLowerCase().includes(query)
    ) || [];

    // Search products
    results.products = products?.filter((p: any) =>
      p.product?.toLowerCase().includes(query) ||
      p.product_family?.toLowerCase().includes(query) ||
      p.manufacturer?.toLowerCase().includes(query) ||
      p.product_description?.toLowerCase().includes(query)
    ) || [];

    // Search applications
    results.applications = applications?.filter((a: any) =>
      a.application?.toLowerCase().includes(query) ||
      a.related_product?.toLowerCase().includes(query)
    ) || [];

    // Search cross-sells
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
    <div className="p-6 space-y-6">
      {/* Hero Search Section */}
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
                {/* Projects Results */}
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

                {/* Products Results */}
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

                {/* Applications Results */}
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

                {/* Cross-Sells Results */}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Projekte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{projects?.length || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">In der Datenbank</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Produkte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{products?.length || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Verfügbar</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Cross-Selling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{crossSells?.length || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Möglichkeiten</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Erste Schritte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h3 className="font-semibold">Daten hochladen</h3>
              <p className="text-sm text-muted-foreground">
                Beginnen Sie mit dem Upload Ihrer Kundenprojekte und Produktdaten im Datenhub
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h3 className="font-semibold">Daten durchsuchen</h3>
              <p className="text-sm text-muted-foreground">
                Nutzen Sie die Suche, um Cross-Selling und Alternative Produktempfehlungen zu finden
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h3 className="font-semibold">Verkaufschancen nutzen</h3>
              <p className="text-sm text-muted-foreground">
                Analysieren Sie die Vorschläge und kontaktieren Sie Ihre Kunden mit neuen Angeboten
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
