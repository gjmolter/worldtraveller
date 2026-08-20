import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl", "dist");
const destination = join(root, "public");

await mkdir(destination, { recursive: true });
await Promise.all([
  copyFile(
    join(source, "maplibre-gl-worker.mjs"),
    join(destination, "maplibre-gl-worker.mjs"),
  ),
  copyFile(
    join(source, "maplibre-gl-shared.mjs"),
    join(destination, "maplibre-gl-shared.mjs"),
  ),
]);
