"""Exceptions for the email/notification integration (Resend)."""


class EmailError(Exception):
    """Error base de la integración de correo."""


class EmailNotConfiguredError(EmailError):
    """La integración de correo no tiene credenciales configuradas."""


class EmailDeliveryError(EmailError):
    """El proveedor rechazó o no pudo entregar el correo."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
