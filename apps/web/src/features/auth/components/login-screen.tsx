"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type UseFormReturn, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label, toast } from "@safecampus/ui-kit";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User } from "lucide-react";

import { LoginHeroPanel } from "./login-hero-panel";
import { LOGIN_WELCOME_FLAG } from "./login-welcome-toast";
import { mapAuthError } from "../login.errors";
import {
  signInWithGoogleExternalAccount,
  signInWithPucpSso,
  signInWithWebCredentials,
} from "@/lib/auth";

/** Marca el ingreso exitoso para que el toast de bienvenida se muestre al aterrizar. */
function markLoginSuccess() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(LOGIN_WELCOME_FLAG, "1");
  }
}

type LoginMode = "sso" | "credentials";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu usuario.")
    .regex(EMAIL_SHAPE, "Ingresa un correo válido.")
    // El login por credenciales es exclusivo para cuentas NO institucionales.
    .refine(
      (value) => !value.toLowerCase().endsWith("@pucp.edu.pe"),
      "Las cuentas @pucp.edu.pe ingresan con SSO institucional.",
    ),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function LoginScreen({ initialMode = "sso" }: { initialMode?: LoginMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const callbackErrorCode = searchParams.get("error");
  const callbackError = useMemo(
    () => mapAuthError(callbackErrorCode),
    [callbackErrorCode],
  );
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  // Errores devueltos por el callback del SSO (?error=...) → Sonner.
  // "acceso_denegado" (canal incorrecto) es una advertencia; el resto, error.
  useEffect(() => {
    if (!callbackError) return;
    if (callbackErrorCode === "acceso_denegado") {
      toast.warning("Acceso restringido", {
        id: "login-error",
        description: callbackError,
      });
    } else {
      toast.error("No se pudo iniciar sesión", {
        id: "login-error",
        description: callbackError,
      });
    }
    // Limpia el parámetro para no repetir el toast al refrescar.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("error")) {
        url.searchParams.delete("error");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [callbackError, callbackErrorCode]);

  const switchMode = (next: LoginMode) => {
    if (next === mode) return;
    setShowPass(false);
    form.reset();
    setMode(next);
  };

  const handleSso = async () => {
    if (ssoLoading) return;
    setSsoLoading(true);
    try {
      // El SSO redirige de página completa; marcamos antes de salir y el toast
      // de bienvenida se mostrará al volver autenticado.
      markLoginSuccess();
      await signInWithPucpSso({ nextPath });
    } catch (error) {
      // No llegamos a redirigir: descartamos la marca de éxito.
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LOGIN_WELCOME_FLAG);
      }
      setSsoLoading(false);
      toast.error("No se pudo iniciar sesión", {
        description:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión con Google SSO.",
      });
    }
  };

  const onSubmitCredentials = form.handleSubmit(async (values) => {
    try {
      await signInWithWebCredentials(values);
      // La cookie HTTP-only ya está establecida; los layouts resuelven la
      // redirección por rol. El toast de bienvenida se dispara en el destino
      // (vía la marca en sessionStorage), evitando carreras con la navegación.
      markLoginSuccess();
      router.replace(nextPath);
    } catch (error) {
      toast.error("No se pudo iniciar sesión", {
        description:
          error instanceof Error ? error.message : "Credenciales inválidas.",
      });
    }
  });

  const handleGoogleCredentials = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      // Redirección de página completa (OAuth); el toast de bienvenida se
      // mostrará al volver autenticado gracias a la marca en sessionStorage.
      markLoginSuccess();
      await signInWithGoogleExternalAccount({ nextPath });
    } catch (error) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LOGIN_WELCOME_FLAG);
      }
      setGoogleLoading(false);
      toast.error("No se pudo iniciar sesión", {
        description:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión con Google.",
      });
    }
  };

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[#001C55] lg:h-dvh">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.png')" }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <LoginHeroPanel />

        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
            <div
              key={mode}
              className={
                mode === "credentials" ? "login-enter-right" : "login-enter-left"
              }
            >
              {mode === "sso" ? (
                <SsoPanel
                  loading={ssoLoading}
                  onSubmit={handleSso}
                  onSwitch={() => switchMode("credentials")}
                />
              ) : (
                <CredentialsPanel
                  form={form}
                  showPass={showPass}
                  googleLoading={googleLoading}
                  onTogglePass={() => setShowPass((prev) => !prev)}
                  onSubmit={onSubmitCredentials}
                  onGoogle={handleGoogleCredentials}
                  onBack={() => switchMode("sso")}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SsoPanel({
  loading,
  onSubmit,
  onSwitch,
}: {
  loading: boolean;
  onSubmit: () => void;
  onSwitch: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        Iniciar sesión
      </h2>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#001C55]" />
        <p className="text-sm text-gray-600">
          Te redirigiremos para autenticarte con tu cuenta
          <span className="font-medium"> @pucp.edu.pe</span>.
        </p>
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="mt-6 h-auto w-full rounded-xl bg-[#001C55] px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#002580] hover:shadow-xl disabled:bg-gray-300"
      >
        {loading ? "Redirigiendo a Google SSO..." : "Iniciar sesión con PUCP SSO"}
      </Button>

      <div className="mt-5 border-t border-gray-100 pt-4 text-center">
        <button
          type="button"
          onClick={onSwitch}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001C55] underline-offset-4 hover:underline"
        >
          <KeyRound className="h-4 w-4" />
          Ingresar con credenciales
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Autenticación segura vía Google Workspace
      </p>
    </div>
  );
}

function CredentialsPanel({
  form,
  showPass,
  googleLoading,
  onTogglePass,
  onSubmit,
  onGoogle,
  onBack,
}: {
  form: UseFormReturn<CredentialsValues>;
  showPass: boolean;
  googleLoading: boolean;
  onTogglePass: () => void;
  onSubmit: () => void;
  onGoogle: () => void;
  onBack: () => void;
}) {
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        Ingresar con credenciales
      </h2>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <Label
            htmlFor="credentials-email"
            className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-600 uppercase"
          >
            Usuario
          </Label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="credentials-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              placeholder="usuario@gmail.com"
              className="border-gray-200 bg-gray-50 py-3 pr-4 pl-10 text-sm focus:border-[#001C55] focus:bg-white aria-invalid:border-red-400"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label
            htmlFor="credentials-password"
            className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-600 uppercase"
          >
            Contraseña
          </Label>
          <div className="relative">
            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="credentials-password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              placeholder="********"
              className="border-gray-200 bg-gray-50 py-3 pr-10 pl-10 text-sm focus:border-[#001C55] focus:bg-white aria-invalid:border-red-400"
              {...register("password")}
            />
            <button
              type="button"
              onClick={onTogglePass}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Mostrar u ocultar contraseña"
            >
              {showPass ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-auto w-full rounded-xl bg-[#001C55] px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#002580] hover:shadow-xl disabled:bg-gray-300"
        >
          {isSubmitting ? "Verificando..." : "Ingresar"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">
          o
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onGoogle}
        disabled={googleLoading}
        className="h-auto w-full gap-2 rounded-xl border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <GoogleIcon className="h-4 w-4" />
        {googleLoading ? "Redirigiendo a Google..." : "Continuar con Google"}
      </Button>

      <div className="mt-5 border-t border-gray-100 pt-4 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001C55] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión institucional
        </button>
      </div>
    </div>
  );
}

/** Logo de Google (no existe en lucide; los logos de marca se incluyen como SVG). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917"
      />
    </svg>
  );
}
