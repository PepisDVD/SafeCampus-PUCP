"use client";

import { ComunidadShell } from "./_components/comunidad-shell";

export default function ComunidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ComunidadShell>{children}</ComunidadShell>;
}
