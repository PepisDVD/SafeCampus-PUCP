/**
 * 📁 apps/web/src/app/(operativo)/incidentes/[id]/page.tsx
 * 🎯 Detalle del expediente único: historial, evidencias, comentarios, ubicación.
 * 📦 Módulo: Operativo / Incidentes / Detalle
 */

export default function IncidenteDetallePage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Detalle del Incidente</h1>
      <p className="text-muted-foreground mt-2">
        Expediente único con historial completo
      </p>
      {/* TODO: Implementar cabecera con código, estado (badge) y severidad */}
      {/* TODO: Implementar timeline de historial de cambios de estado */}
      {/* TODO: Implementar galería de evidencias (fotos, documentos) */}
      {/* TODO: Implementar sección de comentarios del operador */}
      {/* TODO: Implementar mapa con ubicación del incidente */}
      {/* TODO: Implementar acciones: cambiar estado, asignar, escalar */}
    </div>
  );
}
