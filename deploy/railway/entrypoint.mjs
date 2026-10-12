import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { persistentDbPath, simulationEnvFile } from "./runtime-env.mjs";

// Railway mounts the volume only at runtime. Do not seed databases or secrets during image build.
const db = persistentDbPath(process.env);
mkdirSync(dirname(db), { recursive: true });
process.env.RUNNER_DB_PATH = db;

if (process.env.CRE_PROJECT_DIR) {
  writeFileSync(resolve(process.env.CRE_PROJECT_DIR, ".env"), simulationEnvFile(process.env), { mode: 0o600 });
}
const child = spawn(process.execPath, ["--import", "tsx", "services/runner/src/index.ts"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", () => process.exit(1));
child.on("exit", code => process.exit(code ?? 1));
