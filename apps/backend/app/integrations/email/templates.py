"""Plantillas de correo (primera versión) para las notificaciones de SafeCampus.

Cada función pública devuelve un ``EmailMessage`` listo para enviarse con
``EmailService.send(...)``. La capa de plantillas es independiente del proveedor:
solo arma asunto + HTML + texto plano (fallback) + tags. Los módulos
(usuarios/auth, incidentes, alertas, lost & found) consumirán estas plantillas
cuando se implementen sus notificaciones.

Ejemplo de uso::

    from app.integrations.email import EmailService, templates

    service = EmailService()
    await service.send(
        templates.account_welcome(
            to="ana@gmail.com",
            nombre="Ana",
            login_url="https://safecampus.pucp.edu.pe/login",
            temporary_password="Xy12ab34cd56",
        )
    )

Notas de diseño:
  - Estilos *inline* (los clientes de correo ignoran ``<style>``/clases externas).
  - Todo valor dinámico se escapa con ``html.escape`` para evitar inyección.
  - Se incluye siempre versión ``text`` además de ``html`` (buenas prácticas y
    accesibilidad).
"""

from __future__ import annotations

from collections.abc import Iterable
from html import escape

from app.integrations.email.schemas import EmailMessage

BRAND_NAME = "SafeCampus PUCP"
BRAND_PRIMARY = "#001C55"
BRAND_ACCENT = "#C8102E"
BRAND_MUTED = "#64748B"


def _as_list(to: str | Iterable[str]) -> list[str]:
    if isinstance(to, str):
        return [to]
    return list(to)


def _button(text: str, url: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" '
        f'style="margin:24px 0;"><tr><td>'
        f'<a href="{escape(url, quote=True)}" '
        f'style="background-color:{BRAND_PRIMARY};color:#ffffff;text-decoration:none;'
        f"display:inline-block;padding:12px 24px;border-radius:10px;font-weight:600;"
        f'font-size:14px;font-family:Arial,Helvetica,sans-serif;">{escape(text)}</a>'
        f"</td></tr></table>"
    )


def _highlight(label: str, value: str) -> str:
    return (
        f'<div style="margin:16px 0;padding:16px;background-color:#F1F5F9;'
        f'border:1px solid #E2E8F0;border-radius:10px;">'
        f'<div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;'
        f'color:{BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;">{escape(label)}</div>'
        f'<div style="margin-top:6px;font-size:18px;font-weight:700;color:#0F172A;'
        f'font-family:Consolas,Menlo,monospace;word-break:break-all;">{escape(value)}</div>'
        f"</div>"
    )


def _paragraph(text: str) -> str:
    return (
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;'
        f'font-family:Arial,Helvetica,sans-serif;">{escape(text)}</p>'
    )


def _layout(*, title: str, preheader: str, content_html: str) -> str:
    """Envuelve el contenido en el cascarón de marca de SafeCampus."""
    return f"""\
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{escape(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" \
style="background-color:#F1F5F9;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" \
style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;\
box-shadow:0 1px 3px rgba(15,23,42,0.08);">
<tr><td style="background-color:{BRAND_PRIMARY};padding:20px 28px;">
<span style="color:#93C5FD;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;\
font-family:Arial,Helvetica,sans-serif;">SafeCampus</span><br/>
<span style="color:#ffffff;font-size:20px;font-weight:700;\
font-family:Arial,Helvetica,sans-serif;">PUCP</span>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 16px;font-size:20px;color:#0F172A;\
font-family:Arial,Helvetica,sans-serif;">{escape(title)}</h1>
{content_html}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E2E8F0;">
<p style="margin:0;font-size:12px;color:{BRAND_MUTED};\
font-family:Arial,Helvetica,sans-serif;">
{escape(BRAND_NAME)} · Sistema Omnicanal de Gestión de Incidentes · PUCP DITIC<br/>
Este es un mensaje automático, por favor no respondas a este correo.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Usuarios / Auth — alta de cuenta provisionada por el administrador
# ---------------------------------------------------------------------------


def account_welcome(
    *,
    to: str | Iterable[str],
    nombre: str,
    login_url: str,
    temporary_password: str | None = None,
    rol: str | None = None,
) -> EmailMessage:
    """Bienvenida al crear una cuenta. Si se pasa ``temporary_password``,
    se incluye la credencial (cuentas no institucionales)."""
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    rol_txt = f" con el rol de {rol}" if rol else ""

    content = [
        _paragraph(saludo),
        _paragraph(
            f"Se creó tu cuenta en {BRAND_NAME}{rol_txt}. "
            "Desde aquí podrás acceder a la plataforma."
        ),
    ]
    text_lines = [
        saludo,
        f"Se creó tu cuenta en {BRAND_NAME}{rol_txt}.",
    ]

    if temporary_password:
        content.append(
            _paragraph(
                "Usa esta contraseña temporal para tu primer ingreso (cámbiala apenas accedas):"
            )
        )
        content.append(_highlight("Contraseña temporal", temporary_password))
        text_lines.append(f"Contraseña temporal: {temporary_password}")

    content.append(_button("Ingresar a SafeCampus", login_url))
    text_lines.append(f"Ingresa aquí: {login_url}")

    return EmailMessage(
        to=_as_list(to),
        subject=f"Tu acceso a {BRAND_NAME}",
        html=_layout(
            title="Tu cuenta está lista",
            preheader=f"Bienvenido a {BRAND_NAME}",
            content_html="".join(content),
        ),
        text="\n".join(text_lines),
        tags={"modulo": "usuarios", "tipo": "alta_cuenta"},
    )


# ---------------------------------------------------------------------------
# Incidentes — cambio de estado / actualización
# ---------------------------------------------------------------------------


def incident_status_update(
    *,
    to: str | Iterable[str],
    nombre: str,
    codigo: str,
    estado: str,
    detalle_url: str | None = None,
    comentario: str | None = None,
) -> EmailMessage:
    """Notifica al reportante el cambio de estado de su incidente."""
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    content = [
        _paragraph(saludo),
        _paragraph(f"Tu incidente {codigo} cambió de estado a: {estado}."),
    ]
    text_lines = [saludo, f"Incidente {codigo} — nuevo estado: {estado}."]

    if comentario:
        content.append(_highlight("Comentario", comentario))
        text_lines.append(f"Comentario: {comentario}")
    if detalle_url:
        content.append(_button("Ver mi caso", detalle_url))
        text_lines.append(f"Detalle: {detalle_url}")

    return EmailMessage(
        to=_as_list(to),
        subject=f"Incidente {codigo}: {estado}",
        html=_layout(
            title="Actualización de tu incidente",
            preheader=f"Incidente {codigo} ahora está {estado}",
            content_html="".join(content),
        ),
        text="\n".join(text_lines),
        tags={"modulo": "incidentes", "tipo": "cambio_estado"},
    )


# ---------------------------------------------------------------------------
# Alertas — alerta de seguridad
# ---------------------------------------------------------------------------


def security_alert(
    *,
    to: str | Iterable[str],
    titulo: str,
    mensaje: str,
    ubicacion: str | None = None,
    nivel: str | None = None,
    detalle_url: str | None = None,
) -> EmailMessage:
    """Alerta de seguridad para personal operativo/supervisión."""
    content = [_paragraph(mensaje)]
    text_lines = [titulo, "", mensaje]

    if ubicacion:
        content.append(_highlight("Ubicación", ubicacion))
        text_lines.append(f"Ubicación: {ubicacion}")
    if detalle_url:
        content.append(_button("Ver alerta", detalle_url))
        text_lines.append(f"Detalle: {detalle_url}")

    nivel_prefix = f"[{nivel.upper()}] " if nivel else ""
    return EmailMessage(
        to=_as_list(to),
        subject=f"{nivel_prefix}Alerta: {titulo}",
        html=_layout(
            title=titulo,
            preheader=mensaje[:120],
            content_html="".join(content),
        ),
        text="\n".join(text_lines),
        tags={"modulo": "alertas", "tipo": "alerta_seguridad"},
    )


# ---------------------------------------------------------------------------
# Lost & Found — actualización de objeto
# ---------------------------------------------------------------------------


def lost_found_update(
    *,
    to: str | Iterable[str],
    nombre: str,
    objeto: str,
    estado: str,
    detalle_url: str | None = None,
) -> EmailMessage:
    """Notifica una actualización sobre un objeto perdido/encontrado."""
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    content = [
        _paragraph(saludo),
        _paragraph(f"Hay una actualización sobre “{objeto}”: {estado}."),
    ]
    text_lines = [saludo, f"{objeto} — {estado}."]

    if detalle_url:
        content.append(_button("Ver en Lost & Found", detalle_url))
        text_lines.append(f"Detalle: {detalle_url}")

    return EmailMessage(
        to=_as_list(to),
        subject=f"Lost & Found: {objeto}",
        html=_layout(
            title="Actualización de Lost & Found",
            preheader=f"{objeto}: {estado}",
            content_html="".join(content),
        ),
        text="\n".join(text_lines),
        tags={"modulo": "lost_found", "tipo": "actualizacion"},
    )


# ---------------------------------------------------------------------------
# Genérica — para módulos sin plantilla dedicada todavía
# ---------------------------------------------------------------------------


def generic_notification(
    *,
    to: str | Iterable[str],
    titulo: str,
    mensaje: str,
    cta_text: str | None = None,
    cta_url: str | None = None,
    modulo: str = "notificaciones",
) -> EmailMessage:
    """Notificación genérica reutilizable mientras un módulo no tenga plantilla."""
    content = [_paragraph(mensaje)]
    text_lines = [titulo, "", mensaje]
    if cta_text and cta_url:
        content.append(_button(cta_text, cta_url))
        text_lines.append(f"{cta_text}: {cta_url}")

    return EmailMessage(
        to=_as_list(to),
        subject=titulo,
        html=_layout(title=titulo, preheader=mensaje[:120], content_html="".join(content)),
        text="\n".join(text_lines),
        tags={"modulo": modulo, "tipo": "generica"},
    )
