export function mapAuthError(rawError: string | null): string | null {
  if (!rawError) return null;

  if (rawError === "dominio_no_permitido") {
    return "Solo se permite el acceso con correos institucionales @pucp.edu.pe";
  }

  if (rawError === "oauth_exchange_failed") {
    return "No se pudo completar el inicio de sesión. Inténtalo nuevamente.";
  }

  if (rawError === "correo_no_autorizado") {
    return "Esta cuenta no puede ingresar por este método. Las cuentas @pucp.edu.pe usan SSO institucional; las externas, el ingreso con credenciales.";
  }

  if (rawError === "cuenta_no_registrada") {
    return "Esta cuenta no está registrada. Solicita al administrador que cree tu acceso.";
  }

  if (rawError === "acceso_denegado") {
    return "Tu cuenta no tiene un rol habilitado para la web. Si eres operador, ingresa por la app móvil; de lo contrario, contacta al administrador.";
  }

  if (rawError === "oauth_missing_code") {
    return "No se recibió una respuesta válida del proveedor de autenticación.";
  }

  if (rawError === "profile_sync_failed") {
    return "No se pudo sincronizar tu perfil SafeCampus. Verifica que el backend esté activo e inténtalo nuevamente.";
  }

  if (rawError === "backend_auth_required") {
    return "El inicio de sesión ahora se completa desde el backend. Intenta ingresar nuevamente.";
  }

  return "No se pudo iniciar sesión en este momento.";
}
