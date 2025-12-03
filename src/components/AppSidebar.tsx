import { LayoutDashboard, Upload, FolderKanban, Package, Users, LogOut, Shield, Layers, BarChart3, Activity, Boxes, CheckSquare } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import fastndLogo from '@/assets/fastnd-logo-blue-black.png';
import fastndIconCollapsed from '@/assets/fastnd-icon-collapsed.png';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar';

export function AppSidebar() {
  const {
    signOut,
    isSuperAdmin,
    isTenantAdmin,
    activeTenant
  } = useAuth();
  const {
    t
  } = useLanguage();
  const location = useLocation();
  const { state } = useSidebar();
  
  const allMenuItems = [{
    title: t('nav.cockpit'),
    url: '/',
    icon: LayoutDashboard
  }, {
    title: t('nav.projects'),
    url: '/projects',
    icon: FolderKanban
  }, {
    title: t('nav.products'),
    url: '/products',
    icon: Package
  }, {
    title: t('nav.collections'),
    url: '/collections',
    icon: Layers
  }, {
    title: 'Applikationen',
    url: '/applications',
    icon: Boxes
  }, {
    title: t('nav.customers'),
    url: '/customers',
    icon: Users
  }, {
    title: t('nav.reports'),
    url: '/reports',
    icon: BarChart3
  }, {
    title: 'Aufgaben',
    url: '/tasks',
    icon: CheckSquare
  }];

  // Hide Projekte, Produkte, Kunden, Sammlungen, Applikationen, Aufgaben for Super Admins in Global view
  const disabledUrls = ['/projects', '/products', '/customers', '/collections', '/applications', '/tasks'];
  const isGlobalView = isSuperAdmin && activeTenant?.id === 'global';
  const menuItems = allMenuItems.filter(item => !isGlobalView || !disabledUrls.includes(item.url));
  const tenantAdminMenuItems = [{
    title: t('nav.admin'),
    url: '/admin',
    icon: Shield
  }, {
    title: t('nav.dataHub'),
    url: '/data-hub',
    icon: Upload
  }];
  const superAdminMenuItems = [{
    title: 'Super Admin',
    url: '/super-admin',
    icon: Shield
  }, {
    title: 'Access Logs',
    url: '/access-logs',
    icon: Activity
  }];
  return <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3 justify-center">
          <img 
            src={state === "collapsed" ? fastndIconCollapsed : fastndLogo} 
            alt="FASTND Logo" 
            className={state === "collapsed" ? "h-9 w-auto object-contain" : "h-8 w-auto"} 
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url || item.url !== '/' && location.pathname.startsWith(item.url)} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary rounded-lg">
                    <NavLink to={item.url} end={item.url === '/'}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isTenantAdmin || isSuperAdmin && activeTenant?.id !== 'global') && <SidebarGroup>
            <SidebarGroupLabel>Utility</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {tenantAdminMenuItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url || item.url !== '/' && location.pathname.startsWith(item.url)} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary rounded-lg">
                      <NavLink to={item.url} end={item.url === '/'}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

        {isSuperAdmin && <SidebarGroup>
            <SidebarGroupLabel>{t('nav.administration')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {superAdminMenuItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url || item.url !== '/' && location.pathname.startsWith(item.url)} className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary rounded-lg">
                      <NavLink to={item.url} end={item.url === '/'}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
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
    </Sidebar>;
}