"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "../ui/sidebar";
import { UserNav, type UserNavUser } from "./user-nav";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  appName: string;
  AppLogo: LucideIcon;
  navItems: NavItem[];
  pathname: string;
  user?: UserNavUser;
  onLogout?: () => void;
  editProfileHref?: string;
};

export function AppSidebar({
  appName,
  AppLogo,
  navItems,
  pathname,
  user,
  onLogout,
  editProfileHref = "/perfil",
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={
        {
          "--sidebar": "#001C55",
          "--sidebar-foreground": "#DBEAFE",
          "--sidebar-accent": "rgba(255, 255, 255, 0.10)",
          "--sidebar-accent-foreground": "#FFFFFF",
          "--sidebar-border": "rgba(255, 255, 255, 0.12)",
          "--sidebar-ring": "rgba(255, 255, 255, 0.45)",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="border-b border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/10">
            <AppLogo className="size-5 text-white" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-bold leading-tight text-white">
              SafeCampus
            </span>
            <span className="block truncate text-[10px] font-medium uppercase leading-tight tracking-wide text-blue-200">
              {appName.replace("SafeCampus ", "")}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu className="gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "h-10 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white",
                    "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center",
                    isActive &&
                      "bg-white/15 text-white shadow-sm ring-1 ring-white/10 hover:bg-white/20 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white",
                  )}
                >
                  <a href={item.href}>
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {user && (
        <>
          <SidebarSeparator className="bg-white/10" />
          <SidebarFooter className="p-2">
            <UserNav
              user={user}
              collapsed={collapsed}
              onLogout={onLogout}
              editProfileHref={editProfileHref}
            />
          </SidebarFooter>
        </>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
