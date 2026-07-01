# Contexto personalizado del bot conversacional de WhatsApp

Esta carpeta permite enriquecer el comportamiento del asistente conversacional de
WhatsApp **sin tocar código ni el prompt base**. Todo lo que coloques aquí se
inyecta como _contexto adicional validado_ dentro del prompt
`PROMPT-WHATSAPP-BOT-v1.0`.

## Cómo usarla

1. Crea uno o varios archivos `.txt` o `.md` dentro de esta carpeta.
2. Escribe en lenguaje natural reglas, datos o consideraciones que el bot debe
   respetar. Por ejemplo:
   - Reglas de atención validadas por el equipo de seguridad.
   - Información institucional (puertas, pabellones, anexos, horarios).
   - Frases o tono preferido para ciertos casos.
   - Procedimientos específicos del campus.
3. Guarda el archivo. El bot lo tomará en la siguiente conversación; no requiere
   reiniciar nada del prompt base.

## Notas

- Los archivos se cargan en orden alfabético por nombre. Usa prefijos como
  `01-`, `02-` si quieres controlar el orden.
- El archivo `README.md` (este) **no** se carga como contexto.
- Solo se leen extensiones `.txt` y `.md`.
- El contexto combinado se recorta si supera ~12.000 caracteres, así que sé
  conciso y prioriza lo importante.
- El bot funciona perfectamente **sin** archivos aquí: esta capa es opcional y
  aditiva. Si la carpeta está vacía, el asistente opera solo con su prompt base.

## Recomendaciones de redacción

- Una idea por línea o por bloque corto.
- Evita instrucciones contradictorias con el comportamiento de seguridad (el bot
  siempre debe priorizar derivar emergencias críticas a un humano).
- No incluyas datos sensibles o personales reales.
