/**
 * 📁 apps/web/src/lib/utils.ts
 * 🎯 Función utilitaria `cn()` para combinar clases de Tailwind CSS condicionalmente.
 * 📦 Capa: Lib / Utilidades
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
