"""Carga de contexto dinamico para el bot conversacional de WhatsApp.

Permite que el equipo agregue archivos `.txt` o `.md` con reglas validadas,
informacion institucional o consideraciones que el LLM debe tener en cuenta.
El contenido se inyecta como contexto adicional en el prompt conversacional.

El bot funciona sin depender de estos archivos: si la carpeta esta vacia, el
loader devuelve una cadena vacia y el prompt opera solo con su comportamiento base.
"""

from __future__ import annotations

from pathlib import Path

# Archivos que no se cargan como contexto (documentacion de la carpeta).
_IGNORED_FILENAMES = {"readme.md", "readme.txt"}
_SUPPORTED_SUFFIXES = (".txt", ".md")
_MAX_CONTEXT_CHARS = 12000


class WhatsAppBotContextLoader:
    """Lee y concatena los archivos de contexto personalizado del bot."""

    def __init__(self, context_dir: Path | None = None) -> None:
        self._context_dir = (
            context_dir or Path(__file__).resolve().parent / "prompts" / "whatsapp_bot_context"
        )

    def load(self) -> str:
        """Devuelve el contexto adicional concatenado, o "" si no hay archivos."""
        if not self._context_dir.exists() or not self._context_dir.is_dir():
            return ""

        fragments: list[str] = []
        for path in self._iter_context_files():
            try:
                text = path.read_text(encoding="utf-8").strip()
            except OSError:
                continue
            if text:
                fragments.append(f"### {path.stem}\n{text}")

        if not fragments:
            return ""

        combined = "\n\n".join(fragments).strip()
        if len(combined) > _MAX_CONTEXT_CHARS:
            combined = combined[:_MAX_CONTEXT_CHARS].rstrip()
        return combined

    def _iter_context_files(self) -> list[Path]:
        files = [
            path
            for path in self._context_dir.iterdir()
            if path.is_file()
            and path.suffix.lower() in _SUPPORTED_SUFFIXES
            and path.name.lower() not in _IGNORED_FILENAMES
        ]
        return sorted(files, key=lambda item: item.name.lower())
