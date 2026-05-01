/**
 * 📁 apps/web/src/app/(admin)/integraciones/page.tsx
 * 🎯 Panel de monitoreo de integraciones externas: OpenAI, WhatsApp, Maps, Gmail.
 * 📦 Módulo: Admin / Integraciones
 */

export default function IntegracionesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Integraciones Externas</h1>
      <p className="text-muted-foreground mt-2">
        Monitoreo y configuración de servicios externos conectados
      </p>
      {/* TODO: Implementar tarjetas de estado por servicio (OK, Degradado, Caído) */}
      {/* TODO: Implementar métricas de uso: llamadas, latencia, errores */}
      {/* TODO: Implementar configuración de credenciales */}
      {/* TODO: Servicios: OpenAI API, WhatsApp Business, Google Maps, Gmail OAuth2 */}
    </div>
  );
}
