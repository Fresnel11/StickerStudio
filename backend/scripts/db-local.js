import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { Client } from "pg";

const backend = fileURLToPath(new URL("../", import.meta.url));
const dataRoot = join(backend, "data");
const dataPath = join(dataRoot, "postgres");
const envPath = join(backend, ".env.development");
const marker = join(dataRoot, "local-postgres.json");
const action = process.argv[2] || "start";
const bin =
  process.env.PG_BIN ||
  execFileSync("pg_config", ["--bindir"], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
const run = (program, args, capture = false) =>
  execFileSync(
    join(bin, program + (process.platform === "win32" ? ".exe" : "")),
    args,
    { windowsHide: true, stdio: capture ? "pipe" : "inherit" },
  );
if (action === "setup" && !existsSync(marker)) {
  if (existsSync(envPath))
    throw new Error(
      "backend/.env.development existe déjà. Utilisez votre PostgreSQL avec npm run db:migrate, ou réservez une configuration distincte avant une installation locale.",
    );
  mkdirSync(dataRoot, { recursive: true });
  const password = randomBytes(24).toString("hex");
  const passwordFile = join(dataRoot, ".init-password");
  writeFileSync(passwordFile, password, { mode: 0o600 });
  try {
    run("initdb", [
      "-D",
      dataPath,
      "-U",
      "sticker_studio",
      "--encoding=UTF8",
      "--locale=C",
      "--auth=scram-sha-256",
      "--pwfile",
      passwordFile,
    ]);
  } finally {
    unlinkSync(passwordFile);
  }
  const url = `postgresql://sticker_studio:${password}@127.0.0.1:55432/`;
  writeFileSync(
    envPath,
    `DATABASE_URL=${url}sticker_studio\nTEST_DATABASE_URL=${url}sticker_studio_test\nAPI_PORT=3001\nHOST=127.0.0.1\n`,
    { mode: 0o600 },
  );
  writeFileSync(marker, JSON.stringify({ port: 55432, dataPath }, null, 2));
}
if (!existsSync(marker))
  throw new Error(
    "Aucune instance PostgreSQL locale gérée par ce projet. Lancez npm run db:setup ou configurez backend/.env.",
  );
const local = JSON.parse(readFileSync(marker, "utf8"));
if (local.dataPath !== dataPath || local.port !== 55432)
  throw new Error(
    "La configuration locale ne correspond pas au répertoire de ce projet.",
  );
if (action === "stop") {
  run("pg_ctl", ["-D", dataPath, "stop", "-m", "fast"]);
  process.exit(0);
}
let running = true;
try {
  run("pg_ctl", ["-D", dataPath, "status"], true);
} catch {
  running = false;
}
if (!running)
  run("pg_ctl", [
    "-D",
    dataPath,
    "-l",
    join(dataRoot, "postgres.log"),
    "-o",
    "-h 127.0.0.1 -p 55432",
    "-w",
    "start",
  ]);
loadEnvFile(envPath);
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "55432")
  throw new Error("Le DATABASE_URL ne désigne pas l’instance locale dédiée.");
url.pathname = "/postgres";
const client = new Client({ connectionString: url.toString() });
await client.connect();
try {
  for (const name of ["sticker_studio", "sticker_studio_test"]) {
    if (
      !(
        await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name])
      ).rowCount
    )
      await client.query(`CREATE DATABASE "${name}"`);
  }
} finally {
  await client.end();
}
console.log(
  "PostgreSQL local prêt sur 127.0.0.1:55432. Connexions configurées dans backend/.env.",
);
