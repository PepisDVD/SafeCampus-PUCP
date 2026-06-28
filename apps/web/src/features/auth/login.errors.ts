export function mapAuthError(rawError: string | null): string | null {
  if (!rawError) return null;

  if (rawError === "dominio_no_permitido") {
    return "Solo se permite el acceso con correos institucionales @pucp.edu.pe";
  }

  if (rawError === "oauth_exchange_failed") {
    return "No se pudo completar el inicio de sesion. Intentalo nuevamente.";
  }

  if (rawError === "correo_no_autorizado") {
    return "Esta cuenta no puede ingresar por este metodo. Las cuentas @pucp.edu.pe usan SSO institucional; las externas, el ingreso con credenciales.";
  }

  if (rawError === "cuenta_no_registrada") {
    return "Esta cuenta no esta registrada. Solicita al administrador que cree tu acceso.";
  }

  if (rawError === "acceso_denegado") {
    return "Tu cuenta no tiene un rol habilitado para la web. Si eres operador, ingresa por la app movil; de lo contrario, contacta al administrador.";
  }

  if (rawError === "oauth_missing_code") {
    return "No se recibio una respuesta valida del proveedor de autenticacion.";
  }

  if (rawError === "profile_sync_failed") {
    return "No se pudo sincronizar tu perfil SafeCampus. Verifica que el backend este activo e intentalo nuevamente.";
  }

  if (rawError === "backend_auth_required") {
    return "El inicio de sesion ahora se completa desde el backend. Intenta ingresar nuevamente.";
  }

  if (rawError === "session_expired") {
    return "Tu sesion expiro o fue cerrada. Ingresa nuevamente para continuar.";
  }

  return "No se pudo iniciar sesion en este momento.";
}
