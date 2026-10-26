<script lang="ts">
  import { FOG_EXPLORED, FOG_UNEXPLORED, biomeIdAt, fogAt, hexEquals } from "@exp/core";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";

  const FOG_KEYS = ["fog.unexplored", "fog.explored", "fog.visible"];

  let info = $derived.by(() => {
    void game.fogVersion;
    const { map, fog, selected } = game;
    if (!map || !fog || !selected) return undefined;
    const biome = biomeIdAt(map, selected);
    if (!biome) return undefined;
    const fogLevel = game.fogEnabled ? fogAt(fog, map, selected) : 2;
    return {
      hex: selected,
      biome: fogLevel === FOG_UNEXPLORED ? undefined : biome,
      fogKey: FOG_KEYS[fogLevel] as string,
      start: fogLevel !== FOG_UNEXPLORED && hexEquals(selected, map.start),
      dim: fogLevel === FOG_EXPLORED,
    };
  });
</script>

<section class="panel" aria-live="polite">
  {#if info}
    <h2>{info.biome ? i18n.t(`biome.${info.biome}`) : i18n.t("fog.unexplored")}</h2>
    <p class:dim={info.dim}>
      {i18n.t("hex.title", { q: info.hex.q, r: info.hex.r })} · {i18n.t(info.fogKey)}
    </p>
    {#if info.start}
      <p class="start">{i18n.t("hex.start")}</p>
    {/if}
  {:else}
    <p class="hint">{i18n.t("map.hint")}</p>
  {/if}
</section>

<style>
  .panel {
    max-width: min(320px, 70vw);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 8px 12px;
  }

  h2 {
    margin: 0 0 2px;
    font-size: 1rem;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .start {
    margin-top: 4px;
    color: var(--accent);
  }

  .hint {
    color: var(--text);
  }
</style>
