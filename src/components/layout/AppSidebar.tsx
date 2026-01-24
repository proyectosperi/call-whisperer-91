import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Phone,
  PhoneCall,
  Users,
  BookOpen,
  Upload,
  BarChart3,
  FileBarChart,
  LogOut,
  Scissors,
  Settings,
  Globe,
} from 'lucide-react';

const adminNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Llamada 1', url: '/call1', icon: Phone },
  { title: 'Llamada 2', url: '/call2', icon: PhoneCall },
  { title: 'Contactos', url: '/contacts', icon: Users },
  { title: 'Cursos', url: '/courses', icon: BookOpen },
  { title: 'Países', url: '/countries', icon: Globe },
  { title: 'Importar', url: '/import', icon: Upload },
  { title: 'Métricas', url: '/metrics', icon: BarChart3 },
  { title: 'Reportes', url: '/call-reports', icon: FileBarChart },
];

const callerNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Mis Llamadas 1', url: '/call1', icon: Phone },
  { title: 'Mis Llamadas 2', url: '/call2', icon: PhoneCall },
  { title: 'Mis Cursos', url: '/my-courses', icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const navItems = isAdmin ? adminNavItems : callerNavItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Scissors className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-sidebar-foreground truncate">Peri Institute</h1>
              <p className="text-xs text-sidebar-foreground/70 truncate">Gestión de Llamadas</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {collapsed ? '—' : 'Navegación'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 px-2">
            <p className="font-medium text-sidebar-foreground text-sm truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{isAdmin ? 'Administrador' : 'Llamadora'}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          {!collapsed && 'Cerrar sesión'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
