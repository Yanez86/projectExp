<script lang="ts">
  import {
    FOG_EXPLORED,
    FOG_UNEXPLORED,
    STAT_IDS,
    biomeIdAt,
    estimateArrival,
    fogAt,
    hexEquals,
    previewRoute,
    realDelay,
    type Hex,
  } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import Token from "./Token.svelte";

  const FOG_KEYS = ["fog.unexplored", "fog.explored", "fog.visible"];

  let world = $derived.by(() => {
    void game.version;
    return game.world;
  });
  // La simulazione modifica i personaggi sul posto: una copia a ogni versione fa aggiornare la vista.
  let character = $derived.by(() => {
    void game.version;
    const c = world?.state.characters.find((x) => x.id === game.selectedId);
    return c ? { ...c } : undefined;
  });

  function describeHex(h: Hex) {
    if (!world) return undefined;
    const biome = biomeIdAt(world.map, h);
    if (!biome) return undefined;
    const level = game.fogEnabled ? fogAt(world.state.fog, world.map, h) : 2;
    return {
      hex: h,
      biome: level === FOG_UNEXPLORED ? undefined : biome,
      fogKey: FOG_KEYS[level] as string,
      dim: level === FOG_EXPLORED,
      guild: level !== FOG_UNEXPLORED && hexEquals(h, world.state.guild.hex),
    };
  }

  let hexInfo = $derived.by(() => {
    void game.version;
    return game.selectedHex ? describeHex(game.selectedHex) : undefined;
  });

  /** Quanto manca all'arrivo, in tempo reale. */
  let eta = $derived.by(() => {
    void game.version;
    if (!world || !character) return undefined;
    const at = estimateArrival(world, character);
    return at === null ? undefined : realDelay(world.state.clock, at, game.now);
  });

  /** Dove andrebbe e in quanto, se lo mandassimo sulla casella selezionata. */
  let preview = $derived.by(() => {
    void game.version;
    if (!world || !character || !game.selectedHex) return undefined;
    const from = character.step ? character.step.to : character.hex;
    if (hexEquals(from, game.selectedHex) && !character.destination) return { here: true as const };
    const p = previewRoute(world, character, game.selectedHex);
    return p ? { here: false as const, real: p.duration / world.state.clock.speed } : null;
  });
</script>

<section class="panel" aria-live="polite">
  {#if character}
    <header>
      <Token name="char_{character.ethnicity}" />
      <div>
        <h2>{character.name}</h2>
        <p>
          {i18n.t(`ethnicity.${character.ethnicity}`, { gender: character.gender })} ·
          {i18n.t(`job.${character.job}`, { gender: character.gender })}
        </p>
      </div>
    </header>
    <p class="status">
      {#if eta !== undefined}
        {i18n.t("status.travelling", { eta: formatDuration(i18n.t, eta) })}
      {:else}
        {i18n.t("status.idle", { gender: character.gender })}
      {/if}
    </p>
    <dl class="stats">
      {#each STAT_IDS as stat (stat)}
        <div><dt>{i18n.t(`stat.${stat}`)}</dt><dd>{character.stats[stat]}</dd></div>
      {/each}
    </dl>
    {#if hexInfo}
      <p class="target" class:dim={hexInfo.dim}>
        {hexInfo.biome ? i18n.t(`biome.${hexInfo.biome}`) : i18n.t("fog.unexplored")} ·
        {i18n.t("hex.title", { q: hexInfo.hex.q, r: hexInfo.hex.r })}
      </p>
      {#if preview === null}
        <p class="warn">{i18n.t("route.unreachable")}</p>
      {:else if preview?.here}
        <p class="hint">{i18n.t("route.here")}</p>
      {:else if preview}
        <button type="button" class="primary" onclick={() => game.sendSelected()}>
          {i18n.t("action.send", { eta: formatDuration(i18n.t, preview.real) })}
        </button>
      {/if}
    {:else if character.destination}
      <button type="button" onclick={() => game.stopSelected()}>{i18n.t("action.stop")}</button>
    {:else}
      <p class="hint">{i18n.t("hint.send", { gender: character.gender })}</p>
    {/if}
  {:else if hexInfo}
    <h2>{hexInfo.biome ? i18n.t(`biome.${hexInfo.biome}`) : i18n.t("fog.unexplored")}</h2>
    <p class:dim={hexInfo.dim}>
      {i18n.t("hex.title", { q: hexInfo.hex.q, r: hexInfo.hex.r })} · {i18n.t(hexInfo.fogKey)}
    </p>
    {#if hexInfo.guild}<p class="accent">{i18n.t("hex.start")}</p>{/if}
  {:else}
    <p class="hint">{i18n.t("hint.select")}</p>
  {/if}
</section>

<style>
  .panel {
    width: min(340px, calc(100vw - 72px));
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 8px 12px 10px;
  }

  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .status {
    color: var(--text);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin: 0;
    font-size: 0.78rem;
    color: var(--muted);
  }

  .stats div {
    display: flex;
    gap: 4px;
  }

  dd {
    margin: 0;
    color: var(--text);
    font-weight: 600;
  }

  .target {
    color: var(--text);
    border-top: 1px solid var(--panel-border);
    padding-top: 6px;
  }

  .dim {
    opacity: 0.75;
  }

  .warn {
    color: #ff9a8a;
  }

  .accent {
    color: var(--accent);
  }

  .hint {
    color: var(--text);
  }

  button {
    min-height: 40px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 12px;
  }

  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    font-weight: 600;
  }
</style>
