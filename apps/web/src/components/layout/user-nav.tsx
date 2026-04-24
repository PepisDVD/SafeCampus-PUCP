"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, PencilLine, UserCircle2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@safecampus/ui-kit";

import { signOut } from "@/lib/auth";
import type { MyProfileResponse } from "@/lib/api/profile";

type UserNavProps = {
  profile: MyProfileResponse | null;
  collapsed?: boolean;
};

function initialsFromName(profile: MyProfileResponse | null): string {
  if (!profile) return "??";
  const tokens = `${profile.nombre} ${profile.apellido}`
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!tokens.length) return "??";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

function roleLabel(profile: MyProfileResponse | null): string {
  const primaryRole = profile?.roles?.[0] ?? "";
  if (primaryRole === "administrador") return "Administrador del Sistema";
  if (primaryRole === "supervisor") return "Supervisor de Seguridad";
  if (primaryRole === "operador") return "Operador de Seguridad";
  if (primaryRole === "comunidad") return "Comunidad PUCP";
  return "Usuario SafeCampus";
}

export function UserNav({ profile, collapsed }: UserNavProps) {
  const router = useRouter();

  const fullName = profile ? `${profile.nombre} ${profile.apellido}`.trim() : "Cargando usuario";

  const onLogout = async () => {
    await signOut().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 text-left hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#001C55] text-xs font-semibold text-white">
            {initialsFromName(profile)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel(profile)}</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4" />
          Sesión activa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil" className="flex items-center gap-2">
            <PencilLine className="h-4 w-4" />
            Editar perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onLogout()} className="text-red-600 focus:text-red-700">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
