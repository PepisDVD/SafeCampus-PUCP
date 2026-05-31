import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@safecampus/ui-kit";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#001C55]/10 text-[#001C55]">
            <WifiOff className="h-6 w-6" />
          </div>
          <CardTitle>Sin conexion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Algunas pantallas guardadas pueden seguir disponibles. Vuelve a intentarlo cuando recuperes conexion.
          </p>
          <Button asChild className="w-full">
            <Link href="/inicio">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
