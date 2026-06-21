import { StatusBadge, type StatusTone } from "@safecampus/ui-kit";
import type { EstadoUsuario } from "../../services/usuario.service";

const CONFIG: Record<EstadoUsuario, { label: string; tone: StatusTone }> = {
  ACTIVO: { label: "Activo", tone: "success" },
  INACTIVO: { label: "Inactivo", tone: "neutral" },
  SUSPENDIDO: { label: "Suspendido", tone: "danger" },
};

export function UsuarioEstadoBadge({ estado }: { estado: EstadoUsuario }) {
  const { label, tone } = CONFIG[estado];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
