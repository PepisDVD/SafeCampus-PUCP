import Link from "next/link";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@safecampus/ui-kit";
import { CheckCircle2, Shield } from "lucide-react";

export default function BienvenidaPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card className="border-[#001C55]/15">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-[#001C55]">
            <Shield className="h-5 w-5" />
            <Badge className="bg-[#001C55]/10 text-[#001C55]">SafeCampus</Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            Inicio de sesion exitoso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Bienvenido a la app web de SafeCampus. Esta es una pantalla de
            bienvenida de prueba para validar el flujo OAuth + guard de rutas.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-[#001C55] hover:bg-[#002580]">
              <Link href="/dashboard">Ir al Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/incidentes">Ver Incidentes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reportar">Reportar incidente</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
