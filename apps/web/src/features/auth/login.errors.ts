export function mapAuthError(rawError: string | null): string | null {
  if (!rawError) return null;

  if (rawError === "dominio_no_permitido") {
    return "Solo se permite el acceso con correos institucionales @pucp.edu.pe";
  }

  if (rawError === "oauth_exchange_failed") {
    return "No se pudo completar el inicio de sesion. Intenta nuevamente.";
  }

  if (rawError === "oauth_missing_code") {
    return "No se recibio respuesta valida del proveedor de autenticacion.";
  }

  if (rawError === "profile_sync_failed") {
    return "No se pudo sincronizar tu perfil de acceso. Intenta nuevamente.";
  }

  if (rawError === "admin_required") {
    return "Tu cuenta no tiene permisos de administrador para ese modulo.";
  }

  return "No se pudo iniciar sesion en este momento.";
}
