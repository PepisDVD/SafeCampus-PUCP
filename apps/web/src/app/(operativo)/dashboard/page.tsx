"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@safecampus/ui-kit";
import { EstadoIncidente, NivelSeveridad } from "@safecampus/shared-types";
import {
  AlertTriangle,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { incidentesMock } from "@/features/incidentes/mock-data";

const severityStyles: Record<NivelSeveridad, string> = {
  BAJO: "bg-emerald-100 text-emerald-700",
  MEDIO: "bg-amber-100 text-amber-700",
  ALTO: "bg-orange-100 text-orange-700",
  CRITICO: "bg-red-100 text-red-700",
};

const estadoStyles: Partial<Record<EstadoIncidente, string>> = {
  RECIBIDO: "bg-blue-100 text-blue-700",
  EN_ATENCION: "bg-amber-100 text-amber-700",
  RESUELTO: "bg-green-100 text-green-700",
};

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: typeof AlertTriangle;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between pt-6">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-xl bg-[#001C55]/10 p-2 text-[#001C55]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const activos = incidentesMock.filter(
    (item) =>
      item.estado === EstadoIncidente.RECIBIDO ||
      item.estado === EstadoIncidente.EN_ATENCION,
  );
  const criticos = incidentesMock.filter(
    (item) => item.severidad === NivelSeveridad.CRITICO,
  );
  const resueltos = incidentesMock.filter(
    (item) => item.estado === EstadoIncidente.RESUELTO,
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#001C55]">Dashboard operativo</h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo de incidentes en tiempo real del campus.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Incidentes activos"
          value={activos.length}
          hint="Con seguimiento en curso"
          icon={Siren}
        />
        <MetricCard
          title="Criticos"
          value={criticos.length}
          hint="Prioridad alta"
          icon={AlertTriangle}
        />
        <MetricCard
          title="En atencion"
          value={
            incidentesMock.filter((item) => item.estado === EstadoIncidente.EN_ATENCION)
              .length
          }
          hint="FRT promedio 4.2 min"
          icon={Clock3}
        />
        <MetricCard
          title="Resueltos"
          value={resueltos.length}
          hint="Ultimas 24 horas"
          icon={ShieldCheck}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[#001C55]" />
              Mapa del campus
            </CardTitle>
            <CardDescription>
              Vista referencial de ubicacion de incidentes activos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-[320px] overflow-hidden rounded-xl border bg-[linear-gradient(135deg,#eef7ff_0%,#f8fbff_100%)]">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#001C55_1px,transparent_1px)] [background-size:18px_18px]" />
              {activos.map((item) => (
                <div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${item.posicion_mapa.x}%`,
                    top: `${item.posicion_mapa.y}%`,
                  }}
                >
                  <div className="relative">
                    <span
                      className={`block h-4 w-4 rounded-full border-2 border-white shadow ${item.severidad === NivelSeveridad.CRITICO ? "bg-red-500" : "bg-[#001C55]"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feed de incidentes activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activos.map((item) => (
              <article key={item.id} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {item.codigo}
                  </p>
                  <Badge className={severityStyles[item.severidad]}>
                    {item.severidad}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{item.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.zona}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidentes recientes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidentesMock.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.titulo}</TableCell>
                  <TableCell>{item.zona}</TableCell>
                  <TableCell>
                    <Badge className={severityStyles[item.severidad]}>
                      {item.severidad}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={estadoStyles[item.estado] ?? "bg-gray-100 text-gray-700"}>
                      {item.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.operador_nombre ?? "Sin asignar"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
