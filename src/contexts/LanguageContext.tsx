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
    'nav.applications': 'Applikationen',
    
    // Page Titles
    'page.projects': 'Projekte',
    'page.products': 'Produkte',
    'page.customers': 'Kunden',
    'page.collections': 'Sammlungen',
    'page.applications': 'Applikationen',
    'page.admin': 'Admin',
    'page.reports': 'Reports',
    'page.dataHub': 'Datenhub',
    'page.superAdmin': 'Super Admin',
    'page.dashboard': 'Dashboard',
    'page.settings': 'Einstellungen',
    'page.crossSells': 'Cross Sells',
    
    // Search
    'search.placeholder': 'Suche nach Projekten, Produkten, Kunden...',
    'search.noResults': 'Keine Ergebnisse gefunden',
    'search.projects': 'Projekte',
    'search.products': 'Produkte',
    'search.customers': 'Kunden',
    'search.applications': 'Applikationen',
    'search.collections': 'Sammlungen',
    'search.searchProjects': 'Projekte suchen...',
    'search.searchProducts': 'Produkte suchen...',
    'search.searchCustomers': 'Kunde suchen...',
    'search.searchApplications': 'Applikationen suchen...',
    'search.searchCrossSells': 'Cross-Sells suchen...',
    
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
    
    // Common Actions
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
    'common.add': 'Hinzufügen',
    'common.remove': 'Entfernen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.configure': 'Konfigurieren',
    'common.reset': 'Zurücksetzen',
    'common.showAll': 'Alle anzeigen',
    'common.show': 'Anzeigen',
    'common.hide': 'Ausblenden',
    'common.all': 'Alle',
    'common.none': 'Keine',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.confirm': 'Bestätigen',
    'common.reject': 'Ablehnen',
    'common.details': 'Details',
    'common.actions': 'Aktionen',
    'common.noData': 'Keine Daten vorhanden',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    
    // Table Headers - Projects
    'table.projectName': 'Projektname',
    'table.customer': 'Kunde',
    'table.application': 'Applikation',
    'table.applications': 'Applikationen',
    'table.product': 'Produkt',
    'table.products': 'Produkte',
    'table.status': 'Status',
    'table.optimizationStatus': 'Optimierungsstatus',
    'table.created': 'Erstellt',
    'table.lastModified': 'Zuletzt geändert',
    'table.productsInProject': 'Produkte im Projekt',
    'table.crossSellOpportunities': 'Cross-Sell Opportunities',
    
    // Table Headers - Products
    'table.component': 'Bauteil',
    'table.manufacturer': 'Hersteller',
    'table.productFamily': 'Produktfamilie',
    'table.description': 'Beschreibung',
    'table.tags': 'Tags',
    'table.price': 'Preis',
    'table.priceTooltip': 'in €/pcs',
    'table.leadTime': 'Lieferzeit',
    'table.leadTimeTooltip': 'in Wochen',
    'table.inventory': 'Lagerbestand',
    'table.inventoryTooltip': 'in pcs',
    'table.crossSells': 'Cross-Sells',
    'table.link': 'Link',
    'table.alternatives': 'Alternativen',
    'table.reason': 'Grund',
    'table.score': 'Score',
    'table.recommendation': 'Empfehlung',
    'table.action': 'Aktion',
    
    // Table Headers - Customers
    'table.customerName': 'Kunde',
    'table.industry': 'Branche',
    'table.country': 'Land',
    'table.city': 'Stadt',
    'table.category': 'Kategorie',
    'table.projectCount': 'Projekte',
    
    // Optimization Status
    'status.new': 'Neu',
    'status.open': 'Offen',
    'status.review': 'Prüfung',
    'status.validation': 'Validierung',
    'status.completed': 'Abgeschlossen',
    'status.identified': 'Identifiziert',
    'status.suggested': 'Vorgeschlagen',
    'status.accepted': 'Akzeptiert',
    'status.registered': 'Registriert',
    'status.rejected': 'Abgelehnt',
    
    // Filter Options
    'filter.all': 'Alle',
    'filter.allProjects': 'Alle Projekte',
    'filter.allProducts': 'Alle Produkte',
    'filter.allCustomers': 'Alle Kunden',
    'filter.allApplications': 'Alle Applikationen',
    'filter.allCategories': 'Alle Kategorien',
    'filter.allIndustries': 'Alle Branchen',
    'filter.allCountries': 'Alle Länder',
    'filter.allCities': 'Alle Städte',
    'filter.favorites': 'Favoriten',
    'filter.recent': 'Zuletzt',
    'filter.status': 'Status',
    'filter.productFamily': 'Produktfamilie',
    'filter.manufacturer': 'Hersteller',
    'filter.lifecycle': 'Lebenszyklus',
    'filter.npiOnly': 'Nur NPI',
    'filter.topOnly': 'Nur Top',
    
    // Pagination
    'pagination.results': 'Ergebnisse',
    'pagination.resultsPerPage': 'Ergebnisse pro Seite',
    'pagination.of': 'von',
    'pagination.previous': 'Zurück',
    'pagination.next': 'Weiter',
    'pagination.page': 'Seite',
    
    // Dashboard Widgets
    'widget.projects': 'Projekte',
    'widget.statistics': 'Statistiken',
    'widget.actionItems': 'Aktionspunkte',
    'widget.gettingStarted': 'Erste Schritte',
    'widget.optimizationStatus': 'Projekte nach Optimierungsstatus',
    'widget.npiProducts': 'NPI Produkte',
    'widget.addedProducts': 'Hinzugefügte Produkte',
    'widget.loginActivity': 'Login Aktivität',
    'widget.accessStats': 'Zugriffs-Statistiken',
    'widget.search': 'Suche',
    
    // Project Detail
    'project.metadata': 'Projektdetails',
    'project.createdAt': 'Erstellt',
    'project.customer': 'Kunde',
    'project.application': 'Applikation',
    'project.products': 'Produkte',
    'project.crossSells': 'Cross-Sells',
    'project.alternatives': 'Alternativen',
    'project.noProducts': 'Keine Produkte in diesem Projekt',
    'project.noCrossSells': 'Keine Cross-Sell Opportunities verfügbar',
    'project.addProduct': 'Produkt hinzufügen',
    'project.removeProduct': 'Produkt entfernen',
    
    // Product Detail
    'product.details': 'Produktdetails',
    'product.addToCollection': 'Zur Sammlung hinzufügen',
    'product.selectCollection': 'Sammlung auswählen',
    'product.createCollection': 'Neue Sammlung erstellen',
    'product.collectionName': 'Sammlungsname',
    'product.collectionCreated': 'Sammlung erstellt',
    'product.addedToCollection': 'Produkt zur Sammlung hinzugefügt',
    'product.alreadyInCollection': 'Produkt ist bereits in dieser Sammlung',
    
    // Customer Detail
    'customer.details': 'Kundendetails',
    'customer.location': 'Standort',
    'customer.viewProjects': 'Projekte anzeigen',
    
    // Dialogs
    'dialog.confirmDelete': 'Löschen bestätigen',
    'dialog.deleteMessage': 'Möchten Sie diesen Eintrag wirklich löschen?',
    'dialog.inviteUser': 'Benutzer einladen',
    'dialog.addToCollection': 'Zur Sammlung hinzufügen',
    'dialog.removeReason': 'Grund für Entfernung',
    
    // Toast Messages
    'toast.success': 'Erfolgreich',
    'toast.error': 'Fehler',
    'toast.saved': 'Gespeichert',
    'toast.deleted': 'Gelöscht',
    'toast.added': 'Hinzugefügt',
    'toast.removed': 'Entfernt',
    'toast.updated': 'Aktualisiert',
    'toast.loadError': 'Fehler beim Laden',
    'toast.saveError': 'Fehler beim Speichern',
    'toast.deleteError': 'Fehler beim Löschen',
    
    // Admin
    'admin.users': 'Benutzer',
    'admin.inviteUser': 'Benutzer einladen',
    'admin.role': 'Rolle',
    'admin.lastLogin': 'Letzter Login',
    'admin.pendingInvitation': 'Einladung ausstehend',
    'admin.deleteUser': 'Benutzer löschen',
    'admin.userManagement': 'Benutzerverwaltung',
    
    // Removal Reasons
    'removal.technicalFit': 'Technischer Fit',
    'removal.commercialFit': 'Commercial Fit',
    'removal.otherSupplier': 'Anderer Lieferant',
    'removal.noNeed': 'Kein Bedarf',
    'removal.other': 'Sonstige',
    
    // Product Lifecycle
    'lifecycle.comingSoon': 'Coming Soon',
    'lifecycle.active': 'Active',
    'lifecycle.nfnd': 'NFND',
    'lifecycle.discontinued': 'Discontinued',
    
    // Empty States
    'empty.projects': 'Keine Projekte gefunden',
    'empty.products': 'Keine Produkte gefunden',
    'empty.customers': 'Keine Kunden gefunden',
    'empty.collections': 'Keine Sammlungen gefunden',
    'empty.applications': 'Keine Applikationen gefunden',
    'empty.crossSells': 'Keine Cross-Sells verfügbar',
    'empty.alternatives': 'Keine Alternativen verfügbar',
    
    // Column Visibility
    'columns.configure': 'Spalten konfigurieren',
    'columns.reset': 'Zurücksetzen',
    'columns.showAll': 'Alle anzeigen',
    'columns.hideAll': 'Alle ausblenden',
    
    // Quick Filters - Projects
    'quickFilter.all': 'Alle',
    'quickFilter.favorites': 'Favoriten',
    'quickFilter.recent': 'Zuletzt',
    'quickFilter.new': 'Neu',
    'quickFilter.review': 'Prüfen',
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
    'nav.applications': 'Applications',
    
    // Page Titles
    'page.projects': 'Projects',
    'page.products': 'Products',
    'page.customers': 'Customers',
    'page.collections': 'Collections',
    'page.applications': 'Applications',
    'page.admin': 'Admin',
    'page.reports': 'Reports',
    'page.dataHub': 'Data Hub',
    'page.superAdmin': 'Super Admin',
    'page.dashboard': 'Dashboard',
    'page.settings': 'Settings',
    'page.crossSells': 'Cross Sells',
    
    // Search
    'search.placeholder': 'Search for projects, products, customers...',
    'search.noResults': 'No results found',
    'search.projects': 'Projects',
    'search.products': 'Products',
    'search.customers': 'Customers',
    'search.applications': 'Applications',
    'search.collections': 'Collections',
    'search.searchProjects': 'Search projects...',
    'search.searchProducts': 'Search products...',
    'search.searchCustomers': 'Search customers...',
    'search.searchApplications': 'Search applications...',
    'search.searchCrossSells': 'Search cross-sells...',
    
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
    
    // Common Actions
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
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.configure': 'Configure',
    'common.reset': 'Reset',
    'common.showAll': 'Show all',
    'common.show': 'Show',
    'common.hide': 'Hide',
    'common.all': 'All',
    'common.none': 'None',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    'common.reject': 'Reject',
    'common.details': 'Details',
    'common.actions': 'Actions',
    'common.noData': 'No data available',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Table Headers - Projects
    'table.projectName': 'Project Name',
    'table.customer': 'Customer',
    'table.application': 'Application',
    'table.applications': 'Applications',
    'table.product': 'Product',
    'table.products': 'Products',
    'table.status': 'Status',
    'table.optimizationStatus': 'Optimization Status',
    'table.created': 'Created',
    'table.lastModified': 'Last Modified',
    'table.productsInProject': 'Products in Project',
    'table.crossSellOpportunities': 'Cross-Sell Opportunities',
    
    // Table Headers - Products
    'table.component': 'Component',
    'table.manufacturer': 'Manufacturer',
    'table.productFamily': 'Product Family',
    'table.description': 'Description',
    'table.tags': 'Tags',
    'table.price': 'Price',
    'table.priceTooltip': 'in €/pcs',
    'table.leadTime': 'Lead Time',
    'table.leadTimeTooltip': 'in weeks',
    'table.inventory': 'Inventory',
    'table.inventoryTooltip': 'in pcs',
    'table.crossSells': 'Cross-Sells',
    'table.link': 'Link',
    'table.alternatives': 'Alternatives',
    'table.reason': 'Reason',
    'table.score': 'Score',
    'table.recommendation': 'Recommendation',
    'table.action': 'Action',
    
    // Table Headers - Customers
    'table.customerName': 'Customer',
    'table.industry': 'Industry',
    'table.country': 'Country',
    'table.city': 'City',
    'table.category': 'Category',
    'table.projectCount': 'Projects',
    
    // Optimization Status
    'status.new': 'New',
    'status.open': 'Open',
    'status.review': 'Review',
    'status.validation': 'Validation',
    'status.completed': 'Completed',
    'status.identified': 'Identified',
    'status.suggested': 'Suggested',
    'status.accepted': 'Accepted',
    'status.registered': 'Registered',
    'status.rejected': 'Rejected',
    
    // Filter Options
    'filter.all': 'All',
    'filter.allProjects': 'All Projects',
    'filter.allProducts': 'All Products',
    'filter.allCustomers': 'All Customers',
    'filter.allApplications': 'All Applications',
    'filter.allCategories': 'All Categories',
    'filter.allIndustries': 'All Industries',
    'filter.allCountries': 'All Countries',
    'filter.allCities': 'All Cities',
    'filter.favorites': 'Favorites',
    'filter.recent': 'Recent',
    'filter.status': 'Status',
    'filter.productFamily': 'Product Family',
    'filter.manufacturer': 'Manufacturer',
    'filter.lifecycle': 'Lifecycle',
    'filter.npiOnly': 'NPI Only',
    'filter.topOnly': 'Top Only',
    
    // Pagination
    'pagination.results': 'Results',
    'pagination.resultsPerPage': 'Results per page',
    'pagination.of': 'of',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.page': 'Page',
    
    // Dashboard Widgets
    'widget.projects': 'Projects',
    'widget.statistics': 'Statistics',
    'widget.actionItems': 'Action Items',
    'widget.gettingStarted': 'Getting Started',
    'widget.optimizationStatus': 'Projects by Optimization Status',
    'widget.npiProducts': 'NPI Products',
    'widget.addedProducts': 'Added Products',
    'widget.loginActivity': 'Login Activity',
    'widget.accessStats': 'Access Statistics',
    'widget.search': 'Search',
    
    // Project Detail
    'project.metadata': 'Project Details',
    'project.createdAt': 'Created',
    'project.customer': 'Customer',
    'project.application': 'Application',
    'project.products': 'Products',
    'project.crossSells': 'Cross-Sells',
    'project.alternatives': 'Alternatives',
    'project.noProducts': 'No products in this project',
    'project.noCrossSells': 'No cross-sell opportunities available',
    'project.addProduct': 'Add product',
    'project.removeProduct': 'Remove product',
    
    // Product Detail
    'product.details': 'Product Details',
    'product.addToCollection': 'Add to collection',
    'product.selectCollection': 'Select collection',
    'product.createCollection': 'Create new collection',
    'product.collectionName': 'Collection name',
    'product.collectionCreated': 'Collection created',
    'product.addedToCollection': 'Product added to collection',
    'product.alreadyInCollection': 'Product is already in this collection',
    
    // Customer Detail
    'customer.details': 'Customer Details',
    'customer.location': 'Location',
    'customer.viewProjects': 'View projects',
    
    // Dialogs
    'dialog.confirmDelete': 'Confirm Delete',
    'dialog.deleteMessage': 'Are you sure you want to delete this entry?',
    'dialog.inviteUser': 'Invite User',
    'dialog.addToCollection': 'Add to Collection',
    'dialog.removeReason': 'Reason for removal',
    
    // Toast Messages
    'toast.success': 'Success',
    'toast.error': 'Error',
    'toast.saved': 'Saved',
    'toast.deleted': 'Deleted',
    'toast.added': 'Added',
    'toast.removed': 'Removed',
    'toast.updated': 'Updated',
    'toast.loadError': 'Error loading data',
    'toast.saveError': 'Error saving data',
    'toast.deleteError': 'Error deleting data',
    
    // Admin
    'admin.users': 'Users',
    'admin.inviteUser': 'Invite User',
    'admin.role': 'Role',
    'admin.lastLogin': 'Last Login',
    'admin.pendingInvitation': 'Pending Invitation',
    'admin.deleteUser': 'Delete User',
    'admin.userManagement': 'User Management',
    
    // Removal Reasons
    'removal.technicalFit': 'Technical Fit',
    'removal.commercialFit': 'Commercial Fit',
    'removal.otherSupplier': 'Other Supplier',
    'removal.noNeed': 'No Need',
    'removal.other': 'Other',
    
    // Product Lifecycle
    'lifecycle.comingSoon': 'Coming Soon',
    'lifecycle.active': 'Active',
    'lifecycle.nfnd': 'NFND',
    'lifecycle.discontinued': 'Discontinued',
    
    // Empty States
    'empty.projects': 'No projects found',
    'empty.products': 'No products found',
    'empty.customers': 'No customers found',
    'empty.collections': 'No collections found',
    'empty.applications': 'No applications found',
    'empty.crossSells': 'No cross-sells available',
    'empty.alternatives': 'No alternatives available',
    
    // Column Visibility
    'columns.configure': 'Configure columns',
    'columns.reset': 'Reset',
    'columns.showAll': 'Show all',
    'columns.hideAll': 'Hide all',
    
    // Quick Filters - Projects
    'quickFilter.all': 'All',
    'quickFilter.favorites': 'Favorites',
    'quickFilter.recent': 'Recent',
    'quickFilter.new': 'New',
    'quickFilter.review': 'Review',
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
