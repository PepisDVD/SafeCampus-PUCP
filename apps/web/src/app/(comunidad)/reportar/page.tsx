"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
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
import { CheckCircle2, Flame, HeartPulse, MapPin, ShieldAlert } from "lucide-react";

type Step = 0 | 1 | 2 | 3;

const tiposIncidente = [
  { id: "robo", label: "Robo / Hurto", icon: ShieldAlert },
  { id: "emergencia", label: "Emergencia medica", icon: HeartPulse },
  { id: "incendio", label: "Incendio / Humo", icon: Flame },
];

const zonasCampus = [
  "Biblioteca Central",
  "Pabellon A",
  "Pabellon H",
  "Cafeteria Central",
  "Patio de Letras",
  "Estacionamiento Principal",
];

export default function ReportarPage() {
  const [step, setStep] = useState<Step>(0);
  const [tipo, setTipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [zona, setZona] = useState("");
  const [referencia, setReferencia] = useState("");

  const puedeContinuar = useMemo(() => {
    if (step === 0) return Boolean(tipo);
    if (step === 1) return descripcion.trim().length > 12;
    if (step === 2) return Boolean(zona);
    return true;
  }, [descripcion, step, tipo, zona]);

  const siguiente = () => {
    if (!puedeContinuar || step === 3) return;
    setStep((actual) => (actual + 1) as Step);
  };

  const volver = () => {
    if (step === 0) return;
    setStep((actual) => (actual - 1) as Step);
  };

  if (step === 3) {
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
              <span className="font-semibold text-foreground">INC-20260418-0198</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full bg-[#001C55] hover:bg-[#032E84]">
              <Link href="/mis-casos">Ver mis casos</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep(0);
                setTipo("");
                setDescripcion("");
                setZona("");
                setReferencia("");
              }}
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

      <div className="grid grid-cols-3 gap-2">
        {["Tipo", "Detalle", "Ubicacion"].map((label, index) => (
          <div key={label} className="space-y-1">
            <div
              className={`h-1.5 rounded-full ${
                index <= step ? "bg-[#001C55]" : "bg-muted"
              }`}
            />
            <p
              className={`text-xs ${
                index === step ? "font-semibold text-[#001C55]" : "text-muted-foreground"
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
            {step === 1 && "Describe lo ocurrido"}
            {step === 2 && "Confirma la ubicacion"}
          </CardTitle>
          <CardDescription>
            {step === 0 && "Esto permite priorizar la atencion operativa."}
            {step === 1 && "Incluye contexto util para responder mas rapido."}
            {step === 2 && "Ubicacion precisa para despacho de operadores."}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Descripcion del incidente</p>
                <Textarea
                  value={descripcion}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescripcion(event.target.value)
                  }
                  rows={5}
                  placeholder="Ejemplo: Se observa persona sospechosa en zona de estacionamiento..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Canal: web</Badge>
                <Badge variant="secondary">Atencion 24/7</Badge>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Zona del campus</p>
                <Select value={zona} onValueChange={setZona}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonasCampus.map((item) => (
                      <SelectItem value={item} key={item}>
                        {item}
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
              <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-[#001C55]" />
                  Resumen previo al envio
                </div>
                <p>Tipo: {tipo || "-"}</p>
                <p>Zona: {zona || "-"}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={volver} disabled={step === 0}>
              Atras
            </Button>
            <Button
              type="button"
              className="bg-[#001C55] hover:bg-[#032E84]"
              onClick={step === 2 ? () => setStep(3) : siguiente}
              disabled={!puedeContinuar}
            >
              {step === 2 ? "Enviar reporte" : "Continuar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
