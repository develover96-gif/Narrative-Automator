import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Plug,
  Activity,
  FileText,
  Settings,
  BarChart3,
  Rss,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import logoPath from "@assets/Screenshot_2026-03-16_033017_1773799226854.png";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Activity Feed", url: "/activities", icon: Activity },
  { title: "Content Queue", url: "/content", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Trending Topics", url: "/topics", icon: Rss },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoPath} alt="LinkedQueue logo" className="h-9 w-9 rounded-xl object-cover" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">LinkedQueue</span>
            <span className="text-xs text-muted-foreground">Build in Public, Automatically</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Silent partner — always on</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
