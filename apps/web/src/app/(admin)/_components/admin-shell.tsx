"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  AppSidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  type NavItem,
  type UserNavUser,
} from "@safecampus/ui-kit";
import {
  Users,
  Shield,
  Plug,
  ClipboardList,
} from "lucide-react";
import { signOut } from "@/lib/auth";

const ADMIN_NAV: NavItem[] = [
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/roles", label: "Roles y Permisos", icon: Shield },
  { href: "/integraciones", label: "Integraciones", icon: Plug },
  { href: "/auditoria", label: "Auditoría", icon: ClipboardList },
];

type AdminShellProps = {
  user?: UserNavUser;
  children: React.ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // silent
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        appName="SafeCampus Admin"
        AppLogo={Shield}
        navItems={ADMIN_NAV}
        pathname={pathname}
        user={user}
        onLogout={handleLogout}
        editProfileHref="/perfil"
      />
      <SidebarInset className="bg-[#f7f8fb]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1 size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#001C55]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              Administrador de Sistema
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Usuarios, roles, integraciones y auditoria
            </p>
          </div>
          <div className="flex-1" />
        </header>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
