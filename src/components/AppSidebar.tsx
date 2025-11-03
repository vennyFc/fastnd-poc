import { LayoutDashboard, Upload, FolderKanban, Package, Users, LogOut, Shield, Layers, Target } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import fastndLogo from '@/assets/fastnd-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Cockpit', url: '/', icon: LayoutDashboard },
  { title: 'Projekte', url: '/projects', icon: FolderKanban },
  { title: 'Produkte', url: '/products', icon: Package },
  { title: 'Kunden', url: '/customers', icon: Users },
  { title: 'Sammlungen', url: '/collections', icon: Layers },
];

const adminMenuItems = [
  { title: 'Admin', url: '/admin', icon: Shield },
  { title: 'Datenhub', url: '/data-hub', icon: Upload },
];

export function AppSidebar() {
  const { signOut, isAdmin } = useAuth();
  const { t } = useLanguage();
  
  const menuItems = [
    { title: t('nav.cockpit'), url: '/', icon: LayoutDashboard },
    { title: t('nav.projects'), url: '/projects', icon: FolderKanban },
    { title: t('nav.products'), url: '/products', icon: Package },
    { title: t('nav.customers'), url: '/customers', icon: Users },
    { title: t('nav.collections'), url: '/collections', icon: Layers },
  ];

  const adminMenuItems = [
    { title: t('nav.admin'), url: '/admin', icon: Shield },
    { title: t('nav.dataHub'), url: '/data-hub', icon: Upload },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={fastndLogo} alt="FASTND Logo" className="h-8 w-auto" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.cockpit')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? 'bg-primary/10 text-primary' : ''
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.administration')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive ? 'bg-primary/10 text-primary' : ''
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
