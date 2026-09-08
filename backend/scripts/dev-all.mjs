import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port =
  (portIndex >= 0
    ? args[portIndex + 1]
    : args.find((value) => /^\d+$/.test(value))) ||
  process.env.WEB_PORT ||
  "5173";
if (!/^\d+$/.test(port)) throw new Error("Port frontend invalide.");
const children = [
  spawn(process.execPath, ["--watch", "backend/src/server.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }),
  spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          "../../Frontend/node_modules/vite/bin/vite.js",
          import.meta.url,
        ),
      ),
      "--host",
      "127.0.0.1",
      "--port",
      port,
      "--strictPort",
    ],
    {
      cwd: fileURLToPath(new URL("../../Frontend", import.meta.url)),
      stdio: "inherit",
      env: process.env,
    },
  ),
];
// Each application owns its dependencies; this helper starts both processes.
function stop() {
  for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop();
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    stop();
    process.exitCode = code || 0;
  });
}
