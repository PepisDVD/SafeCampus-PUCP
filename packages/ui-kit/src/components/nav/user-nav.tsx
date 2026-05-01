"use client";

import * as React from "react";
import { LogOut, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

export type UserNavUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type UserNavProps = {
  user: UserNavUser;
  collapsed?: boolean;
  onLogout?: () => void;
  editProfileHref?: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
  }>;
};

function DefaultUserNavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function UserNav({
  user,
  collapsed = false,
  onLogout,
  editProfileHref = "/perfil",
  LinkComponent,
}: UserNavProps) {
  const UserNavLink = LinkComponent ?? DefaultUserNavLink;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm text-sidebar-foreground",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            "transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="size-8 shrink-0 rounded-xl">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            )}
            <AvatarFallback className="rounded-xl bg-white/15 text-xs font-semibold text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-none">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <UserNavLink href={editProfileHref} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Editar perfil
          </UserNavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
