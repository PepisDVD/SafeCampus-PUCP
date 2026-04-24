/**
 * 📁 apps/web/src/features/usuarios/components/usuario-suspender-dialog.tsx
 * 🎯 Diálogo de confirmación para suspender una cuenta (UC-GU-04).
 *    Captura motivo que se escribe en el log de auditoría.
 * 📦 Feature: Usuarios
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@safecampus/ui-kit";

import type { UsuarioAdmin } from "../types";

interface Props {
  open: boolean;
  usuario: UsuarioAdmin | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, motivo: string) => Promise<{ ok: boolean; mensaje?: string }>;
}

export function UsuarioSuspenderDialog({ open, usuario, onOpenChange, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  if (!usuario) return null;

  const confirmar = async () => {
    if (!motivo.trim()) {
      toast.error("Ingresa un motivo para registrar la suspensión.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onConfirm(usuario.id, motivo.trim());
      if (!result.ok) {
        toast.error(result.mensaje ?? "No se pudo suspender la cuenta.");
        return;
      }
      toast.success(`Cuenta de ${usuario.nombre} suspendida.`);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspender cuenta</DialogTitle>
          <DialogDescription>
            Se bloqueará el acceso de{" "}
            <span className="font-medium text-slate-900">{usuario.nombre}</span> ({usuario.codigo}).
            El evento quedará registrado en auditoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo de suspensión</Label>
          <Textarea
            id="motivo"
            placeholder="Ej. uso indebido del sistema, reporte de RRHH, etc."
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={submitting}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? "Suspendiendo..." : "Confirmar suspensión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
