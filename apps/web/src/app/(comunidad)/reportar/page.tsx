/**
 * Wizard de reporte de incidente.
 *
 * Client Component: persiste el reporte via API HTTP. No accede a la BD
 * directamente.
 */

"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@safecampus/ui-kit";
import {
  CheckCircle2,
  Flame,
  HeartPulse,
  Loader2,
  MapPin,
  Navigation,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  CAMPUS_ZONE_LOCATIONS,
  NivelSeveridad,
  type CampusZoneLocation,
  type IncidenteCreated,
  type IncidenteCreateInput,
  type IncidenteLiveLocationUpdate,
  type UbicacionMaestra,
} from "@safecampus/shared-types";

import {
  SEVERIDAD_COLOR,
  SEVERIDAD_LABEL,
} from "@/features/incidentes/presentation";
import { useGeolocation } from "@/hooks/use-geolocation";
import { api } from "@/lib/api/client";
import { formatLimaDateTime } from "@/lib/lima-date";

type Step = 0 | 1 | 2 | 3 | 4;

const tiposIncidente = [
  {
    id: "robo",
    label: "Robo / Hurto",
    icon: ShieldAlert,
    titulo: "Robo o hurto reportado",
  },
  {
    id: "emergencia_medica",
    label: "Emergencia medica",
    icon: HeartPulse,
    titulo: "Emergencia medica reportada",
  },
  {
    id: "incendio",
    label: "Incendio / Humo",
    icon: Flame,
    titulo: "Incendio o humo reportado",
  },
] as const;

const severidades = [
  {
    id: NivelSeveridad.BAJO,
    descripcion: "Situacion sin riesgo inmediato.",
  },
  {
    id: NivelSeveridad.MEDIO,
    descripcion: "Requiere seguimiento del equipo.",
  },
  {
    id: NivelSeveridad.ALTO,
    descripcion: "Riesgo relevante o atencion pronta.",
  },
  {
    id: NivelSeveridad.CRITICO,
    descripcion: "Emergencia o peligro inmediato.",
  },
] as const;

const FALLBACK_ZONAS: CampusZoneLocation[] = [...CAMPUS_ZONE_LOCATIONS];

function toZoneLocation(u: UbicacionMaestra): CampusZoneLocation {
  return { id: u.id, label: u.nombre, latitud: u.latitud, longitud: u.longitud };
}

type LocationSource = "zona" | "gps" | "live";

export default function ReportarPage() {
  const router = useRouter();
  const {
    location,
    loading: ubicando,
    error: ubicacionError,
    watching: ubicacionEnVivo,
    lastUpdatedAt: ubicacionActualizadaEn,
    requestLocation,
    startLiveLocation,
    stopLiveLocation,
    clearLocation,
  } = useGeolocation();
  const [step, setStep] = useState<Step>(0);
  const [tipo, setTipo] = useState<string>("");
  const [severidad, setSeveridad] = useState<NivelSeveridad | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [zona, setZona] = useState("");
  const [locationSource, setLocationSource] = useState<LocationSource>("zona");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<IncidenteCreated | null>(null);
  const [liveTrackingActive, setLiveTrackingActive] = useState(false);
  const [liveTrackingError, setLiveTrackingError] = useState<string | null>(null);
  const [zonasCampus, setZonasCampus] =
    useState<CampusZoneLocation[]>(FALLBACK_ZONAS);
  const latestLocationRef = useRef(location);

  useEffect(() => {
    latestLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    api
      .get<UbicacionMaestra[]>("/maestros/ubicaciones", {
        params: { include_inactive: "true" },
      })
      .then((data) => {
        const zonas = data.map(toZoneLocation);
        if (zonas.length > 0) setZonasCampus(zonas);
      })
      .catch(() => {
        // Mantiene el fallback hardcodeado si la API no responde
      });
  }, []);

  useEffect(() => {
    if (!creado || !liveTrackingActive) return undefined;

    const sendCurrentLocation = async () => {
      const currentLocation = latestLocationRef.current;
      if (!currentLocation) return;
      const payload: IncidenteLiveLocationUpdate = {
        latitud: currentLocation.latitud,
        longitud: currentLocation.longitud,
        precision_metros: currentLocation.precision_metros,
        activo: true,
      };
      try {
        await api.patch(`/incidentes/${creado.id}/ubicacion-live`, payload);
        setLiveTrackingError(null);
      } catch (e) {
        setLiveTrackingError(
          e instanceof Error
            ? e.message
            : "No se pudo actualizar tu ubicacion en vivo.",
        );
      }
    };

    void sendCurrentLocation();
    const interval = window.setInterval(() => void sendCurrentLocation(), 5000);
    return () => window.clearInterval(interval);
  }, [creado, liveTrackingActive]);

  const puedeContinuar = useMemo(() => {
    if (step === 0) return Boolean(tipo);
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) {
      return Boolean(zona) || (locationSource === "live" && Boolean(location));
    }
    return true;
  }, [location, locationSource, step, tipo, zona]);

  const siguiente = () => {
    if (!puedeContinuar || step === 4) return;
    setStep((actual) => (actual + 1) as Step);
  };

  const volver = () => {
    if (step === 0) return;
    setStep((actual) => (actual - 1) as Step);
  };

  const reset = () => {
    setStep(0);
    setTipo("");
    setSeveridad("");
    setDescripcion("");
    setZona("");
    setLocationSource("zona");
    stopLiveLocation();
    setLiveTrackingActive(false);
    setLiveTrackingError(null);
    setReferencia("");
    setError(null);
    setCreado(null);
  };

  const enviar = async () => {
    if (!puedeContinuar || enviando) return;
    setEnviando(true);
    setError(null);

    const tipoSeleccionado = tiposIncidente.find((t) => t.id === tipo);
    const zonaSeleccionada = zonasCampus.find((item) => item.id === zona);
    const activeLocation =
      (locationSource === "gps" || locationSource === "live") && location
        ? {
            latitud: location.latitud,
            longitud: location.longitud,
          }
        : zonaSeleccionada
          ? {
              latitud: zonaSeleccionada.latitud,
              longitud: zonaSeleccionada.longitud,
          }
        : null;
    const lugarBase =
      zonaSeleccionada?.label ??
      (locationSource === "live" ? "Ubicacion GPS en vivo" : zona);
    const lugar = referencia.trim()
      ? `${lugarBase} - ${referencia.trim()}`
      : lugarBase;

    const payload: IncidenteCreateInput = {
      titulo: tipoSeleccionado?.titulo ?? "Incidente reportado",
      descripcion: descripcion.trim() || null,
      severidad: severidad || null,
      categoria: tipo,
      lugar_referencia: lugar,
      latitud: activeLocation?.latitud ?? null,
      longitud: activeLocation?.longitud ?? null,
    };

    try {
      const result = await api.post<IncidenteCreated>("/incidentes/", payload);
      if (locationSource === "live" && location) {
        setLiveTrackingActive(true);
      }
      setCreado(result);
      setStep(4);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el reporte.");
    } finally {
      setEnviando(false);
    }
  };

  const detenerUbicacionEnVivo = async () => {
    if (!creado) return;
    setLiveTrackingActive(false);
    stopLiveLocation();
    try {
      await api.post(`/incidentes/${creado.id}/ubicacion-live/stop`);
      setLiveTrackingError(null);
    } catch (e) {
      setLiveTrackingError(
        e instanceof Error
          ? e.message
          : "No se pudo detener la ubicacion en vivo en el servidor.",
      );
    }
  };

  if (step === 4 && creado) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 pb-24">
        <Card className="border-green-200">
          <CardHeader className="items-center text-center">
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle>Reporte enviado</CardTitle>
            <CardDescription>
              Tu caso fue registrado como{" "}
              <span className="font-semibold text-foreground">{creado.codigo}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveTrackingActive && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <p className="font-medium">Ubicacion en vivo activa</p>
                <p className="text-xs">
                  El operador vera tu ultima posicion mientras esta pantalla siga
                  abierta.
                </p>
                {location && (
                  <p className="mt-1 text-xs">
                    Ultimo punto: {location.latitud.toFixed(6)},{" "}
                    {location.longitud.toFixed(6)}
                  </p>
                )}
              </div>
            )}
            {liveTrackingError && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {liveTrackingError}
              </p>
            )}
            {liveTrackingActive && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={detenerUbicacionEnVivo}
              >
                Detener ubicacion en vivo
              </Button>
            )}
            <Button asChild className="w-full bg-[#001C55] hover:bg-[#032E84]">
              <Link href="/mis-casos">Ver mis casos</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={reset}
            >
              Crear nuevo reporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-[#001C55]">Reportar incidente</h1>
        <p className="text-sm text-muted-foreground">
          Formulario guiado para registrar incidentes de seguridad.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {["Tipo", "Prioridad", "Detalle", "Ubicacion"].map((label, index) => (
          <div key={label} className="space-y-1">
            <div
              className={`h-1.5 rounded-full ${
                index <= step ? "bg-[#001C55]" : "bg-muted"
              }`}
            />
            <p
              className={`text-xs ${
                index === step
                  ? "font-semibold text-[#001C55]"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 0 && "Selecciona el tipo de incidente"}
            {step === 1 && "Indica la prioridad"}
            {step === 2 && "Describe lo ocurrido"}
            {step === 3 && "Confirma la ubicacion"}
          </CardTitle>
          <CardDescription>
            {step === 0 && "Esto permite clasificar la atencion operativa."}
            {step === 1 && "Puedes indicar tu percepcion o dejar que la IA priorice."}
            {step === 2 && "Opcional: agrega contexto util para responder mas rapido."}
            {step === 3 && "Ubicacion precisa para despacho de operadores."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {tiposIncidente.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setTipo(opcion.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    tipo === opcion.id
                      ? "border-[#001C55] bg-[#001C55]/5"
                      : "hover:border-[#001C55]/40"
                  }`}
                >
                  <opcion.icon className="mb-2 h-5 w-5 text-[#001C55]" />
                  <p className="text-sm font-semibold">{opcion.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {severidades.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setSeveridad(opcion.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    severidad === opcion.id
                      ? "border-[#001C55] bg-[#001C55]/5"
                      : "hover:border-[#001C55]/40"
                  }`}
                >
                  <span
                    className={`mb-2 block h-2.5 w-2.5 rounded-full ${
                      SEVERIDAD_COLOR[opcion.id]
                    }`}
                  />
                  <p className="text-sm font-semibold">
                    {SEVERIDAD_LABEL[opcion.id]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {opcion.descripcion}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Descripcion del incidente (opcional)</p>
                <Textarea
                  value={descripcion}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescripcion(event.target.value)
                  }
                  rows={5}
                  placeholder="Ejemplo: Se observa persona sospechosa en zona de estacionamiento..."
                />
                <p className="text-xs text-muted-foreground">
                  Si no agregas descripcion, el backend priorizara con el tipo y la ubicacion.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Canal: web</Badge>
                <Badge variant="secondary">Atencion 24/7</Badge>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Zona del campus</p>
                <Select
                  value={zona}
                  onValueChange={(value) => {
                    setZona(value);
                    stopLiveLocation();
                    setLocationSource("zona");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonasCampus.map((item) => (
                      <SelectItem value={item.id} key={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Referencia adicional</p>
                <Input
                  value={referencia}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setReferencia(event.target.value)
                  }
                  placeholder="Ejemplo: Cerca de la puerta lateral"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Ubicacion del incidente
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Puedes seleccionar una zona o compartir tu GPS en vivo.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        stopLiveLocation();
                        const result = await requestLocation();
                        if (result) setLocationSource("gps");
                      }}
                      disabled={ubicando}
                      className="gap-1.5"
                    >
                      {ubicando && !ubicacionEnVivo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                      GPS actual
                    </Button>
                    <Button
                      type="button"
                      variant={ubicacionEnVivo ? "secondary" : "outline"}
                      size="sm"
                      onClick={async () => {
                        if (ubicacionEnVivo) {
                          stopLiveLocation();
                          setLocationSource(location ? "gps" : "zona");
                          return;
                        }
                        const result = await startLiveLocation();
                        if (result) setLocationSource("live");
                      }}
                      disabled={ubicando && !ubicacionEnVivo}
                      className="gap-1.5"
                    >
                      {ubicando && !ubicacionEnVivo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4" />
                      )}
                      {ubicacionEnVivo ? "Detener en vivo" : "GPS en vivo"}
                    </Button>
                  </div>
                </div>
                {zona && (
                  <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    Ubicacion aproximada por zona:{" "}
                    {zonasCampus.find((item) => item.id === zona)?.label}
                  </p>
                )}
                {location && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <span>
                      {locationSource === "live" ? "GPS en vivo" : "GPS capturado"}
                      : {location.latitud.toFixed(6)},{" "}
                      {location.longitud.toFixed(6)}
                      {location.precision_metros
                        ? ` (${Math.round(location.precision_metros)} m aprox.)`
                        : ""}
                      {locationSource === "live" && ubicacionActualizadaEn
                        ? ` - actualizado ${formatLimaDateTime(new Date(ubicacionActualizadaEn), {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }, "--")}`
                        : ""}
                    </span>
                    {locationSource === "gps" || locationSource === "live" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearLocation();
                          setLocationSource("zona");
                        }}
                        className="h-7 gap-1 px-2 text-emerald-800"
                      >
                        <X className="h-3.5 w-3.5" />
                        Usar zona
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocationSource(ubicacionEnVivo ? "live" : "gps")}
                        className="h-7 px-2 text-emerald-800"
                      >
                        {ubicacionEnVivo ? "Usar en vivo" : "Usar GPS"}
                      </Button>
                    )}
                  </div>
                )}
                {ubicacionError && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {ubicacionError}
                  </p>
                )}
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-[#001C55]" />
                  Resumen previo al envio
                </div>
                <p>Tipo: {tipo || "-"}</p>
                <p>
                  Prioridad: {severidad ? SEVERIDAD_LABEL[severidad] : "Sera estimada por IA"}
                </p>
                <p>
                  Zona:{" "}
                  {zonasCampus.find((item) => item.id === zona)?.label ?? "-"}
                </p>
                <p>
                  Coordenadas:{" "}
                  {(() => {
                    const zonaSeleccionada = zonasCampus.find(
                      (item) => item.id === zona,
                    );
                    const activeLocation =
                      (locationSource === "gps" || locationSource === "live") && location
                        ? location
                        : zonaSeleccionada;
                    const sourceLabel =
                      locationSource === "live"
                        ? "GPS en vivo"
                        : locationSource === "gps"
                          ? "GPS"
                          : "zona";
                    return activeLocation
                      ? `${activeLocation.latitud.toFixed(5)}, ${activeLocation.longitud.toFixed(5)} (${sourceLabel})`
                      : "Sin coordenadas";
                  })()}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={volver}
              disabled={step === 0 || enviando}
            >
              Atras
            </Button>
            <Button
              type="button"
              className="bg-[#001C55] hover:bg-[#032E84]"
              onClick={step === 3 ? enviar : siguiente}
              disabled={!puedeContinuar || enviando}
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : step === 3 ? (
                "Enviar reporte"
              ) : (
                "Continuar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
