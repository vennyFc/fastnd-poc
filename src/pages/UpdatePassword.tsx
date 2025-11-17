import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import fastndLogo from '@/assets/fastnd-logo-gradient.svg';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { Alert, AlertDescription } from '@/components/ui/alert';

const passwordSchema = z.string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Ziffer enthalten')
  .max(100, 'Passwort darf maximal 100 Zeichen lang sein');

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    // Timeout after 5 seconds if no session
    const timeout = setTimeout(() => {
      if (!sessionReady) {
        setCheckingSession(false);
        toast.error('Keine gültige Session gefunden. Bitte fordern Sie einen neuen Reset-Link an.');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [sessionReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        toast.error('Passwörter stimmen nicht überein');
        setLoading(false);
        return;
      }

      // Validate password
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordValidation.data,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Passwort erfolgreich aktualisiert');
        navigate('/auth');
      }
    } catch (error: any) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking for session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center mb-4">
              <img src={fastndLogo} alt="FASTND Logo" className="h-10" />
            </div>
            <CardTitle className="text-2xl">Neues Passwort festlegen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Session wird überprüft...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no session after timeout
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center mb-4">
              <img src={fastndLogo} alt="FASTND Logo" className="h-10" />
            </div>
            <CardTitle className="text-2xl">Keine gültige Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Der Passwort-Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.
              </AlertDescription>
            </Alert>
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Zurück zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-4">
            <img src={fastndLogo} alt="FASTND Logo" className="h-10" />
          </div>
          <CardTitle className="text-2xl">Neues Passwort festlegen</CardTitle>
          <CardDescription>
            Geben Sie Ihr neues Passwort ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort aktualisieren
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
