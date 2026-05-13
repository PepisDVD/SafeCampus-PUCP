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
import { ArrowRightCircle, Loader2, Sparkles, UserPlus } from "lucide-react";
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
  generarBorradorCierreIa,
} from "@/features/incidentes/client";
import {
  ESTADO_STYLE,
  getInitials,
} from "@/features/incidentes/presentation";

type Props = {
  detalle: IncidenteDetail;
  operadores: OperadorListItem[];
  mode?: "both" | "estado" | "asignacion";
  onCompleted?: () => void;
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

export function IncidenteAcciones({
  detalle,
  operadores,
  mode = "both",
  onCompleted,
}: Props) {
  const router = useRouter();

  // --- Estado: cambiar de estado ---
  const [nuevoEstado, setNuevoEstado] = useState<EstadoIncidente>(detalle.estado);
  const [comentarioEstado, setComentarioEstado] = useState("");
  const [resumenCierre, setResumenCierre] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  const [generatingCierreAi, setGeneratingCierreAi] = useState(false);
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
  const cerrandoIncidente =
    nuevoEstado === EstadoIncidente.CERRADO &&
    detalle.estado !== EstadoIncidente.CERRADO;
  const resumenCierreInvalido =
    cerrandoIncidente && resumenCierre.trim().length < 20;
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
        resumen_cierre: cerrandoIncidente ? resumenCierre.trim() : null,
        resultado_cierre: cerrandoIncidente
          ? resultadoCierre.trim() || null
          : null,
      });
      setComentarioEstado("");
      setResumenCierre("");
      setResultadoCierre("");
      setFeedbackEstado({
        type: "success",
        message: `Estado actualizado a "${ESTADO_STYLE[nuevoEstado].label}".`,
      });
      onCompleted?.();
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

  const onGenerarBorradorCierreIa = async () => {
    if (generatingCierreAi || !cerrandoIncidente) return;
    setGeneratingCierreAi(true);
    setFeedbackEstado(null);
    try {
      const draft = await generarBorradorCierreIa(detalle.id);
      setResumenCierre(draft.resumen_cierre);
      setResultadoCierre(draft.resultado_cierre ?? "");
      setFeedbackEstado({
        type: "success",
        message: "Borrador generado con IA. Revisalo antes de cerrar el caso.",
      });
    } catch (error) {
      setFeedbackEstado({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo generar el borrador con IA.",
      });
    } finally {
      setGeneratingCierreAi(false);
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
      onCompleted?.();
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
    <div id="acciones-incidente" className="space-y-4 scroll-mt-24">
      {mode !== "asignacion" && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
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

          {cerrandoIncidente && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <Button
                type="button"
                variant="outline"
                disabled={generatingCierreAi || savingEstado}
                onClick={onGenerarBorradorCierreIa}
                className="mb-3 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              >
                {generatingCierreAi ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando borrador...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar resumen con IA
                  </>
                )}
              </Button>

              <Label
                htmlFor="cierre-resumen"
                className="mb-1.5 block text-xs font-medium text-amber-900"
              >
                Resumen de cierre *
              </Label>
              <Textarea
                id="cierre-resumen"
                rows={4}
                value={resumenCierre}
                onChange={(e) => setResumenCierre(e.target.value)}
                placeholder="Describe qué ocurrió, cómo se atendió y por qué el caso queda cerrado."
                className="bg-white"
              />
              <Label
                htmlFor="cierre-resultado"
                className="mt-3 mb-1.5 block text-xs font-medium text-amber-900"
              >
                Resultado (opcional)
              </Label>
              <Textarea
                id="cierre-resultado"
                rows={2}
                value={resultadoCierre}
                onChange={(e) => setResultadoCierre(e.target.value)}
                placeholder="Ej. Resuelto sin escalamiento, derivado a unidad interna, informe emitido."
                className="bg-white"
              />
              {resumenCierreInvalido && (
                <p className="mt-2 text-xs text-amber-800">
                  El resumen debe tener al menos 20 caracteres para generar el expediente.
                </p>
              )}
            </div>
          )}

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
            disabled={savingEstado || sinCambioEstado || resumenCierreInvalido}
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
      )}

      {/* Asignar operador */}
      {mode !== "estado" && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
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
      )}
    </div>
  );
}
