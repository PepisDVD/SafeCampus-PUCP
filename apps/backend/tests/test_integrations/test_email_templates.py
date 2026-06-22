from app.integrations.email import templates
from app.integrations.email.schemas import EmailMessage


def test_account_welcome_incluye_password_y_cta():
    msg = templates.account_welcome(
        to="ana@gmail.com",
        nombre="Ana",
        login_url="https://safecampus.test/login",
        temporary_password="Xy12ab34cd56",
        rol="supervisor",
    )
    assert isinstance(msg, EmailMessage)
    assert msg.to == ["ana@gmail.com"]
    assert "Xy12ab34cd56" in (msg.html or "")
    assert "Xy12ab34cd56" in (msg.text or "")
    assert "https://safecampus.test/login" in (msg.html or "")
    assert msg.tags == {"modulo": "usuarios", "tipo": "alta_cuenta"}


def test_account_welcome_sin_password_no_expone_credencial():
    msg = templates.account_welcome(
        to="ana@gmail.com",
        nombre="Ana",
        login_url="https://safecampus.test/login",
    )
    assert "Contraseña temporal" not in (msg.html or "")


def test_incident_status_update_arma_asunto_y_cuerpo():
    msg = templates.incident_status_update(
        to="user@pucp.edu.pe",
        nombre="Luis",
        codigo="INC-2026-001",
        estado="EN ATENCIÓN",
        detalle_url="https://safecampus.test/mis-casos/1",
        comentario="Unidad en camino",
    )
    assert "INC-2026-001" in msg.subject
    assert "EN ATENCIÓN" in msg.subject
    assert "Unidad en camino" in (msg.html or "")
    assert msg.tags == {"modulo": "incidentes", "tipo": "cambio_estado"}


def test_security_alert_incluye_nivel_en_asunto():
    msg = templates.security_alert(
        to=["op1@pucp.edu.pe", "op2@pucp.edu.pe"],
        titulo="Intrusión detectada",
        mensaje="Movimiento no autorizado en el pabellón A.",
        ubicacion="Pabellón A",
        nivel="critico",
    )
    assert msg.subject.startswith("[CRITICO]")
    assert msg.to == ["op1@pucp.edu.pe", "op2@pucp.edu.pe"]
    assert "Pabellón A" in (msg.html or "")


def test_generic_notification_escapa_html_inyectado():
    msg = templates.generic_notification(
        to="user@pucp.edu.pe",
        titulo="Aviso",
        mensaje="<script>alert(1)</script>",
    )
    assert "<script>" not in (msg.html or "")
    assert "&lt;script&gt;" in (msg.html or "")


def test_lost_found_update_tags():
    msg = templates.lost_found_update(
        to="user@pucp.edu.pe",
        nombre="Rosa",
        objeto="Mochila azul",
        estado="Encontrada",
    )
    assert msg.tags == {"modulo": "lost_found", "tipo": "actualizacion"}
    assert "Mochila azul" in (msg.html or "")
