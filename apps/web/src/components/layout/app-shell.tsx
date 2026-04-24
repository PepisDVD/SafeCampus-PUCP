"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Menu, Shield } from "lucide-react";

import { cn } from "@safecampus/ui-kit";

import { profileApi, type MyProfileResponse } from "@/lib/api/profile";

import { type AppNavLeaf, type AppNavItem, type AppRoleName } from "./navigation";
import { UserNav } from "./user-nav";

type AppShellProps = {
  appTitle: string;
  appSubtitle: string;
  navItems: AppNavItem[];
  children: React.ReactNode;
};

const ADMIN_FIXED_TITLE = "Panel de administración";
const ADMIN_FIXED_SUBTITLE = "Gestión de usuarios y seguridad";

function normalizeRole(value: string): AppRoleName | null {
  if (value === "administrador") return "administrador";
  if (value === "supervisor") return "supervisor";
  if (value === "operador") return "operador";
  if (value === "comunidad") return "comunidad";
  return null;
}

export function AppShell({ appTitle, appSubtitle, navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    void profileApi
      .getMe()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const userRoles = useMemo(
    () => (profile?.roles ?? []).map((role) => normalizeRole(role)).filter(Boolean) as AppRoleName[],
    [profile],
  );

  const resolvedAppTitle = userRoles.includes("administrador")
    ? ADMIN_FIXED_TITLE
    : appTitle;
  const resolvedAppSubtitle = userRoles.includes("administrador")
    ? ADMIN_FIXED_SUBTITLE
    : appSubtitle;

  const filteredNavItems = useMemo(() => {
    const sourceItems = userRoles.length === 0
      ? navItems
      : navItems.filter((item) => item.roles.some((role) => userRoles.includes(role)));

    return sourceItems
      .map((item) => {
        if (!item.children?.length) return item;
        const children = userRoles.length === 0
          ? item.children
          : item.children.filter((child) => child.roles.some((role) => userRoles.includes(role)));
        return { ...item, children };
      })
      .filter((item) => !item.children || item.children.length > 0);
  }, [navItems, userRoles]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const item of filteredNavItems) {
        if (!item.children?.length) continue;
        if (next[item.label] !== undefined) continue;
        const hasActiveChild = item.children.some(
          (child) => pathname === child.href || pathname?.startsWith(`${child.href}/`),
        );
        next[item.label] = hasActiveChild;
      }
      return next;
    });
  }, [filteredNavItems, pathname]);

  const isLeafActive = (item: AppNavLeaf) => pathname === item.href || pathname?.startsWith(`${item.href}/`);

  const SidebarNav = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-white",
        mobile ? "w-72" : collapsed ? "w-20" : "w-72",
      )}
    >
      <div className={cn("flex items-center gap-3 border-b px-4 py-4", collapsed && !mobile && "justify-center") }>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001C55] text-white">
          <Shield className="h-5 w-5" />
        </div>
        {(!collapsed || mobile) && (
          <div>
            <p className="text-sm font-semibold text-slate-900">SafeCampus</p>
            <p className="text-xs text-muted-foreground">{resolvedAppSubtitle}</p>
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {filteredNavItems.map((item) => {
          if (!item.children?.length) {
            const active = isLeafActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  collapsed && !mobile ? "justify-center" : "",
                  active ? "bg-[#001C55] text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!collapsed || mobile) && (
                  <p className="truncate font-medium">{item.label}</p>
                )}
              </Link>
            );
          }

          const groupOpen = expandedGroups[item.label] ?? false;
          const hasActiveChild = item.children.some((child) => isLeafActive(child));

          return (
            <div key={`${item.href}-${item.label}`} className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (collapsed && !mobile) {
                    setCollapsed(false);
                    setExpandedGroups((prev) => ({ ...prev, [item.label]: true }));
                    return;
                  }
                  setExpandedGroups((prev) => ({ ...prev, [item.label]: !groupOpen }));
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  collapsed && !mobile ? "justify-center" : "",
                  hasActiveChild ? "bg-[#001C55] text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {(!collapsed || mobile) && (
                  <>
                    <p className="min-w-0 flex-1 truncate font-medium">{item.label}</p>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", groupOpen ? "rotate-180" : "")} />
                  </>
                )}
              </button>

              {(!collapsed || mobile) && (
                <div
                  className={cn(
                    "overflow-hidden pl-3 transition-all duration-200 ease-out",
                    groupOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <div className="space-y-1 pb-1">
                  {item.children.map((child) => {
                    const childActive = isLeafActive(child);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          childActive ? "bg-[#193b7a] text-white" : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <child.icon className="h-4 w-4 shrink-0" />
                        <p className="truncate font-medium">{child.label}</p>
                      </Link>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <UserNav profile={profile} collapsed={collapsed && !mobile} />
      </div>
    </aside>
  );

  return (
    <div className="h-screen bg-slate-50 md:flex">
      <div className="hidden shrink-0 md:block">
        <SidebarNav />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="relative z-10 h-full">
            <SidebarNav mobile />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-lg border p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú lateral"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden rounded-lg border p-2 text-slate-600 hover:bg-slate-100 md:inline-flex"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label="Colapsar menú"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{resolvedAppTitle}</p>
            <p className="truncate text-sm font-semibold text-slate-800">{resolvedAppSubtitle}</p>
          </div>

          <button type="button" className="rounded-lg border p-2 text-slate-600 hover:bg-slate-100">
            <Bell className="h-4 w-4" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
