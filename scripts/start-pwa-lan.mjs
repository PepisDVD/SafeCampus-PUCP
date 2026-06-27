import { spawn } from "node:child_process";
import os from "node:os";

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
const backendPort = process.env.SAFECAMPUS_BACKEND_PORT ?? "8000";
const webPort = process.env.SAFECAMPUS_WEB_PORT ?? "3000";
const env = {
  ...process.env,
  ...(lanIp ? { SAFECAMPUS_LAN_IP: lanIp } : {}),
  SAFECAMPUS_BACKEND_PORT: backendPort,
  SAFECAMPUS_WEB_PORT: webPort,
};

if (lanIp) {
  const backendOrigin = `http://${lanIp}:${backendPort}`;
  const webOrigin = `http://${lanIp}:${webPort}`;
  console.log(`[pwa:lan] LAN IP: ${lanIp}`);
  console.log(`[pwa:lan] Abre en el celular: ${webOrigin}`);
  console.log(`[pwa:lan] PWA comunidad: ${webOrigin}/inicio`);
  console.log(`[pwa:lan] Lost & Found: ${webOrigin}/lost-found`);
  console.log("[pwa:lan] Supabase Site URL puede quedarse en http://localhost:3000");
  console.log(`[pwa:lan] Supabase Redirect URL requerida: ${webOrigin}/auth/callback`);
  console.log(`[pwa:lan] Backend OAuth callback interno: ${backendOrigin}/api/v1/auth/google/callback`);
} else {
  console.warn("[pwa:lan] No se pudo detectar una IP LAN; se usara la configuracion por defecto.");
}

const children = [
  spawn("pnpm", ["dev:backend:lan"], {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  }),
  spawn("pnpm", ["dev:web:lan"], {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal) shutdown(0);
    else if (code && code !== 0) shutdown(code);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
