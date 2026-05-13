"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Paperclip,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import type {
  IncidenteDetail,
  OperadorListItem,
} from "@safecampus/shared-types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@safecampus/ui-kit";

import { IncidenteAcciones } from "./incidente-acciones";

type Props = {
  detalle: IncidenteDetail;
  operadores: OperadorListItem[];
  variant: "header" | "quick";
};

function ActionDialog({
  detalle,
  operadores,
  mode,
  title,
  description,
  variant,
}: {
  detalle: IncidenteDetail;
  operadores: OperadorListItem[];
  mode: "estado" | "asignacion";
  title: string;
  description: string;
  variant: "header" | "quick";
}) {
  const [open, setOpen] = useState(false);
  const isAsignacion = mode === "asignacion";
  const trigger =
    variant === "header" ? (
      <HeaderButton
        icon={isAsignacion ? UserRound : RefreshCcw}
        label={isAsignacion ? "Asignar operador" : "Cambiar estado"}
        primary={isAsignacion}
        onClick={() => setOpen(true)}
      />
    ) : (
      <QuickButton
        icon={isAsignacion ? UserRound : RefreshCcw}
        label={isAsignacion ? "Asignar operador" : "Cambiar estado"}
        onClick={() => setOpen(true)}
      />
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <IncidenteAcciones
          detalle={detalle}
          operadores={operadores}
          mode={mode}
          onCompleted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function HeaderButton({
  icon: Icon,
  label,
  primary = false,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant={primary ? "default" : "outline"}
      className={cn(
        "h-11 justify-center gap-2 rounded-lg px-5 text-sm font-semibold",
        primary
          ? "bg-[#001C55] text-white hover:bg-[#032E84]"
          : "border-slate-300 bg-white text-[#001C55] hover:border-[#001C55] hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-[#001C55] hover:bg-slate-50"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#001C55]" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </button>
  );
}

export function IncidenteAccionesDialogs({
  detalle,
  operadores,
  variant,
}: Props) {
  const isHeader = variant === "header";

  return (
    <div
      className={
        isHeader
          ? "grid gap-3 sm:grid-cols-3 xl:min-w-[640px]"
          : "space-y-2"
      }
    >
      <ActionDialog
        detalle={detalle}
        operadores={operadores}
        mode="asignacion"
        title="Asignar operador"
        description="Selecciona quien tomara la atencion operativa del incidente."
        variant={variant}
      />

      <ActionDialog
        detalle={detalle}
        operadores={operadores}
        mode="estado"
        title="Cambiar estado"
        description="Actualiza el estado del caso y registra el contexto del cambio."
        variant={variant}
      />

      {isHeader ? (
        <Link
          href="#evidencias"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-[#001C55] transition hover:border-[#001C55] hover:bg-slate-50"
        >
          <Paperclip className="h-4 w-4" />
          Agregar evidencia
        </Link>
      ) : (
        <Link
          href="#nota-interna"
          className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-[#001C55] hover:bg-slate-50"
        >
          <span className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-[#001C55]" />
            Registrar nota interna
          </span>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </Link>
      )}
    </div>
  );
}
