import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_API_PATH = "/api/v1";
const DEFAULT_BACKEND_PORT = "8000";
const MOBILE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function isPrivateLanAddress(address) {
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("10.")) return true;

  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function isVirtualInterface(name) {
  const normalized = name.toLowerCase();
  return [
    "vethernet",
    "wsl",
    "hyper-v",
    "virtualbox",
    "vmware",
    "docker",
    "npcap",
    "loopback",
  ].some((value) => normalized.includes(value));
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = Object.values(interfaces)
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((address) => !address.startsWith("169.254."));

  const physicalCandidates = Object.entries(interfaces)
    .filter(([name]) => !isVirtualInterface(name))
    .flatMap(([, items]) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((address) => !address.startsWith("169.254."));

  return (
    physicalCandidates.find(isPrivateLanAddress) ??
    physicalCandidates[0] ??
    candidates.find(isPrivateLanAddress) ??
    candidates[0] ??
    null
  );
}

const lanIp = getLanIp();
const cliArgs = process.argv.slice(2);
const expoArgs = ["exec", "expo", "start", ...cliArgs];
const dotenv = loadDotEnv(path.join(MOBILE_DIR, ".env"));
const env = { ...dotenv, ...process.env };

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
