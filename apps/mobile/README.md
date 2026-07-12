# SafeCampus Mobile

App Expo/React Native para operadores de seguridad.

## Desarrollo Local Con Backend

Para probar la app en un celular fisico con Expo Go, el backend debe estar
levantado y accesible desde el telefono.

1. Levanta el backend desde la raiz del repo:

```bash
pnpm dev:backend
```

El script usa `--host 0.0.0.0`, por lo que el backend queda disponible para
otros dispositivos de la misma red.

2. Verifica desde la laptop:

```txt
http://localhost:8000/health
```

3. Verifica desde el navegador del celular usando la IP LAN de la laptop:

```txt
http://TU_IP_LAN:8000/health
```

Debe responder algo similar a:

```json
{"status":"ok","version":"0.1.0","service":"safecampus-backend"}
```

4. Levanta Expo en modo LAN:

```bash
cd apps/mobile
pnpm run dev:lan:auto
```

5. Escanea el QR con Expo Go.

## URL Del Backend

La app resuelve `API_BASE_URL` con este orden:

1. Si existe `EXPO_PUBLIC_API_URL`, usa ese valor.
2. En desarrollo, si Expo/Metro expone una IP LAN, la app la detecta
   automaticamente y usa:

```txt
http://IP_DE_METRO:8000/api/v1
```

3. Si no puede detectar una IP, cae a:

```txt
http://localhost:8000/api/v1
```

En un celular fisico, `localhost` apunta al telefono, no a la laptop. Por eso
se recomienda usar `dev:lan:clear` y misma red Wi-Fi.

## Mapa Tactico

El modulo de mapa usa Leaflet dentro de `react-native-webview` con teselas de
OpenStreetMap. No usa `react-native-maps`, Google Maps SDK ni API key nativa de
Google Maps, por lo que aceptar el permiso de ubicacion no debe montar el
componente nativo que cerraba Android de golpe.

El telefono necesita conexion a internet para descargar Leaflet y las teselas
de OpenStreetMap al abrir el mapa.

## Forzar IP Manualmente

Si la red no permite deteccion automatica o hay problemas de cache, define la
URL manualmente antes de levantar Expo.

PowerShell:

```powershell
$env:EXPO_PUBLIC_API_URL="http://TU_IP_LAN:8000/api/v1"
pnpm run dev:lan:clear
```

Bash:

```bash
EXPO_PUBLIC_API_URL="http://TU_IP_LAN:8000/api/v1" pnpm run dev:lan:clear
```

## Modos De Expo

```bash
pnpm run dev:lan:auto
```

Detecta la IP LAN actual de la laptop, define
`EXPO_PUBLIC_API_URL=http://<ip>:8000/api/v1` para ese arranque y ejecuta
Expo con `--lan --clear`. Es el modo recomendado cuando la laptop y el celular
estan en la misma Wi-Fi.

```bash
pnpm run dev:lan
```

Usar cuando laptop y celular estan en la misma Wi-Fi.

```bash
pnpm run dev:lan:clear
```

Igual que LAN, pero limpia cache de Metro. Recomendado despues de cambiar
variables de entorno o configuracion.

```bash
pnpm run dev:tunnel
```

Tuneliza Metro para cargar el bundle desde otra red, pero no expone el backend
local. Para usar este modo con backend local se necesita exponer tambien el
backend con una herramienta como ngrok o cloudflared y definir
`EXPO_PUBLIC_API_URL`.

```bash
pnpm run dev:tunnel:auto
```

Tuneliza Metro, pero configura la app con la IP LAN actual de la laptop. Esto
solo sirve si el celular tambien puede alcanzar esa IP LAN; si esta en otra red,
hay que tunelizar el backend aparte.

## Diagnostico

Si aparece `Sin conexion con el servidor`:

- Confirma que `pnpm dev:backend` esta corriendo.
- Abre `http://TU_IP_LAN:8000/health` desde el celular.
- Usa `pnpm run dev:lan:auto`.
- Revisa en la terminal de Expo los logs:

```txt
[api:request]
[fallback:FB-NET]
```

Estos logs muestran la URL real a la que la app intenta conectarse.
