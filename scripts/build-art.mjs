// Compila la grafica con la skill pxl e copia gli sprite sheet nel client (apps/client/src/assets:
// il client li importa, così Vite dà ai file un nome che cambia a ogni versione e il browser non
// può mescolare codice nuovo e grafica vecchia). Gli sheet generati si committano: la build del
// gioco non ha bisogno della skill.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pxl = join(root, ".claude/skills/pxl-pixel-art/bin/pxl.js");
const out = join(root, "art/out");
const dest = join(root, "apps/client/src/assets");

// Ogni sorgente e gli sheet che produce.
const SOURCES = [{ file: "art/tiles.px.js", sheets: ["tiles"] }];

if (!existsSync(pxl)) {
  console.error("Skill pxl non trovata: lancia .claude/hooks/install-pxl.sh");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const { file, sheets } of SOURCES) {
  execFileSync(process.execPath, [pxl, "build", join(root, file), "--out", out], { stdio: "inherit" });
  for (const name of sheets) {
    for (const ext of ["png", "json"]) copyFileSync(join(out, `${name}.${ext}`), join(dest, `${name}.${ext}`));
    console.log(`-> apps/client/src/assets/${name}.png, ${name}.json`);
  }
}
