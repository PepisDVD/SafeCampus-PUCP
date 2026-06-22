"""Envía un correo de prueba con Resend para verificar la integración end-to-end.

Uso:
    python scripts/send_test_email.py deividpachas@gmail.com

Requiere en el .env: EMAIL_ENABLED=true, RESEND_API_KEY y RESEND_FROM_EMAIL.
Con el sandbox `onboarding@resend.dev` Resend solo entrega al correo dueño de la
cuenta hasta que verifiques un dominio propio.
"""

from __future__ import annotations

import argparse
import asyncio

from app.integrations.email import EmailService, templates


async def _send(to: str) -> None:
    service = EmailService()
    if not service.is_enabled:
        raise SystemExit(
            "Email deshabilitado o sin configurar. Revisa EMAIL_ENABLED, "
            "RESEND_API_KEY y RESEND_FROM_EMAIL en apps/backend/.env."
        )
    result = await service.send(
        templates.account_welcome(
            to=to,
            nombre="Equipo SafeCampus",
            login_url="http://localhost:3000/login",
            temporary_password="Demo1234abcd",
            rol="supervisor",
        )
    )
    print(f"Correo enviado correctamente. id={result.id} provider={result.provider}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enviar correo de prueba vía Resend.")
    parser.add_argument("to", help="Correo destinatario de la prueba.")
    args = parser.parse_args()
    asyncio.run(_send(args.to))


if __name__ == "__main__":
    main()
