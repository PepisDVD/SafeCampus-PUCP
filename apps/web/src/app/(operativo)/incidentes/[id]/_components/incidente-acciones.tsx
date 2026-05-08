/**
 * 📁 apps/web/src/app/(operativo)/incidentes/[id]/_components/incidente-acciones.tsx
 * 🎯 Panel de acciones de escritura: cambiar estado y asignar operador.
 *    Llama al backend vía features/incidentes/client (PATCH endpoints).
 *    Refresca el server component al terminar para reflejar el nuevo estado.
 * 📦 Módulo: Operativo / Incidentes / Detalle
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle, Loader2, UserPlus } from "lucide-react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "@safecampus/ui-kit";
import {
  EstadoIncidente,
  type IncidenteDetail,
  type OperadorListItem,
} from "@safecampus/shared-types";

import {
  asignarOperadorIncidente,
  cambiarEstadoIncidente,
} from "@/features/incidentes/client";
import {
  ESTADO_STYLE,
  getInitials,
} from "@/features/incidentes/presentation";

type Props = {
  detalle: IncidenteDetail;
  operadores: OperadorListItem[];
};

const ESTADOS_OPCIONES: EstadoIncidente[] = [
  EstadoIncidente.RECIBIDO,
  EstadoIncidente.EN_EVALUACION,
  EstadoIncidente.EN_ATENCION,
  EstadoIncidente.ESCALADO,
  EstadoIncidente.PENDIENTE_INFO,
  EstadoIncidente.RESUELTO,
  EstadoIncidente.CERRADO,
];

type Feedback = { type: "success" | "error"; message: string };

export function IncidenteAcciones({ detalle, operadores }: Props) {
  const router = useRouter();

  // --- Estado: cambiar de estado ---
  const [nuevoEstado, setNuevoEstado] = useState<EstadoIncidente>(detalle.estado);
  const [comentarioEstado, setComentarioEstado] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [feedbackEstado, setFeedbackEstado] = useState<Feedback | null>(null);

  // --- Estado: asignar operador ---
  const [operadorSeleccionado, setOperadorSeleccionado] = useState(
    detalle.operador_asignado?.id ?? "",
  );
  const [comentarioAsignacion, setComentarioAsignacion] = useState("");
  const [savingAsignacion, setSavingAsignacion] = useState(false);
  const [feedbackAsignacion, setFeedbackAsignacion] = useState<Feedback | null>(null);

  const sinCambioEstado =
    nuevoEstado === detalle.estado && !comentarioEstado.trim();
  const sinCambioAsignacion =
    !operadorSeleccionado ||
    operadorSeleccionado === detalle.operador_asignado?.id;

  const onCambiarEstado = async () => {
    if (savingEstado || nuevoEstado === detalle.estado) return;
    setSavingEstado(true);
    setFeedbackEstado(null);
    try {
      await cambiarEstadoIncidente(detalle.id, {
        estado: nuevoEstado,
        comentario: comentarioEstado.trim() || null,
      });
      setComentarioEstado("");
      setFeedbackEstado({
        type: "success",
        message: `Estado actualizado a "${ESTADO_STYLE[nuevoEstado].label}".`,
      });
      router.refresh();
    } catch (error) {
      setFeedbackEstado({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cambiar el estado.",
      });
    } finally {
      setSavingEstado(false);
    }
  };

  const onAsignarOperador = async () => {
    if (savingAsignacion || sinCambioAsignacion) return;
    setSavingAsignacion(true);
    setFeedbackAsignacion(null);
    try {
      await asignarOperadorIncidente(detalle.id, {
        operador_asignado_id: operadorSeleccionado,
        comentario: comentarioAsignacion.trim() || null,
      });
      setComentarioAsignacion("");
      setFeedbackAsignacion({
        type: "success",
        message: "Operador asignado correctamente.",
      });
      router.refresh();
    } catch (error) {
      setFeedbackAsignacion({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo asignar al operador.",
      });
    } finally {
      setSavingAsignacion(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cambiar estado */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <ArrowRightCircle className="h-4 w-4 text-[#001C55]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Cambiar estado
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="estado-select" className="mb-1.5 block text-xs text-slate-500">
              Nuevo estado
            </Label>
            <Select
              value={nuevoEstado}
              onValueChange={(v) => setNuevoEstado(v as EstadoIncidente)}
            >
              <SelectTrigger id="estado-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_OPCIONES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTADO_STYLE[e].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="estado-comentario" className="mb-1.5 block text-xs text-slate-500">
              Comentario (opcional)
            </Label>
            <Textarea
              id="estado-comentario"
              rows={2}
              value={comentarioEstado}
              onChange={(e) => setComentarioEstado(e.target.value)}
              placeholder="Motivo o contexto del cambio…"
            />
          </div>

          {feedbackEstado && (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-xs",
                feedbackEstado.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              {feedbackEstado.message}
            </p>
          )}

          <Button
            type="button"
            disabled={savingEstado || sinCambioEstado}
            onClick={onCambiarEstado}
            className="w-full bg-[#001C55] hover:bg-[#032E84]"
          >
            {savingEstado ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar cambio"
            )}
          </Button>
        </div>
      </section>

      {/* Asignar operador */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#001C55]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Asignar operador
          </h3>
        </div>

        {operadores.length === 0 ? (
          <p className="text-xs text-slate-500">
            No hay operadores ni supervisores activos disponibles para asignar.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="operador-select"
                className="mb-1.5 block text-xs text-slate-500"
              >
                Operador / Supervisor
              </Label>
              <Select
                value={operadorSeleccionado}
                onValueChange={setOperadorSeleccionado}
              >
                <SelectTrigger id="operador-select">
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent>
                  {operadores.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#001C55]/10 text-[9px] font-bold text-[#001C55]">
                          {getInitials(op.nombre_completo)}
                        </span>
                        <span>
                          {op.nombre_completo}{" "}
                          <span className="text-xs text-slate-400">
                            · {op.rol}
                          </span>
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="asignacion-comentario"
                className="mb-1.5 block text-xs text-slate-500"
              >
                Comentario (opcional)
              </Label>
              <Textarea
                id="asignacion-comentario"
                rows={2}
                value={comentarioAsignacion}
                onChange={(e) => setComentarioAsignacion(e.target.value)}
                placeholder="Indicaciones para el operador…"
              />
            </div>

            {feedbackAsignacion && (
              <p
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  feedbackAsignacion.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {feedbackAsignacion.message}
              </p>
            )}

            <Button
              type="button"
              disabled={savingAsignacion || sinCambioAsignacion}
              onClick={onAsignarOperador}
              className="w-full bg-[#001C55] hover:bg-[#032E84]"
            >
              {savingAsignacion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando…
                </>
              ) : (
                "Asignar"
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}