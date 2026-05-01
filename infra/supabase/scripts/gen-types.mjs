import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const outputPath = resolve(
  process.cwd(),
  "../../packages/shared-types/src/database.types.ts",
);
const rootEnvPath = resolve(process.cwd(), "../../.env");
const webEnvLocalPath = resolve(process.cwd(), "../../apps/web/.env.local");

const assignEnvIfMissing = (key, value) => {
  const current = process.env[key];
  if (!current || !current.trim()) {
    process.env[key] = value;
  }
};

const stripOptionalQuotes = (value) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const loadEnvFile = (filePath) => {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const clean = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed;
    const separatorIndex = clean.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = clean.slice(0, separatorIndex).trim();
    if (!key) continue;

    const rawValue = clean.slice(separatorIndex + 1);
    assignEnvIfMissing(key, stripOptionalQuotes(rawValue));
  }
};

// Load env in a deterministic order:
// 1) root .env, 2) apps/web/.env.local as fallback for web-defined public vars.
loadEnvFile(rootEnvPath);
loadEnvFile(webEnvLocalPath);

const getProjectIdFromUrl = (url) => {
  try {
    const hostname = new URL(url).hostname;
    const [projectId] = hostname.split(".");
    return projectId || "";
  } catch {
    return "";
  }
};

const projectId =
  process.env.SUPABASE_PROJECT_ID?.trim() ||
  getProjectIdFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

if (!projectId) {
  console.error(
    "No se pudo resolver SUPABASE_PROJECT_ID. Define SUPABASE_PROJECT_ID o NEXT_PUBLIC_SUPABASE_URL antes de ejecutar gen:types.",
  );
  process.exit(1);
}

try {
  const generated = execSync(
    `supabase gen types --lang typescript --project-id ${projectId} --schema public`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (!generated.trim()) {
    console.error("Supabase CLI devolvio una salida vacia.");
    process.exit(1);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, generated, "utf8");
  console.log(`Tipos Supabase generados en ${outputPath}`);
} catch (error) {
  console.error("Fallo la generacion de tipos Supabase.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
