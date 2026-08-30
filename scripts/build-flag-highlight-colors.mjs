import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import countries from "world-countries";
import sharp from "sharp";
import customPlaceData from "../data/custom-places.json" with { type: "json" };

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flagDirectory = resolve(root, "node_modules/flag-icons/flags/4x3");
const outputPath = resolve(root, "data/flag-highlight-colors.json");
function colorMetrics(color) {
  const [red, green, blue] = [1, 3, 5].map((index) =>
    Number.parseInt(color.slice(index, index + 2), 16) / 255,
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const saturation = max === 0 ? 0 : (max - min) / max;
  return { luminance, saturation };
}

function toHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function primaryColor(svg) {
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(64, 48, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = new Map();

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha < 180) continue;

    const color = toHex(red, green, blue);
    const { luminance } = colorMetrics(color);
    if (luminance > 0.9) continue;

    const key = `${Math.round(red / 24)}-${Math.round(green / 24)}-${Math.round(blue / 24)}`;
    const bin = bins.get(key) || {
      count: 0,
      red: 0,
      green: 0,
      blue: 0,
    };
    bin.count += 1;
    bin.red += red;
    bin.green += green;
    bin.blue += blue;
    bins.set(key, bin);
  }

  const candidates = [...bins.values()].map((bin) => {
    const color = toHex(
      bin.red / bin.count,
      bin.green / bin.count,
      bin.blue / bin.count,
    );
    const { luminance, saturation } = colorMetrics(color);
    const darkPenalty = luminance < 0.08 ? 0.12 : luminance < 0.16 ? 0.5 : 1;
    return {
      color,
      score: bin.count * (0.55 + saturation * 1.2) * darkPenalty,
    };
  });

  return candidates.sort((a, b) => b.score - a.score)[0]?.color || "#4f7f66";
}

const availableFiles = new Set(await readdir(flagDirectory));
const colorsByFlagCode = {};
await Promise.all(
  [...availableFiles]
    .filter((fileName) => fileName.endsWith(".svg"))
    .map(async (fileName) => {
      const flagCode = fileName.replace(/\.svg$/, "");
      colorsByFlagCode[flagCode] = await primaryColor(
        await readFile(resolve(flagDirectory, fileName), "utf8"),
      );
    }),
);

const colors = Object.fromEntries(
  countries
    .filter(({ cca2 }) => cca2)
    .map(({ cca2 }) => {
      const id = cca2.toLowerCase();
      return [id, colorsByFlagCode[id] || "#4f7f66"];
    }),
);
customPlaceData.places.forEach(({ id, flagCode }) => {
  colors[id] =
    colorsByFlagCode[flagCode] ||
    ({ "es-ce": "#222222", "es-ml": "#58a8d8" }[id] ?? "#4f7f66");
});

await writeFile(
  outputPath,
  `${JSON.stringify({ reviewedOn: "2026-08-23", colors }, null, 2)}\n`,
);
console.log(`Wrote ${Object.keys(colors).length} flag-derived highlight colors`);
