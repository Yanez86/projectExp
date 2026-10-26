import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  // Percorsi relativi: il gioco funziona anche servito da una sottocartella (GitHub Pages).
  base: "./",
  plugins: [svelte()],
});
