/**
 * 📁 apps/web/src/app/(comunidad)/mis-casos/page.tsx
 * 🎯 Lista de casos reportados por el usuario con estado y seguimiento.
 * 📦 Módulo: Comunidad / Mis Casos
 */

export default function MisCasosPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Mis Casos</h1>
      <p className="text-muted-foreground mt-2">
        Seguimiento de tus reportes e incidentes
      </p>
      {/* TODO: Implementar lista de casos con estado (badge de color) */}
      {/* TODO: Implementar filtros por estado: Activo, Resuelto, Cerrado */}
      {/* TODO: Implementar detalle expandible con historial de cambios */}
    </div>
  );
}
