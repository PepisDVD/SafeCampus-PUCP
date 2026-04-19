/**
 * 📁 apps/web/src/app/(admin)/layout.tsx
 * 🎯 Layout de administración — sidebar con módulos de gestión del sistema.
 * 📦 Módulo: Admin / Layout
 */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-background hidden md:block p-4">
        <h2 className="font-bold text-lg mb-6">Administración</h2>
        <nav className="space-y-2">
          <p className="text-sm text-muted-foreground">Usuarios</p>
          <p className="text-sm text-muted-foreground">Roles y permisos</p>
          <p className="text-sm text-muted-foreground">Integraciones</p>
          <p className="text-sm text-muted-foreground">Auditoría</p>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
