import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { cn } from "../../lib/utils";

/**
 * Indicador de carga reutilizable entre módulos. Estandariza el efecto de
 * "espera" en botones, drawers y refrescos de datos.
 */
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2Icon>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Cargando"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
