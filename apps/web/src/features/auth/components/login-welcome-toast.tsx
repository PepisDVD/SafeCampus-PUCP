"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "@safecampus/ui-kit";

/**
 * Flag de un solo uso en sessionStorage. Lo escriben los flujos de login (SSO y
 * credenciales) justo antes de navegar; este componente lo consume al aterrizar
 * ya autenticado y muestra el toast de bienvenida.
 *
 * Es necesario porque el SSO hace una redirección de página completa (ida y
 * vuelta a Google), por lo que un `toast()` disparado antes de redirigir no
 * sobreviviría a la recarga.
 */
export const LOGIN_WELCOME_FLAG = "safecampus:welcome";

export function LoginWelcomeToast() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flag = window.sessionStorage.getItem(LOGIN_WELCOME_FLAG);
    if (!flag) return;

    // Se consume de inmediato para evitar toasts duplicados (StrictMode/re-render).
    window.sessionStorage.removeItem(LOGIN_WELCOME_FLAG);

    // Si seguimos en el login (SSO cancelado o credenciales inválidas), no es
    // un ingreso exitoso: el banner de error ya comunica lo ocurrido.
    if (pathname.startsWith("/login")) return;

    toast.success("Bienvenido de nuevo");
  }, [pathname]);

  return null;
}
