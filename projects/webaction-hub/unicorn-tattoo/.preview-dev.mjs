// Local preview launcher: starts `next dev` with cwd pinned to this folder
// (the preview runner spawns from a different working directory). Not part of
// the deliverable. See .gitignore.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [bin, "start", "--port", process.env.PORT || "3020"], {
  cwd: dir,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
