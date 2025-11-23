import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'de' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations: Record<Language, Record<string, string>> = {
  de: {
    // Navigation
    'nav.cockpit': 'Cockpit',
    'nav.projects': 'Projekte',
    'nav.products': 'Produkte',
    'nav.customers': 'Kunden',
    'nav.collections': 'Sammlungen',
    'nav.reports': 'Reports',
    'nav.administration': 'Administration',
    'nav.admin': 'Benutzerverwaltung',
    'nav.dataHub': 'Datenhub',
    'nav.logout': 'Abmelden',
    
    // Search
    'search.placeholder': 'Suche nach Projekten, Produkten, Kunden...',
    'search.noResults': 'Keine Ergebnisse gefunden',
    'search.projects': 'Projekte',
    'search.products': 'Produkte',
    'search.customers': 'Kunden',
    'search.applications': 'Applikationen',
    'search.collections': 'Sammlungen',
    
    // User Preferences
    'userPrefs.title': 'Benutzereinstellungen',
    'userPrefs.theme': 'Design',
    'userPrefs.light': 'Hell',
    'userPrefs.dark': 'Dunkel',
    'userPrefs.system': 'System',
    'userPrefs.language': 'Sprache',
    
    // Dashboard
    'dashboard.welcome': 'Willkommen',
    'dashboard.statistics': 'Statistiken',
    'dashboard.recentProjects': 'Aktuelle Projekte',
    'dashboard.actionItems': 'Aktionspunkte',
    'dashboard.gettingStarted': 'Erste Schritte',
    
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.search': 'Suchen',
    'common.filter': 'Filter',
    'common.export': 'Exportieren',
    'common.import': 'Importieren',
    'common.loading': 'Lädt...',
  },
  en: {
    // Navigation
    'nav.cockpit': 'Cockpit',
    'nav.projects': 'Projects',
    'nav.products': 'Products',
    'nav.customers': 'Customers',
    'nav.collections': 'Collections',
    'nav.reports': 'Reports',
    'nav.administration': 'Administration',
    'nav.admin': 'Admin',
    'nav.dataHub': 'Data Hub',
    'nav.logout': 'Logout',
    
    // Search
    'search.placeholder': 'Search for projects, products, customers...',
    'search.noResults': 'No results found',
    'search.projects': 'Projects',
    'search.products': 'Products',
    'search.customers': 'Customers',
    'search.applications': 'Applications',
    'search.collections': 'Collections',
    
    // User Preferences
    'userPrefs.title': 'User Preferences',
    'userPrefs.theme': 'Theme',
    'userPrefs.light': 'Light',
    'userPrefs.dark': 'Dark',
    'userPrefs.system': 'System',
    'userPrefs.language': 'Language',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.statistics': 'Statistics',
    'dashboard.recentProjects': 'Recent Projects',
    'dashboard.actionItems': 'Action Items',
    'dashboard.gettingStarted': 'Getting Started',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.loading': 'Loading...',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored === 'de' || stored === 'en') ? stored : 'de';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
