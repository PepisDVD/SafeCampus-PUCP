/**
 * 📁 apps/web/src/app/not-found.tsx
 * 🎯 Página 404 personalizada.
 * 📦 Módulo: App / Error
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">Página no encontrada</p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2 border rounded-lg hover:bg-accent transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
