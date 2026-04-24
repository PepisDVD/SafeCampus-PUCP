/**
 * 📁 apps/web/src/app/(admin)/_components/admin-page-header.tsx
 * 🎯 Encabezado estándar de cada sub-página del panel admin.
 * 📦 Módulo: Admin / Layout
 */

type Props = {
  title: string;
  description: string;
};

export function AdminPageHeader({ title, description }: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
