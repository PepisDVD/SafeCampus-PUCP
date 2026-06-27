import { spawn } from "node:child_process";
import os from "node:os";

const DEFAULT_API_PATH = "/api/v1";
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
const webPort = process.env.SAFECAMPUS_WEB_PORT ?? process.env.PORT ?? DEFAULT_WEB_PORT;
const env = { ...process.env };

if (lanIp) {
  env.SAFECAMPUS_LAN_IP = lanIp;
  env.PORT = webPort;
  env.NEXT_PUBLIC_API_URL = env.NEXT_PUBLIC_API_URL ?? `http://${lanIp}:${backendPort}${DEFAULT_API_PATH}`;
  env.BACKEND_URL = env.BACKEND_URL ?? `http://${lanIp}:${backendPort}${DEFAULT_API_PATH}`;
  env.NEXT_PUBLIC_WS_URL = env.NEXT_PUBLIC_WS_URL ?? `ws://${lanIp}:${backendPort}`;
}

if (lanIp) {
  console.log(`[web:lan] LAN IP: ${lanIp}`);
  console.log(`[web:lan] Abre en el celular: http://${lanIp}:${webPort}`);
  console.log(`[web:lan] PWA comunidad: http://${lanIp}:${webPort}/inicio`);
  console.log(`[web:lan] Lost & Found: http://${lanIp}:${webPort}/lost-found`);
  console.log(`[web:lan] NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL}`);
} else {
  console.warn("[web:lan] No se pudo detectar una IP LAN; Next usara la configuracion por defecto.");
}

const child = spawn("next", ["dev", "--hostname", "0.0.0.0", "--port", webPort], {
  cwd: new URL("..", import.meta.url),
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
