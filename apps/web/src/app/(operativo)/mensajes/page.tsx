/**
 * Centro operativo de mensajes entrantes.
 */

import { Inbox } from "lucide-react";
import { Card } from "@safecampus/ui-kit";

export default function MensajesPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Centro de mensajes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Conversaciones entrantes por canales web, mensajeria y movil.
        </p>
      </div>

      <Card className="p-8 text-center">
        <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">
          La bandeja de conversaciones se implementara en una etapa posterior.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Las notificaciones internas ahora se consultan desde la campana del
          encabezado.
        </p>
      </Card>
    </div>
  );
}
