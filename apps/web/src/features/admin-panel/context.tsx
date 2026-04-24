/**
 * 📁 apps/web/src/features/admin-panel/context.tsx
 * 🎯 Contexto único para el panel de administración.
 *    Contiene estado mock de usuarios, matriz RBAC, integraciones y auditoría.
 *    Cada acción escribe automáticamente un evento de auditoría.
 *
 *    🔁 Este store deberá ser reemplazado por llamadas a endpoints REST
 *    una vez que el backend exponga:
 *      - GET/POST/PATCH /api/v1/usuarios
 *      - GET/PATCH       /api/v1/rbac
 *      - GET/POST        /api/v1/integraciones/:id/verificar
 *      - GET             /api/v1/auditoria
 *
 * 📦 Feature: Admin Panel (compartido)
 */

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { NivelPermiso, GrupoFuncional, PermisoRBAC } from "@/constants/permissions";
import { RBAC_MATRIZ } from "@/constants/permissions";
import type { RolUsuario } from "@/constants/roles";
import { AUDITORIA_MOCK } from "@/features/auditoria/mock-data";
import type { EventoAuditoria, TipoEventoAuditoria } from "@/features/auditoria/types";
import { INTEGRACIONES_MOCK } from "@/features/integraciones/mock-data";
import type { EstadoIntegracion, Integracion } from "@/features/integraciones/types";
import { USUARIOS_MOCK } from "@/features/usuarios/mock-data";
import type {
  CrearUsuarioInput,
  EditarUsuarioInput,
  UsuarioAdmin,
} from "@/features/usuarios/types";

import { puedeCambiarAdminActivo, puedeSuspenderUsuario } from "./domain";

const ACTOR_SESION_MOCK = "Ana Torres Vega";

export type ResultadoAccion = {
  ok: boolean;
  mensaje?: string;
};

interface AdminPanelContextValue {
  usuarios: UsuarioAdmin[];
  rbac: PermisoRBAC[];
  integraciones: Integracion[];
  auditoria: EventoAuditoria[];
  crearUsuario: (input: CrearUsuarioInput) => ResultadoAccion;
  editarUsuario: (id: string, input: EditarUsuarioInput) => ResultadoAccion;
  suspenderUsuario: (id: string, motivo: string) => ResultadoAccion;
  reactivarUsuario: (id: string) => ResultadoAccion;
  ajustarPermiso: (grupo: GrupoFuncional, rol: RolUsuario, nivel: NivelPermiso) => ResultadoAccion;
  verificarIntegracion: (id: string) => ResultadoAccion;
}

const AdminPanelContext = createContext<AdminPanelContextValue | null>(null);

function ahoraISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function idEvento(): string {
  return `EV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function idUsuario(existentes: UsuarioAdmin[]): string {
  const n = existentes.length + 1;
  return `U${String(n).padStart(3, "0")}`;
}

export function AdminPanelProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>(USUARIOS_MOCK);
  const [rbac, setRbac] = useState<PermisoRBAC[]>(RBAC_MATRIZ);
  const [integraciones, setIntegraciones] = useState<Integracion[]>(INTEGRACIONES_MOCK);
  const [auditoria, setAuditoria] = useState<EventoAuditoria[]>(AUDITORIA_MOCK);

  const registrarEvento = useCallback(
    (tipo: TipoEventoAuditoria, accion: string, detalle: string) => {
      const nuevo: EventoAuditoria = {
        id: idEvento(),
        tipo,
        actor: ACTOR_SESION_MOCK,
        accion,
        detalle,
        timestamp: ahoraISO(),
      };
      setAuditoria((prev) => [nuevo, ...prev]);
    },
    [],
  );

  const crearUsuario = useCallback(
    (input: CrearUsuarioInput): ResultadoAccion => {
      const emailExistente = usuarios.some(
        (u) => u.email.toLowerCase() === input.email.toLowerCase(),
      );
      if (emailExistente) {
        return { ok: false, mensaje: "Ya existe un usuario con ese correo institucional." };
      }
      const codigoExistente = usuarios.some((u) => u.codigo === input.codigo);
      if (codigoExistente) {
        return { ok: false, mensaje: "Ya existe un usuario con ese código." };
      }
      setUsuarios((prev) => {
        const nuevo: UsuarioAdmin = {
          id: idUsuario(prev),
          ...input,
          estado: "activo",
          ultimoAcceso: null,
          createdAt: ahoraISO(),
        };
        return [nuevo, ...prev];
      });
      registrarEvento(
        "usuario_creado",
        `Creó usuario ${input.nombre} (${input.codigo})`,
        `Rol asignado: ${input.rol}. Departamento: ${input.departamento}.`,
      );
      return { ok: true };
    },
    [registrarEvento, usuarios],
  );

  const editarUsuario = useCallback(
    (id: string, input: EditarUsuarioInput): ResultadoAccion => {
      const actual = usuarios.find((u) => u.id === id);
      if (!actual) return { ok: false, mensaje: "Usuario no encontrado." };

      const invarianteAdmin = puedeCambiarAdminActivo(
        usuarios,
        actual,
        input.rol,
        input.estado,
      );
      if (!invarianteAdmin.ok) {
        return invarianteAdmin;
      }

      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...input } : u)),
      );
      registrarEvento(
        "usuario_editado",
        `Editó usuario ${input.nombre} (${input.codigo})`,
        `Rol: ${input.rol}. Estado: ${input.estado}.`,
      );
      return { ok: true };
    },
    [registrarEvento, usuarios],
  );

  const suspenderUsuario = useCallback(
    (id: string, motivo: string): ResultadoAccion => {
      const u = usuarios.find((x) => x.id === id);
      if (!u) return { ok: false, mensaje: "Usuario no encontrado." };
      const reglaSuspension = puedeSuspenderUsuario(usuarios, u);
      if (!reglaSuspension.ok) {
        return reglaSuspension;
      }
      setUsuarios((prev) =>
        prev.map((x) => (x.id === id ? { ...x, estado: "suspendido" } : x)),
      );
      registrarEvento(
        "usuario_suspendido",
        `Suspendió usuario ${u.nombre} (${u.codigo})`,
        motivo || "Sin motivo registrado.",
      );
      return { ok: true };
    },
    [registrarEvento, usuarios],
  );

  const reactivarUsuario = useCallback(
    (id: string): ResultadoAccion => {
      const u = usuarios.find((x) => x.id === id);
      if (!u) return { ok: false, mensaje: "Usuario no encontrado." };
      if (u.estado === "activo") {
        return { ok: false, mensaje: "El usuario ya está activo." };
      }
      setUsuarios((prev) =>
        prev.map((x) => (x.id === id ? { ...x, estado: "activo" } : x)),
      );
      registrarEvento(
        "usuario_reactivado",
        `Reactivó usuario ${u.nombre} (${u.codigo})`,
        `Estado previo: ${u.estado}.`,
      );
      return { ok: true };
    },
    [registrarEvento, usuarios],
  );

  const ajustarPermiso = useCallback(
    (grupo: GrupoFuncional, rol: RolUsuario, nivel: NivelPermiso): ResultadoAccion => {
      if (grupo === "usuarios" && rol === "admin" && nivel !== "si") {
        return {
          ok: false,
          mensaje: "El rol Administrador debe conservar acceso total a Gestión de usuarios.",
        };
      }
      setRbac((prev) =>
        prev.map((entry) =>
          entry.grupo === grupo
            ? { ...entry, permisos: { ...entry.permisos, [rol]: nivel } }
            : entry,
        ),
      );
      const modulo = rbac.find((e) => e.grupo === grupo)?.modulo ?? grupo;
      registrarEvento(
        "rbac_modificado",
        `Actualizó matriz RBAC — módulo ${modulo}`,
        `Rol ${rol} → ${nivel}.`,
      );
      return { ok: true };
    },
    [rbac, registrarEvento],
  );

  const verificarIntegracion = useCallback(
    (id: string): ResultadoAccion => {
      const actual = integraciones.find((i) => i.id === id);
      if (!actual) return { ok: false, mensaje: "Integración no encontrada." };

      const estadoPrevio = actual.estado;
      const estadoNuevo: EstadoIntegracion =
        estadoPrevio === "inactivo" ? "inactivo" : Math.random() > 0.15 ? "operativo" : "degradado";
      const latencia = estadoNuevo === "inactivo" ? null : Math.round(180 + Math.random() * 900);

      setIntegraciones((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                estado: estadoNuevo,
                ultimaVerificacion: ahoraISO(),
                latenciaMs: latencia,
                mensajeEstado:
                  estadoNuevo === "operativo"
                    ? "Verificación manual OK."
                    : estadoNuevo === "degradado"
                      ? "Latencia elevada durante la verificación manual."
                      : i.mensajeEstado,
              }
            : i,
        ),
      );

      const tipo: TipoEventoAuditoria =
        estadoNuevo === "operativo" ? "integracion_verificada" : "integracion_alerta";
      registrarEvento(
        tipo,
        `Verificó integración ${actual.nombre}`,
        `Estado resultante: ${estadoNuevo}${latencia ? ` (latencia ${latencia} ms)` : ""}.`,
      );
      return { ok: true };
    },
    [integraciones, registrarEvento],
  );

  const value = useMemo<AdminPanelContextValue>(
    () => ({
      usuarios,
      rbac,
      integraciones,
      auditoria,
      crearUsuario,
      editarUsuario,
      suspenderUsuario,
      reactivarUsuario,
      ajustarPermiso,
      verificarIntegracion,
    }),
    [
      usuarios,
      rbac,
      integraciones,
      auditoria,
      crearUsuario,
      editarUsuario,
      suspenderUsuario,
      reactivarUsuario,
      ajustarPermiso,
      verificarIntegracion,
    ],
  );

  return <AdminPanelContext.Provider value={value}>{children}</AdminPanelContext.Provider>;
}

export function useAdminPanel(): AdminPanelContextValue {
  const ctx = useContext(AdminPanelContext);
  if (!ctx) {
    throw new Error("useAdminPanel debe usarse dentro de <AdminPanelProvider>.");
  }
  return ctx;
}
