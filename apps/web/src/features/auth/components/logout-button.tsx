"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth";

type LogoutButtonProps = {
  className?: string;
  /** Cuando es true se muestra solo el icono (sin la etiqueta de texto). */
  iconOnly?: boolean;
};

export function LogoutButton({ className, iconOnly = false }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error("[auth/logout] signOut failed", error);
    } finally {
      router.replace("/login");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      }
      aria-label="Cerrar sesion"
      title="Cerrar sesion"
    >
      <LogOut className="h-4 w-4" />
      {!iconOnly && (loading ? "Saliendo..." : "Cerrar sesion")}
    </button>
  );
}
