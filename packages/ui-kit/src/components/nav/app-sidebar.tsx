"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "../ui/sidebar";
import { UserNav, type UserNavUser } from "./user-nav";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  children?: Omit<NavItem, "section" | "children">[];
};

type AppLogoComponent = React.ComponentType<{ className?: string }>;

type SidebarLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

type AppSidebarProps = {
  appName: string;
  AppLogo: AppLogoComponent;
  navItems: NavItem[];
  pathname: string;
  user?: UserNavUser;
  onLogout?: () => void;
  editProfileHref?: string;
  LinkComponent?: React.ComponentType<SidebarLinkProps>;
};

function DefaultSidebarLink({ href, children, className }: SidebarLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

type CollapsibleNavGroupProps = {
  item: NavItem;
  isActive: boolean;
  pathname: string;
  SidebarLink: React.ComponentType<SidebarLinkProps>;
};

function CollapsibleNavGroup({ item, isActive, pathname, SidebarLink }: CollapsibleNavGroupProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [open, setOpen] = React.useState(isActive);
  const firstChildHref = item.children?.[0]?.href ?? item.href;
  const handleParentClick = (event: React.MouseEvent<HTMLElement>) => {
    if (collapsed) return;
    event.preventDefault();
    setOpen((v) => !v);
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.label}
        isActive={isActive}
        onClick={handleParentClick}
        className={cn(
          "h-10 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white cursor-pointer",
          "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center",
          isActive &&
            "bg-white/15 text-white shadow-sm ring-1 ring-white/10 hover:bg-white/20 hover:text-white",
        )}
      >
        <SidebarLink href={firstChildHref}>
          <item.icon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
          <ChevronRight
            className={cn(
              "ml-auto size-3.5 shrink-0 text-blue-200/60 transition-transform duration-200",
              "group-data-[collapsible=icon]:hidden",
              open && "rotate-90",
            )}
          />
        </SidebarLink>
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
          {item.children!.map((child) => {
            const childActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={childActive}
                  className={cn(
                    "rounded-lg text-blue-100/80 hover:bg-white/10 hover:text-white",
                    childActive && "bg-white/10 text-white",
                  )}
                >
                  <SidebarLink href={child.href}>
                    <child.icon className="size-3.5" />
                    <span>{child.label}</span>
                  </SidebarLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  appName,
  AppLogo,
  navItems,
  pathname,
  user,
  onLogout,
  editProfileHref = "/perfil",
  LinkComponent,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const SidebarLink = LinkComponent ?? DefaultSidebarLink;

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
          {navItems.map((item, index) => {
            const isChildActive = item.children?.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
            );
            const isActive =
              (!item.children && (pathname === item.href || pathname.startsWith(item.href + "/"))) ||
              !!isChildActive;
            const previousSection = index > 0 ? navItems[index - 1]?.section : undefined;
            const showSectionHeader = !!item.section && item.section !== previousSection;

            return (
              <React.Fragment key={item.href}>
                {showSectionHeader && (
                  <>
                    {index > 0 && <SidebarSeparator className="my-2 bg-white/10" />}
                    <div className="px-3 py-1 group-data-[collapsible=icon]:hidden">
                      <p className="text-[10px] font-semibold tracking-wide text-blue-200/85 uppercase">
                        {item.section}
                      </p>
                    </div>
                  </>
                )}
                {item.children ? (
                  <CollapsibleNavGroup
                    item={item}
                    isActive={isActive}
                    pathname={pathname}
                    SidebarLink={SidebarLink}
                  />
                ) : (
                  <SidebarMenuItem>
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
                      <SidebarLink href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </React.Fragment>
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
              LinkComponent={SidebarLink}
            />
          </SidebarFooter>
        </>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
