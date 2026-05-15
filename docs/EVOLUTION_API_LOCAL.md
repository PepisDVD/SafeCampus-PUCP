# EvolutionAPI local + SafeCampus

Esta guia explica como levantar EvolutionAPI en local, abrir Evolution Manager,
conectar una sesion de WhatsApp por QR y verificar que SafeCampus reciba, guarde
y muestre mensajes entrantes en la bandeja operativa.

## Que queda funcionando

Flujo local:

```txt
WhatsApp
  -> EvolutionAPI
  -> webhook FastAPI
  -> sc_omnicanal.reporte_entrante
  -> sc_omnicanal.conversacion
  -> sc_omnicanal.mensaje_conversacion
  -> WebSocket SafeCampus
  -> /mensajes
```

El mensaje no se convierte automaticamente en incidente todavia. Primero se guarda
como reporte entrante tecnico y como conversacion operativa. Desde la bandeja se
puede tomar, asignar, responder, cerrar y reabrir el chat; luego se podra crear o
vincular el incidente.

## Requisitos

- Docker Desktop activo.
- Dependencias del monorepo instaladas con `pnpm install`.
- Backend configurado en `apps/backend/.env`.
- Acceso a la base remota de Supabase desde `DATABASE_URL`.
- Un telefono con WhatsApp para escanear el QR.

## Archivos importantes

Versionados:

```txt
infra/docker/evolution/docker-compose.yml
infra/docker/evolution/.env.example
apps/backend/app/api/v1/omnicanal.py
apps/backend/app/services/omnicanal_service.py
apps/backend/app/integrations/messaging/
apps/backend/app/services/omnicanal_realtime.py
apps/web/src/features/whatsapp/components/whatsapp-console.tsx
docs/EVOLUTION_API_LOCAL.md
```

No versionar:

```txt
infra/docker/evolution/.env
apps/backend/.env
apps/web/.env.local
```

## 1. Crear el env local de EvolutionAPI

Desde la raiz del repo, en PowerShell:

```powershell
Copy-Item infra/docker/evolution/.env.example infra/docker/evolution/.env
```

En Linux, macOS o Git Bash:

```bash
cp infra/docker/evolution/.env.example infra/docker/evolution/.env
```

Edita `infra/docker/evolution/.env` y define una API key local:

```env
AUTHENTICATION_API_KEY=mi-api-key-local
POSTGRES_PASSWORD=evolution
```

Activa el webhook global hacia el backend:

```env
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=http://host.docker.internal:8000/api/v1/omnicanal/webhooks/whatsapp
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
```

Notas:

- `host.docker.internal` es necesario porque EvolutionAPI corre dentro de Docker
  y debe llamar al backend que corre en tu maquina host.
- La API key puede ser cualquier valor local, pero debe coincidir con
  `EVOLUTION_API_KEY` en el backend.

## 2. Configurar el backend

Edita `apps/backend/.env` y agrega o revisa estas variables:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=mi-api-key-local
EVOLUTION_INSTANCE_NAME=safecampus-dev
EVOLUTION_WEBHOOK_SECRET=
WHATSAPP_ALLOWED_TEST_PHONES=51999999999
WHATSAPP_IGNORE_GROUP_MESSAGES=true
```

Reemplaza `51999999999` por tu numero real en formato internacional sin `+`.

Ejemplos:

```txt
Correcto: 51999999999
Incorrecto: +51 999 999 999
Incorrecto: 999999999
```

Si quieres aceptar mensajes de cualquier numero durante una prueba local:

```env
WHATSAPP_ALLOWED_TEST_PHONES=
```

## 3. Levantar EvolutionAPI y sus dependencias

Desde la raiz del repo:

```powershell
pnpm dev:evolution:up
```

Esto levanta:

```txt
safecampus-evolution-api
safecampus-evolution-manager-proxy
safecampus-evolution-postgres
safecampus-evolution-redis
```

Ver logs de EvolutionAPI:

```powershell
pnpm dev:evolution:logs
```

Ver contenedores:

```powershell
docker ps
```

Apagar EvolutionAPI:

```powershell
pnpm dev:evolution:down
```

## 4. Abrir Evolution Manager

Abre en el navegador:

```txt
http://localhost:8081/manager
```

En el Manager configura:

```txt
API URL: http://localhost:8081
API Key: mi-api-key-local
```

La API key debe ser la misma de:

```txt
infra/docker/evolution/.env -> AUTHENTICATION_API_KEY
apps/backend/.env          -> EVOLUTION_API_KEY
```

Usa `8081` para el Manager porque pasa por un proxy local que agrega la API key
a la conexion WebSocket de la UI. EvolutionAPI sigue corriendo en `8080`, pero
el Manager embebido de la imagen no siempre envia `apikey` al abrir Socket.IO y
EvolutionAPI 2.3.7 rechaza esa conexion con:

```txt
Connection rejected: apiKey not provided
```

El proxy esta definido en:

```txt
infra/docker/evolution/nginx-manager-proxy.conf.template
```

## 5. Crear o conectar la instancia

En Evolution Manager crea una instancia con este nombre:

```txt
safecampus-dev
```

Ese nombre debe coincidir con:

```env
EVOLUTION_INSTANCE_NAME=safecampus-dev
```

Luego:

1. Abre la instancia en el Manager.
2. Genera o visualiza el QR.
3. En WhatsApp, entra a dispositivos vinculados.
4. Escanea el QR.
5. Espera que la instancia quede conectada.

Si ya existia la instancia pero esta en estado raro, desconectala desde el Manager
o recreala con el mismo nombre.

## 6. Levantar el backend SafeCampus

En otra terminal:

```powershell
pnpm dev:backend
```

Confirma que el backend responde:

```txt
http://localhost:8000/health
http://localhost:8000/api/v1/docs
```

El webhook que recibe EvolutionAPI es:

```txt
POST http://localhost:8000/api/v1/omnicanal/webhooks/whatsapp
```

Pero dentro del contenedor de EvolutionAPI se usa:

```txt
http://host.docker.internal:8000/api/v1/omnicanal/webhooks/whatsapp
```

## 7. Probar el webhook manualmente

Antes de probar con WhatsApp real, valida que el backend pueda guardar un mensaje.

PowerShell:

```powershell
curl.exe -X POST http://localhost:8000/api/v1/omnicanal/webhooks/whatsapp `
  -H "Content-Type: application/json" `
  -H "x-safecampus-provider: evolution" `
  -d "{ `"event`": `"messages.upsert`", `"instance`": `"safecampus-dev`", `"data`": { `"key`": { `"id`": `"LOCAL-TEST-1`", `"remoteJid`": `"51999999999@s.whatsapp.net`", `"fromMe`": false }, `"pushName`": `"Dev Test`", `"message`": { `"conversation`": `"Necesito ayuda en campus`" } } }"
```

Bash:

```bash
curl -X POST http://localhost:8000/api/v1/omnicanal/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-safecampus-provider: evolution" \
  -d '{
    "event": "messages.upsert",
    "instance": "safecampus-dev",
    "data": {
      "key": {
        "id": "LOCAL-TEST-1",
        "remoteJid": "51999999999@s.whatsapp.net",
        "fromMe": false
      },
      "pushName": "Dev Test",
      "message": {
        "conversation": "Necesito ayuda en campus"
      }
    }
  }'
```

Respuesta esperada:

```json
{
  "ok": true,
  "ignored": false,
  "reporte": {
    "provider": "evolution",
    "external_message_id": "LOCAL-TEST-1",
    "sender_phone": "51999999999",
    "message_type": "text",
    "estado": "NORMALIZADO"
  }
}
```

Si responde `ignored: true`, revisa `WHATSAPP_ALLOWED_TEST_PHONES`.

## 8. Probar recepcion real desde WhatsApp

Con EvolutionAPI, Manager y backend corriendo:

1. Verifica que la instancia `safecampus-dev` este conectada en el Manager.
2. Desde otro telefono o chat autorizado, envia un mensaje al WhatsApp vinculado.
3. Mira los logs del backend.
4. Mira los logs de EvolutionAPI con `pnpm dev:evolution:logs`.
5. Verifica las filas en Supabase y la bandeja web en `http://localhost:3000/mensajes`.

Consulta sugerida en Supabase SQL Editor:

```sql
select
  id,
  estado,
  contenido_raw,
  metadatos_canal,
  incidente_id,
  fecha_recepcion
from sc_omnicanal.reporte_entrante
order by fecha_recepcion desc
limit 20;
```

Consulta de conversaciones y mensajes normalizados:

```sql
select
  c.id,
  c.telefono_contacto,
  c.estado,
  c.modo_atencion,
  c.prioridad,
  c.ultimo_mensaje_preview,
  c.ultimo_mensaje_at,
  count(m.id) as mensajes
from sc_omnicanal.conversacion c
left join sc_omnicanal.mensaje_conversacion m
  on m.conversacion_id = c.id
group by c.id
order by c.ultimo_mensaje_at desc
limit 20;
```

Campos utiles dentro de `metadatos_canal`:

```txt
provider
external_message_id
instance_name
sender_phone
sender_name
chat_id
message_type
event_type
content_preview
```

## 9. Que significa que se guarde en reporte_entrante

`sc_omnicanal.reporte_entrante` funciona como bandeja tecnica de entrada.
Guarda el payload completo recibido antes de convertirlo en una conversacion o
incidente.

Columnas clave:

```txt
canal_id          -> canal WhatsApp en sc_omnicanal.canal_reporte
contenido_raw     -> payload completo recibido desde EvolutionAPI
metadatos_canal   -> datos normalizados por el backend
estado            -> NORMALIZADO si el mensaje fue aceptado
incidente_id      -> null hasta que se cree/vincule un incidente
fecha_recepcion   -> fecha de llegada
```

Esto permite auditar lo que llego y depurar webhooks. La bandeja operativa se
alimenta principalmente de:

```txt
sc_omnicanal.conversacion           -> estado, operador, prioridad, ultimo mensaje
sc_omnicanal.mensaje_conversacion   -> historial visible del chat
sc_omnicanal.evento_conversacion    -> trazabilidad de tomar, asignar, cerrar, reabrir
```

## 10. Seguridad local del webhook

Por defecto:

```env
EVOLUTION_WEBHOOK_SECRET=
```

Asi el webhook no exige secreto extra en local.

Si defines:

```env
EVOLUTION_WEBHOOK_SECRET=dev-secret
```

Entonces las llamadas al webhook deben enviar:

```txt
x-safecampus-webhook-secret: dev-secret
```

Para pruebas locales rapidas se recomienda dejarlo vacio.

## 11. Allowlist de telefonos

`WHATSAPP_ALLOWED_TEST_PHONES` limita que numeros procesa SafeCampus.

Ejemplo con un numero:

```env
WHATSAPP_ALLOWED_TEST_PHONES=51999999999
```

Ejemplo con varios numeros:

```env
WHATSAPP_ALLOWED_TEST_PHONES=51999999999,51988888888
```

Reglas:

- Usar formato internacional sin `+`.
- Separar varios numeros con coma.
- Si esta vacio, acepta todos los numeros.
- Si tiene valores, ignora numeros que no esten en la lista.
- Los grupos se ignoran por defecto con `WHATSAPP_IGNORE_GROUP_MESSAGES=true`.

Respuesta esperada para un mensaje ignorado:

```json
{
  "ok": true,
  "ignored": true,
  "reporte": null,
  "detail": "Mensaje ignorado por allowlist local de WhatsApp."
}
```

## 12. Troubleshooting

### No abre el Manager

Verifica que el contenedor este arriba:

```powershell
docker ps
pnpm dev:evolution:logs
```

Revisa:

```txt
http://localhost:8080/manager
```

### API key invalida en Manager

Confirma que el valor ingresado sea igual a:

```txt
infra/docker/evolution/.env -> AUTHENTICATION_API_KEY
```

Si cambiaste `.env`, recrea el servicio:

```powershell
pnpm dev:evolution:down
pnpm dev:evolution:up
```

### EvolutionAPI no llama al backend

Revisa en `infra/docker/evolution/.env`:

```env
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=http://host.docker.internal:8000/api/v1/omnicanal/webhooks/whatsapp
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
```

Confirma que el backend este corriendo:

```powershell
pnpm dev:backend
```

### El backend responde ignored true

Revisa:

```env
WHATSAPP_ALLOWED_TEST_PHONES=
WHATSAPP_IGNORE_GROUP_MESSAGES=true
```

Si estas probando con un grupo, el backend lo va a ignorar por defecto.

### No aparece nada en reporte_entrante

Primero prueba el webhook manual del paso 7. Si eso funciona, el problema esta
entre EvolutionAPI y el webhook. Si no funciona, revisa logs del backend y la
conexion a Supabase.

### Puerto 8080 ocupado

Busca que proceso usa el puerto o cambia el mapeo en:

```txt
infra/docker/evolution/docker-compose.yml
```

Por defecto:

```yaml
ports:
  - "8080:8080"
```

## 13. Comandos rapidos

Levantar EvolutionAPI:

```powershell
pnpm dev:evolution:up
```

Logs:

```powershell
pnpm dev:evolution:logs
```

Backend:

```powershell
pnpm dev:backend
```

Manager:

```txt
http://localhost:8081/manager
```

Apagar EvolutionAPI:

```powershell
pnpm dev:evolution:down
```

Ver ultimos mensajes guardados:

```sql
select id, estado, metadatos_canal, fecha_recepcion
from sc_omnicanal.reporte_entrante
order by fecha_recepcion desc
limit 20;
```

## 14. Bandeja operativa SafeCampus

Con backend, web y EvolutionAPI levantados:

```powershell
pnpm dev:backend
pnpm dev:web
pnpm dev:evolution:up
```

Abre:

```txt
http://localhost:3000/mensajes
```

La bandeja requiere un usuario con rol `administrador` o `supervisor`.

Funciones disponibles:

1. Ver conversaciones y mensajes normalizados.
2. Recibir actualizaciones por WebSocket, sin polling.
3. Tomar chat y pasar a modo humano.
4. Asignar operador.
5. Activar modo bot o humano.
6. Enviar mensajes hacia WhatsApp mediante EvolutionAPI.
7. Cerrar y reabrir conversaciones.

Notas operativas:

- Si EvolutionAPI o el backend estan apagados, los webhooks de ese periodo no
  quedan garantizados en SafeCampus.
- Para produccion, EvolutionAPI debe vivir en un servidor estable y el webhook
  debe apuntar a una URL publica del backend.
- Si se necesita recuperar huecos de mensajes, implementar un job de
  reconciliacion contra el historial disponible en EvolutionAPI.

## 15. Siguientes pasos funcionales

Despues de validar la bandeja real:

1. Implementar clasificacion IA real sobre `mensaje_conversacion`.
2. Crear accion para convertir o vincular una conversacion con incidente.
3. Consolidar KPIs de SLA, bot y operadores.
4. Agregar reconciliacion de mensajes cuando EvolutionAPI haya estado apagado.
5. Cambiar a proveedor Meta cuando existan credenciales oficiales aprobadas.
