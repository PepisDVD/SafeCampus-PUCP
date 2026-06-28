import { spawn } from "node:child_process";
import os from "node:os";

const DEFAULT_API_PATH = "/api/v1";
const DEFAULT_BACKEND_PORT = "8000";

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

const lanIp = getLanIp();
const cliArgs = process.argv.slice(2);
const expoArgs = ["exec", "expo", "start", ...cliArgs];
const env = { ...process.env };

if (!env.EXPO_PUBLIC_API_URL && lanIp) {
  const port = env.SAFECAMPUS_BACKEND_PORT ?? DEFAULT_BACKEND_PORT;
  env.EXPO_PUBLIC_API_URL = `http://${lanIp}:${port}${DEFAULT_API_PATH}`;
}

if (env.EXPO_PUBLIC_API_URL) {
  console.log(`[mobile] EXPO_PUBLIC_API_URL=${env.EXPO_PUBLIC_API_URL}`);
} else {
  console.warn("[mobile] No se pudo detectar una IP LAN; Expo usara la configuracion por defecto.");
}

const child = spawn("pnpm", expoArgs, {
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
