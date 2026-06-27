import { spawn } from "node:child_process";
import os from "node:os";

const DEFAULT_BACKEND_PORT = "8000";
const DEFAULT_WEB_PORT = "3000";

function isPrivateLanAddress(address) {
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("10.")) return true;

  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function getLanIp() {
  const candidates = Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((address) => !address.startsWith("169.254."));

  return candidates.find(isPrivateLanAddress) ?? candidates[0] ?? null;
}

const lanIp = process.env.SAFECAMPUS_LAN_IP || getLanIp();
const backendPort = process.env.SAFECAMPUS_BACKEND_PORT ?? DEFAULT_BACKEND_PORT;
const webPort = process.env.SAFECAMPUS_WEB_PORT ?? DEFAULT_WEB_PORT;
const env = { ...process.env };

if (lanIp) {
  const webOrigin = `http://${lanIp}:${webPort}`;
  const backendOrigin = `http://${lanIp}:${backendPort}`;
  env.SAFECAMPUS_LAN_IP = lanIp;
  env.DEV_LAN_WEB_ORIGIN = webOrigin;
  env.DEV_LAN_WEB_APP_URL = webOrigin;
  env.DEV_LAN_BACKEND_PUBLIC_URL = backendOrigin;

  console.log(`[backend:lan] LAN IP: ${lanIp}`);
  console.log(`[backend:lan] API: ${backendOrigin}/api/v1`);
  console.log(`[backend:lan] DEV_LAN_WEB_ORIGIN=${env.DEV_LAN_WEB_ORIGIN}`);
  console.log(`[backend:lan] DEV_LAN_WEB_APP_URL=${env.DEV_LAN_WEB_APP_URL}`);
  console.log(`[backend:lan] DEV_LAN_BACKEND_PUBLIC_URL=${env.DEV_LAN_BACKEND_PUBLIC_URL}`);
  console.log("[backend:lan] Supabase Site URL puede quedarse en http://localhost:3000");
  console.log(`[backend:lan] Supabase Redirect URL requerida: ${webOrigin}/auth/callback`);
  console.log(`[backend:lan] Backend OAuth callback interno: ${backendOrigin}/api/v1/auth/google/callback`);
} else {
  console.warn("[backend:lan] No se pudo detectar una IP LAN; se usara la configuracion por defecto.");
}

const child = spawn(
  "uvicorn",
  ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", backendPort],
  {
    cwd: new URL("..", import.meta.url),
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
