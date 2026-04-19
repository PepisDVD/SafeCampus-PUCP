/**
 * 📁 apps/web/src/app/(operativo)/mensajes/page.tsx
 * 🎯 Módulo centralizado de gestión de mensajes entrantes (WhatsApp, web, móvil).
 * 📦 Módulo: Operativo / Mensajes
 */

export default function MensajesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Centro de Mensajes</h1>
      <p className="text-muted-foreground mt-2">
        Gestión centralizada de mensajes entrantes por todos los canales
      </p>
      {/* TODO: Implementar lista de conversaciones con indicador de canal */}
      {/* TODO: Implementar vista de chat/mensajes */}
      {/* TODO: Implementar filtros: canal (WhatsApp, Web, Móvil), estado */}
      {/* TODO: Implementar acción de crear incidente desde mensaje */}
    </div>
  );
}
