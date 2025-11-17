import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function SuperAdmin() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Super Admin</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Super Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Super Admin Verwaltungsbereich - Hier können globale Einstellungen und Mandanten verwaltet werden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
