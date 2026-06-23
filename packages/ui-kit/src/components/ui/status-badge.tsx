import * as React from "react";

import { cn } from "../../lib/utils";
import { Badge } from "./badge";

/**
 * Tono semántico del estado. Estandariza el color de los tags de "Estado"
 * a lo largo de los módulos (usuarios, maestros, etc.).
 */
export type StatusTone = "success" | "neutral" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  neutral: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
  warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  danger: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  info: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
};

export type StatusBadgeProps = React.ComponentProps<typeof Badge> & {
  tone: StatusTone;
};

/** Badge de estado con tono semántico, reutilizable entre módulos. */
function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}

export { StatusBadge };
