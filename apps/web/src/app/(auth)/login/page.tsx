"use client";

import { Suspense, type FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@safecampus/ui-kit";
import { Eye, EyeOff, Lock, User } from "lucide-react";

import { LoginHeroPanel, LoginRoleOption } from "@/features/auth/components";
import { mapAuthError } from "@/features/auth/login.errors";
import { LOGIN_ROLES } from "@/features/auth/login.config";
import type { LoginRoleId } from "@/features/auth/types";
import { isAllowedInstitutionalEmail, signInWithPucpSso } from "@/lib/auth";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [selectedRoleId, setSelectedRoleId] = useState<LoginRoleId>("comunidad");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("usuario@pucp.edu.pe");
  const [password, setPassword] = useState("********");
  const [clientError, setClientError] = useState<string | null>(null);

  const callbackError = useMemo(
    () => mapAuthError(searchParams.get("error")),
    [searchParams],
  );

  const selectedRole = useMemo(
    () => LOGIN_ROLES.find((role) => role.id === selectedRoleId),
    [selectedRoleId],
  );
  const nextFromGuard = useMemo(() => {
    const rawNext = searchParams.get("next");
    if (!rawNext) return null;
    if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
    return rawNext;
  }, [searchParams]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole || loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedInstitutionalEmail(normalizedEmail)) {
      setClientError(
        "Ingresa un correo institucional PUCP valido (@pucp.edu.pe).",
      );
      return;
    }

    setClientError(null);
    setLoading(true);

    try {
      await signInWithPucpSso({
        email: normalizedEmail,
        nextPath: nextFromGuard ?? selectedRole.ruta,
      });
    } catch (error) {
      setLoading(false);
      setClientError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar sesion con Google SSO.",
      );
    }
  };

  return (
    <div
      className="flex min-h-dvh overflow-hidden lg:h-dvh"
      style={{
        background:
          "linear-gradient(135deg, #001C55 0%, #003087 50%, #C8102E 100%)",
      }}
    >
      <LoginHeroPanel />

      <div className="flex flex-1 items-center justify-center bg-gray-100 p-3 sm:p-4 lg:p-5">
        <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6 lg:max-h-[calc(100dvh-2.5rem)] lg:p-7">
          <h2 className="text-3xl leading-tight font-bold text-gray-900 sm:text-4xl lg:text-[2.6rem]">
            Iniciar sesion
          </h2>
          <p className="mt-1 text-base text-gray-500 sm:text-lg lg:text-xl">
            Credenciales institucionales PUCP
          </p>

          {(callbackError || clientError) && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {clientError ?? callbackError}
            </div>
          )}

          <form className="mt-5" onSubmit={onSubmit}>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-gray-600 uppercase">
              Selecciona tu perfil
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {LOGIN_ROLES.map((role) => (
                <LoginRoleOption
                  key={role.id}
                  role={role}
                  selected={selectedRoleId === role.id}
                  onSelect={setSelectedRoleId}
                />
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-600 uppercase">
                  Usuario institucional
                </Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@pucp.edu.pe"
                    className="border-gray-200 bg-gray-50 py-3 pr-4 pl-10 text-sm focus:border-[#001C55] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-600 uppercase">
                  Contrasena
                </Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    className="border-gray-200 bg-gray-50 py-3 pr-10 pl-10 text-sm focus:border-[#001C55] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Mostrar u ocultar contrasena"
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-5 h-auto w-full rounded-xl bg-[#001C55] px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#002580] hover:shadow-xl disabled:bg-gray-300"
            >
              {loading ? "Redirigiendo a Google SSO..." : "Iniciar sesion con PUCP SSO"}
            </Button>

            <p className="mt-3 text-center text-xs text-gray-400">
              Autenticacion segura via Google Workspace · PUCP DITIC
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <p className="text-sm text-gray-500">Cargando pantalla de acceso...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
