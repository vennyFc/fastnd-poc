import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import fastndLogo from '@/assets/fastnd-logo-gradient.svg';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string()
  .trim()
  .email('Bitte geben Sie eine gültige E-Mail-Adresse ein')
  .max(255, 'E-Mail-Adresse darf maximal 255 Zeichen lang sein');

const passwordSchema = z.string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Ziffer enthalten')
  .max(100, 'Passwort darf maximal 100 Zeichen lang sein');

const nameSchema = z.string()
  .trim()
  .min(1, 'Name darf nicht leer sein')
  .max(100, 'Name darf maximal 100 Zeichen lang sein');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
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

      if (isLogin) {
        const { error } = await signIn(emailValidation.data, passwordValidation.data);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Erfolgreich angemeldet');
        }
      } else {
        // Validate name for signup
        const nameValidation = nameSchema.safeParse(fullName);
        if (!nameValidation.success) {
          toast.error(nameValidation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signUp(emailValidation.data, passwordValidation.data, nameValidation.data);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Konto erfolgreich erstellt');
        }
      }
    } catch (error: any) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center mb-4">
            <img src={fastndLogo} alt="FASTND Logo" className="h-10" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Geben Sie Ihre Anmeldedaten ein'
              : 'Erstellen Sie ein neues Konto'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Max Mustermann"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground">
                  Mindestens 8 Zeichen mit Groß-, Kleinbuchstaben und Ziffern
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Anmelden' : 'Registrieren'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? 'Noch kein Konto? Jetzt registrieren'
                : 'Bereits registriert? Anmelden'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
