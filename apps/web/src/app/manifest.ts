import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SafeCampus PUCP",
    short_name: "SafeCampus",
    description: "PWA comunitaria para incidentes y Lost & Found en campus PUCP.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#001C55",
    orientation: "portrait",
    icons: [
      {
        src: "/logo-main.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Lost & Found",
        short_name: "Lost & Found",
        description: "Registrar o buscar objetos perdidos.",
        url: "/lost-found",
      },
      {
        name: "Reportar incidente",
        short_name: "Reportar",
        description: "Crear un reporte de seguridad.",
        url: "/reportar",
      },
    ],
  };
}
