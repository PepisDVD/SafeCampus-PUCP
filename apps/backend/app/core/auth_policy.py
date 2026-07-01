"""
📁 apps/backend/app/core/auth_policy.py
🎯 Política central rol↔canal (RBAC por canal) — ADR-004.
📦 Capa: Core / Seguridad

Principios:
- El canal se deriva del endpoint, nunca de un valor enviado por el cliente.
- El backend es la única fuente de verdad del rol.
- Denegar por defecto: cualquier rol no listado no concede acceso.
- Evaluación POR CANAL: el usuario pasa si tiene al menos un rol válido para
  ese canal y opera con ese rol; los roles del otro canal no aplican aquí.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum


class AuthChannel(StrEnum):
    WEB = "web"
    MOBILE = "movil"


# Allowlist rol → canal.
CHANNEL_ALLOWED_ROLES: dict[AuthChannel, frozenset[str]] = {
    AuthChannel.WEB: frozenset({"administrador", "supervisor", "comunidad"}),
    AuthChannel.MOBILE: frozenset({"operador"}),
}

NO_ROLE_MESSAGE = "Cuenta sin rol asignado; contacte al administrador."
CHANNEL_DENIED_MESSAGE: dict[AuthChannel, str] = {
    AuthChannel.WEB: "Esta cuenta es de operador; ingrese por la app móvil.",
    AuthChannel.MOBILE: "Esta cuenta no es de operador; ingrese por la web.",
}


@dataclass(frozen=True)
class ChannelAccessResult:
    allowed: bool
    effective_roles: list[str]
    is_anomalous: bool
    denied_message: str | None


def is_anomalous_combination(roles: Iterable[str]) -> bool:
    """`True` si la cuenta mezcla roles de ambos canales (combinación anómala)."""
    role_set = set(roles)
    has_web = bool(role_set & CHANNEL_ALLOWED_ROLES[AuthChannel.WEB])
    has_mobile = bool(role_set & CHANNEL_ALLOWED_ROLES[AuthChannel.MOBILE])
    return has_web and has_mobile


def evaluate_channel_access(roles: Iterable[str], channel: AuthChannel) -> ChannelAccessResult:
    """Evalúa el acceso de una cuenta a un canal concreto.

    - Si tiene al menos un rol válido para el canal → permitido, operando con
      esos roles efectivos (los del otro canal no aplican aquí).
    - Si no tiene ningún rol → denegado con ``NO_ROLE_MESSAGE``.
    - Si tiene roles pero ninguno válido para el canal → denegado con el
      mensaje específico del canal.
    """
    role_set = list(dict.fromkeys(roles))  # preserva orden, sin duplicados
    effective = [r for r in role_set if r in CHANNEL_ALLOWED_ROLES[channel]]
    anomalous = is_anomalous_combination(role_set)

    if effective:
        return ChannelAccessResult(True, effective, anomalous, None)
    if not role_set:
        return ChannelAccessResult(False, [], anomalous, NO_ROLE_MESSAGE)
    return ChannelAccessResult(False, [], anomalous, CHANNEL_DENIED_MESSAGE[channel])
