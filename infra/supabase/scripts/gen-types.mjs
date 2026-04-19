import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const outputPath = resolve(
  process.cwd(),
  "../../packages/shared-types/src/database.types.ts",
);

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
