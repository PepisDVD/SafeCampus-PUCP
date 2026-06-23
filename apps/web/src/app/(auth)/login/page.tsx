import { Suspense } from "react";

import { LoginScreen } from "@/features/auth/components";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <p className="text-sm text-gray-500">Cargando pantalla de acceso...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginScreen initialMode="sso" />
    </Suspense>
  );
}
