/**
 * 📁 apps/web/src/app/(operativo)/kpis/page.tsx
 * 🎯 Panel de indicadores operativos: FRT, TMR, volumen, distribución, tasa de resolución.
 * 📦 Módulo: Operativo / KPIs
 */

export default function KPIsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Indicadores Operativos (KPIs)</h1>
      <p className="text-muted-foreground mt-2">
        Métricas de rendimiento del sistema de gestión de incidentes
      </p>
      {/* TODO: Implementar tarjetas KPI: FRT, TMR, volumen, tasa de resolución */}
      {/* TODO: Implementar gráfico de tendencia temporal */}
      {/* TODO: Implementar distribución por categoría (pie/donut chart) */}
      {/* TODO: Implementar distribución por severidad (bar chart) */}
      {/* TODO: Implementar filtros de período: día, semana, mes, personalizado */}
    </div>
  );
}
