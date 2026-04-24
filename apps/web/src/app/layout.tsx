import type { Metadata } from "next";
import { Toaster } from "@safecampus/ui-kit";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeCampus PUCP",
  description: "Plataforma omnicanal de gestion de incidentes para campus PUCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
