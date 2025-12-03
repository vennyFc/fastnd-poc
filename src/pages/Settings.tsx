import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-medium font-clash-grotesk">{t('settings')}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t('settings')}
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Einstellungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Einstellungen werden in Kürze verfügbar sein.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
