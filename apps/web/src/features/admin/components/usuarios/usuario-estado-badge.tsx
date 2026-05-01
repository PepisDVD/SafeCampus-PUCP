import { Badge } from "@safecampus/ui-kit";
import type { EstadoUsuario } from "../../services/usuario.service";

const CONFIG: Record<
  EstadoUsuario,
  { label: string; className: string }
> = {
  ACTIVO: {
    label: "Activo",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  },
  INACTIVO: {
    label: "Inactivo",
    className: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
  },
  SUSPENDIDO: {
    label: "Suspendido",
    className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
  },
};

export function UsuarioEstadoBadge({ estado }: { estado: EstadoUsuario }) {
  const { label, className } = CONFIG[estado];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
