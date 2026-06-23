"use client";

import { useEffect } from "react";
import { toast } from "@safecampus/ui-kit";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const offline = () => toast.warning("Sin conexion. Algunas vistas seguiran disponibles en modo lectura.");
    const online = () => toast.success("Conexion restablecida.");
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  return null;
}
