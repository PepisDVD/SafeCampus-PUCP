"""
Cliente server-only para Gemini API.

Mantiene las credenciales fuera del frontend y encapsula el contrato REST de
generateContent para que los servicios de dominio no dependan del detalle HTTP.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.core.config import settings
from app.core.constants import NivelSeveridad
from app.schemas.incidente import ExpedienteCierreAiDraft, IncidentePriorizacionAi


class GeminiService:
    async def priorizar_incidente(
        self,
        *,
        contexto: dict[str, Any],
    ) -> IncidentePriorizacionAi:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY no esta configurada en el backend.",
            )

        prompt = self._build_priorizacion_prompt(contexto)
        parsed = await self._generate_json(prompt)
        severidad_raw = str(parsed.get("severidad", "")).strip().upper()
        if severidad_raw not in {item.value for item in NivelSeveridad}:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini devolvio una severidad invalida.",
            )
        try:
            confianza = (
                float(parsed["confianza"])
                if parsed.get("confianza") is not None
                else None
            )
            return IncidentePriorizacionAi(
                severidad=NivelSeveridad(severidad_raw),
                categoria_sugerida=(
                    str(parsed["categoria_sugerida"]).strip()
                    if parsed.get("categoria_sugerida")
                    else None
                ),
                confianza=confianza,
                justificacion=(
                    str(parsed["justificacion"]).strip()
                    if parsed.get("justificacion")
                    else None
                ),
            )
        except (TypeError, ValueError, ValidationError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini devolvio una priorizacion incompleta.",
            ) from exc

    async def generar_borrador_cierre(
        self,
        *,
        contexto: dict[str, Any],
    ) -> ExpedienteCierreAiDraft:
        prompt = self._build_prompt(contexto)
        parsed = await self._generate_json(prompt)
        try:
            return ExpedienteCierreAiDraft(
                resumen_cierre=str(parsed.get("resumen_cierre", "")).strip(),
                resultado_cierre=(
                    str(parsed["resultado_cierre"]).strip()
                    if parsed.get("resultado_cierre")
                    else None
                ),
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini devolvio un borrador incompleto.",
            ) from exc

    @staticmethod
    def _build_priorizacion_prompt(contexto: dict[str, Any]) -> str:
        contexto_json = json.dumps(contexto, ensure_ascii=False, indent=2)
        return f"""
Eres asistente de triaje de seguridad universitaria.
Prioriza el incidente segun el contexto reportado.

Reglas:
- Responde solo JSON valido, sin markdown.
- Usa este esquema exacto:
  {{"severidad": "BAJO|MEDIO|ALTO|CRITICO", "categoria_sugerida": "texto o null",
  "confianza": 0.0, "justificacion": "texto breve"}}
- CRITICO: peligro inmediato para vida/salud, incendio activo, arma,
  violencia en curso o emergencia medica grave.
- ALTO: riesgo relevante, robo/hurto reciente, lesion no grave, acoso
  o amenaza que requiere atencion pronta.
- MEDIO: requiere seguimiento operativo sin peligro inmediato.
- BAJO: reporte informativo o situacion menor sin riesgo inmediato.
- Si falta informacion, no asumas gravedad extrema; usa MEDIO salvo senales claras.

Contexto del incidente:
{contexto_json}
""".strip()

    @staticmethod
    def _build_prompt(contexto: dict[str, Any]) -> str:
        contexto_json = json.dumps(contexto, ensure_ascii=False, indent=2)
        return f"""
Eres asistente de operaciones de seguridad universitaria.
Con el contexto del incidente, genera un borrador formal para el expediente de cierre.

Reglas:
- Responde solo JSON valido, sin markdown.
- Usa este esquema exacto:
  {{"resumen_cierre": "texto", "resultado_cierre": "texto breve o null"}}
- El resumen debe explicar que ocurrio, como se atendio y por que puede cerrarse.
- No inventes hechos que no aparezcan en el contexto.
- Si falta informacion, usa una redaccion prudente indicando que no consta en el expediente.
- Manten tono institucional, claro y conciso.

Contexto del incidente:
{contexto_json}
""".strip()

    async def _generate_json(self, prompt: str) -> dict[str, Any]:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY no esta configurada en el backend.",
            )

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent"
        )
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=25) as client:
                response = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": settings.GEMINI_API_KEY,
                    },
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo generar la respuesta con Gemini.",
            ) from exc

        text = self._extract_text(response.json())
        return self._parse_json_text(text)

    @staticmethod
    def _extract_text(payload: dict[str, Any]) -> str:
        try:
            parts = payload["candidates"][0]["content"]["parts"]
            return "".join(str(part.get("text", "")) for part in parts).strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini devolvio una respuesta sin contenido util.",
            ) from exc

    @staticmethod
    def _parse_json_text(text: str) -> dict[str, Any]:
        clean = text.strip()
        if clean.startswith("```"):
            clean = clean.removeprefix("```json").removeprefix("```").strip()
            clean = clean.removesuffix("```").strip()
        try:
            parsed = json.loads(clean)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini no devolvio JSON valido para el borrador.",
            ) from exc
        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini devolvio un formato inesperado.",
            )
        return parsed
