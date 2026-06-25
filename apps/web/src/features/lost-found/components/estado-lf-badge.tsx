import { Badge, cn } from "@safecampus/ui-kit";

import { ESTADO_LF_FALLBACK_TONE, estadoLabel, estadoLfTone } from "../presentation";

/**
 * Badge de estado compartido a nivel de módulo Lost & Found.
 * Reutilizable en todos los submódulos (hilos, operativo, logística) para que
 * el diseño de los estados (caso y custodia) sea consistente.
 */
export function EstadoLfBadge({ estado, className }: { estado: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn(estadoLfTone[estado] ?? ESTADO_LF_FALLBACK_TONE, className)}>
      {estadoLabel(estado)}
    </Badge>
  );
}
