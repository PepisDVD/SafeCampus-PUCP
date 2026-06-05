import type { Metadata, Viewport } from "next";
import { Toaster } from "@safecampus/ui-kit";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeCampus PUCP",
  description: "Plataforma omnicanal de gestion de incidentes para campus PUCP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SafeCampus",
  },
};

export const viewport: Viewport = {
  themeColor: "#001C55",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <PwaRegister />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
