import * as React from "react";

import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";

const CHANNEL_TONES: Record<string, string> = {
  web: "border-blue-200 bg-blue-50 text-blue-700",
  movil: "border-violet-200 bg-violet-50 text-violet-700",
  mensajeria: "border-teal-200 bg-teal-50 text-teal-700",
};

const CHANNEL_LABELS: Record<string, string> = {
  web: "Web",
  movil: "Móvil",
  mensajeria: "Mensajería",
};

function normalizeChannel(canal: string): string {
  return canal.trim().toLocaleLowerCase("es-PE");
}

function formatChannelLabel(canal: string): string {
  const normalized = normalizeChannel(canal);
  if (CHANNEL_LABELS[normalized]) return CHANNEL_LABELS[normalized];
  return normalized
    ? normalized.charAt(0).toLocaleUpperCase("es-PE") + normalized.slice(1)
    : "Sin canal";
}

function getChannelTone(canal: string): string {
  return CHANNEL_TONES[normalizeChannel(canal)] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

type ChannelBadgeProps = Omit<React.ComponentProps<typeof Badge>, "children"> & {
  canal: string;
  label?: string;
};

/** Badge de canal de origen (tipo_canal), reutilizable entre módulos. */
function ChannelBadge({ canal, label, className, ...props }: ChannelBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", getChannelTone(canal), className)}
      {...props}
    >
      {label ?? formatChannelLabel(canal)}
    </Badge>
  );
}

export { ChannelBadge, formatChannelLabel, getChannelTone, type ChannelBadgeProps };
