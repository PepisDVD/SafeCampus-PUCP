"use client";

import { useMemo, useState } from "react";
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
  Label,
} from "@safecampus/ui-kit";
import {
  Eye,
  EyeOff,
  Lock,
  Monitor,
  Shield,
  Smartphone,
  Tablet,
  User,
} from "lucide-react";

type RolLogin = {
  id: "comunidad" | "operador" | "supervisor" | "admin";
  nombre: string;
  descripcion: string;
  ruta: string;
  canal: "PWA Comunidad" | "App Operador" | "Web Operativa";
  icono: typeof Smartphone;
};

const roles: RolLogin[] = [
  {
    id: "comunidad",
    nombre: "Comunidad PUCP",
    descripcion: "Reporte de incidentes, acompanamiento y Lost & Found",
    ruta: "/reportar",
    canal: "PWA Comunidad",
    icono: Smartphone,
  },
  {
    id: "operador",
    nombre: "Operador de Seguridad",
    descripcion: "Atencion de incidentes en campo",
    ruta: "/dashboard",
    canal: "App Operador",
    icono: Tablet,
  },
  {
    id: "supervisor",
    nombre: "Supervisor Operativo",
    descripcion: "Monitoreo de KPIs y tablero operativo",
    ruta: "/dashboard",
    canal: "Web Operativa",
    icono: Monitor,
  },
  {
    id: "admin",
    nombre: "Administrador",
    descripcion: "Gestion de usuarios, roles e integraciones",
    ruta: "/usuarios",
    canal: "Web Operativa",
    icono: Monitor,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [rolSeleccionado, setRolSeleccionado] = useState<RolLogin["id"]>();
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const perfilActivo = useMemo(
    () => roles.find((rol) => rol.id === rolSeleccionado),
    [rolSeleccionado],
  );

  const onLogin = async () => {
    if (!perfilActivo) return;
    setCargando(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    router.push(perfilActivo.ruta);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(125deg,#001C55_0%,#00398C_48%,#C8102E_100%)] p-4 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.25),transparent_38%),radial-gradient(circle_at_82%_76%,rgba(255,255,255,0.15),transparent_42%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-2">
              <Shield className="h-6 w-6" />
              <div>
                <p className="text-xs tracking-[0.28em] text-blue-200 uppercase">
                  SafeCampus
                </p>
                <p className="text-lg font-semibold">PUCP</p>
              </div>
            </div>
            <h1 className="max-w-md text-4xl leading-tight font-bold">
              Plataforma omnicanal de seguridad universitaria.
            </h1>
            <p className="max-w-md text-sm text-blue-100">
              Un solo sistema para reportar, atender y escalar incidentes en
              tiempo real para toda la comunidad PUCP.
            </p>
          </div>
          <div className="space-y-3">
            {roles.map((rol) => (
              <div
                key={rol.id}
                className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3"
              >
                <rol.icono className="h-4 w-4 text-blue-100" />
                <div>
                  <p className="text-sm font-semibold">{rol.canal}</p>
                  <p className="text-xs text-blue-100">{rol.nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center p-4 sm:p-8">
          <Card className="w-full border-none shadow-none">
            <CardHeader className="px-1">
              <CardTitle className="text-2xl text-[#001C55]">
                Iniciar sesion
              </CardTitle>
              <CardDescription>
                Usa tu cuenta institucional para acceder a SafeCampus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-1">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Perfil de acceso
                </p>
                <div className="grid gap-3">
                  {roles.map((rol) => (
                    <button
                      key={rol.id}
                      type="button"
                      onClick={() => setRolSeleccionado(rol.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        rolSeleccionado === rol.id
                          ? "border-[#001C55] bg-[#001C55]/5"
                          : "border-muted hover:border-[#001C55]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{rol.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {rol.descripcion}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {rol.canal}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo institucional</Label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      className="pl-9"
                      defaultValue="usuario@pucp.edu.pe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contrasena</Label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={mostrarPassword ? "text" : "password"}
                      className="pr-10 pl-9"
                      defaultValue="********"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((valor) => !valor)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                    >
                      {mostrarPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-[#001C55] hover:bg-[#032E84]"
                disabled={!perfilActivo || cargando}
                onClick={onLogin}
              >
                {cargando ? "Autenticando..." : "Entrar con PUCP SSO"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
