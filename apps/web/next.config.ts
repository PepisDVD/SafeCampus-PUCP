import type { NextConfig } from "next";
import os from "node:os";

function isPrivateLanAddress(address: string): boolean {
  if (address.startsWith("192.168.")) return true;
  if (address.startsWith("10.")) return true;

  const match = address.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function getLanIps(): string[] {
  const addresses = Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((address) => !address.startsWith("169.254."))
    .filter(isPrivateLanAddress);

  return Array.from(new Set(addresses));
}

const lanIps = Array.from(
  new Set([
    process.env.SAFECAMPUS_LAN_IP,
    ...getLanIps(),
  ].filter((value): value is string => Boolean(value))),
);
const webPort = process.env.SAFECAMPUS_WEB_PORT ?? process.env.PORT ?? "3000";
const allowedDevOrigins = lanIps.flatMap((ip) => [
  ip,
  `${ip}:${webPort}`,
  `http://${ip}:${webPort}`,
]);

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
