"""Schemas for the email/notification integration."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, model_validator


class EmailMessage(BaseModel):
    """Representa un correo a enviar a través del proveedor (Resend)."""

    to: list[EmailStr] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=255)
    html: str | None = None
    text: str | None = None
    reply_to: EmailStr | None = None
    cc: list[EmailStr] | None = None
    bcc: list[EmailStr] | None = None
    tags: dict[str, str] | None = None

    @model_validator(mode="after")
    def _require_body(self) -> EmailMessage:
        if not self.html and not self.text:
            raise ValueError("El correo debe incluir contenido 'html' o 'text'.")
        return self


class EmailSendResult(BaseModel):
    """Resultado del envío de un correo."""

    id: str | None = None
    provider: str = "resend"
