"""Email / notification integration (Resend)."""

from app.integrations.email.exceptions import (
    EmailDeliveryError,
    EmailError,
    EmailNotConfiguredError,
)
from app.integrations.email.schemas import EmailMessage, EmailSendResult
from app.integrations.email.service import EmailService

__all__ = [
    "EmailService",
    "EmailMessage",
    "EmailSendResult",
    "EmailError",
    "EmailNotConfiguredError",
    "EmailDeliveryError",
]
