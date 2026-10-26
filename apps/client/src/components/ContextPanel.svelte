<script lang="ts">
  import {
    FOG_EXPLORED,
    FOG_UNEXPLORED,
    HARVEST_MS,
    OUTPOSTS,
    OUTPOST_COST,
    STAT_IDS,
    biomeIdAt,
    checkOutpostSite,
    estimateArrival,
    fogAt,
    hexEquals,
    outpostAt,
    outpostKindFor,
    placeAt,
    previewRoute,
    realDelay,
    type Hex,
    type BuildProblem,
    type Outpost,
    type SiteCheck,
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
      place: level === FOG_UNEXPLORED ? undefined : placeAt(world.map, h),
      outpost: level === FOG_UNEXPLORED ? undefined : outpostAt(world.state, h),
    };
  }

  let hexInfo = $derived.by(() => {
    void game.version;
    return game.selectedHex ? describeHex(game.selectedHex) : undefined;
  });

  /** Il cantiere su cui lavora, se sta costruendo. */
  let building = $derived.by(() => {
    void game.version;
    const task = character?.task;
    if (!world || task?.kind !== "building") return undefined;
    const outpost = world.state.outposts.find((o) => o.id === task.outpostId);
    return outpost ? { ...outpost } : undefined;
  });
  /** Cosa va a costruire, se è in viaggio per farlo. */
  let goingToBuild = $derived.by(() => {
    const task = character?.task;
    return world && task?.kind === "build" ? outpostKindFor(biomeIdAt(world.map, task.hex)) : undefined;
  });

  /** Se il costruttore selezionato può fondare un avamposto sulla casella selezionata. */
  let site = $derived.by((): SiteCheck | { readonly ok: false; readonly reason: BuildProblem } | undefined => {
    void game.version;
    if (!world || !character || character.job !== "builder" || building || !game.selectedHex) return undefined;
    const check = checkOutpostSite(world, game.selectedHex);
    if (check.ok && world.state.guild.gold < OUTPOST_COST) return { ok: false, reason: "gold" };
    return check;
  });

  /** Un tempo di gioco come attesa reale, a parole. */
  function wait(gameTime: number): string {
    return world ? formatDuration(i18n.t, realDelay(world.state.clock, gameTime, game.now)) : "";
  }

  function outpostLine(o: Outpost): string {
    if (!world) return "";
    if (o.readyAt !== null) return i18n.t("outpost.status.building", { eta: wait(o.readyAt) });
    return yieldLine(o.kind, o.yield);
  }

  function yieldLine(kind: Outpost["kind"], amount: number): string {
    if (!world) return "";
    return i18n.t("outpost.yield", {
      amount,
      material: i18n.t(`material.${OUTPOSTS[kind].material}`),
      eta: formatDuration(i18n.t, HARVEST_MS / world.state.clock.speed),
    });
  }

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
      {#if building?.readyAt}
        {i18n.t("status.building", { kind: i18n.t(`outpost.${building.kind}`), eta: wait(building.readyAt) })}
      {:else if eta !== undefined && goingToBuild}
        {i18n.t("status.goingToBuild", { kind: i18n.t(`outpost.${goingToBuild}`), eta: formatDuration(i18n.t, eta) })}
      {:else if eta !== undefined}
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
        {#if hexInfo.place}
          {hexInfo.place.name} ({i18n.t(`place.${hexInfo.place.kind}`)}) ·
        {:else if hexInfo.outpost}
          {i18n.t(`outpost.${hexInfo.outpost.kind}`)} ·
        {/if}
        {hexInfo.biome ? i18n.t(`biome.${hexInfo.biome}`) : i18n.t("fog.unexplored")} ·
        {i18n.t("hex.title", { q: hexInfo.hex.q, r: hexInfo.hex.r })}
      </p>
      {#if hexInfo.place}
        <p class="about">{i18n.t(`place.${hexInfo.place.kind}.about`)}</p>
      {:else if hexInfo.outpost}
        <p class="about">{outpostLine(hexInfo.outpost)}</p>
      {/if}
      {#if site?.ok}
        <button type="button" class="primary" onclick={() => game.buildOutpost()}>
          {i18n.t("action.build", { cost: i18n.t("gold", { n: OUTPOST_COST }) })}
        </button>
        <p class="hint">{i18n.t(`outpost.${site.kind}`)}: {yieldLine(site.kind, site.yield)}</p>
      {:else if site}
        <p class="warn">{i18n.t("build.blocked", { reason: i18n.t(`reason.${site.reason}`) })}</p>
      {/if}
      {#if building}
        <!-- Sul cantiere non si muove. -->
      {:else if preview === null}
        <p class="warn">{i18n.t("route.unreachable")}</p>
      {:else if preview?.here}
        {#if !site?.ok}<p class="hint">{i18n.t("route.here")}</p>{/if}
      {:else if preview}
        <button type="button" class:primary={!site?.ok} onclick={() => game.sendSelected()}>
          {i18n.t("action.send", { eta: formatDuration(i18n.t, preview.real) })}
        </button>
      {/if}
    {:else if character.destination}
      <button type="button" onclick={() => game.stopSelected()}>{i18n.t("action.stop")}</button>
    {:else if !building}
      <p class="hint">
        {character.job === "builder" ? i18n.t("hint.build") : i18n.t("hint.send", { gender: character.gender })}
      </p>
    {/if}
  {:else if hexInfo?.place}
    <header>
      <Token name="place_{hexInfo.place.kind}" scale={1} />
      <div>
        <h2>{hexInfo.place.name}</h2>
        <p>{i18n.t(`place.${hexInfo.place.kind}`)} · {i18n.t(`biome.${hexInfo.biome}`)}</p>
      </div>
    </header>
    <p class="about">{i18n.t(`place.${hexInfo.place.kind}.about`)}</p>
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

  .about {
    color: var(--text);
    line-height: 1.35;
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
