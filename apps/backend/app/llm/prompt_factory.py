"""Prompt repository and factory for compiled LLM requests."""

import json
from pathlib import Path
from typing import Any

from app.llm.exceptions import MissingPromptVariableError, PromptNotFoundError
from app.llm.schemas import PromptTemplate


class PromptFactory:
    def __init__(self, prompts_root: Path | None = None) -> None:
        self._prompts_root = prompts_root or Path(__file__).resolve().parent / "prompts"
        self._registry_path = self._prompts_root / "registry.json"

    def get_active_prompt(self, tipo: str = "clasificacion") -> PromptTemplate:
        registry = self._load_registry()
        active_entries = [
            entry
            for entry in registry.get("prompts", [])
            if entry.get("tipo") == tipo and entry.get("estado") == "activo"
        ]
        if len(active_entries) != 1:
            raise PromptNotFoundError(
                f"Expected exactly one active prompt for tipo='{tipo}', got {len(active_entries)}."
            )
        return self.get_prompt_by_version(active_entries[0]["id"])

    def get_prompt_by_version(self, version_id: str) -> PromptTemplate:
        prompt_path = self._prompts_root / f"{version_id}.json"
        if not prompt_path.exists():
            raise PromptNotFoundError(f"Prompt '{version_id}' was not found.")
        payload = json.loads(prompt_path.read_text(encoding="utf-8"))
        payload["source_path"] = prompt_path
        return PromptTemplate.model_validate(payload)

    def compile_user_message(self, template: PromptTemplate, variables: dict[str, str]) -> str:
        missing = [name for name in template.variables_requeridas if not variables.get(name)]
        if missing:
            raise MissingPromptVariableError(
                f"Missing prompt variables: {', '.join(sorted(missing))}."
            )
        return template.user_message_template.format(**variables)

    def _load_registry(self) -> dict[str, Any]:
        if not self._registry_path.exists():
            raise PromptNotFoundError("Prompt registry.json was not found.")
        data: dict[str, Any] = json.loads(self._registry_path.read_text(encoding="utf-8"))
        return data
