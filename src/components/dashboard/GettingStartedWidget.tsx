import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export function GettingStartedWidget() {
  const { t } = useLanguage();

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>{t('gettingStarted.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            1
          </div>
          <div>
            <h3 className="font-semibold">{t('gettingStarted.step1Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step1Description')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            2
          </div>
          <div>
            <h3 className="font-semibold">{t('gettingStarted.step2Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step2Description')}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            3
          </div>
          <div>
            <h3 className="font-semibold">{t('gettingStarted.step3Title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('gettingStarted.step3Description')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}