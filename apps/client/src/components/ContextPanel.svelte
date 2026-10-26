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
    fogAt,
    hexEquals,
    outpostAt,
    placeAt,
    previewRoute,
    priceList,
    realDelay,
    type Hex,
    type BuildProblem,
    type Outpost,
    type Place,
    type SiteCheck,
  } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { unitStatus } from "../lib/status";
  import Token from "./Token.svelte";
  import TradeForm from "./TradeForm.svelte";

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
  let status = $derived(world && character ? unitStatus(world, character, game.now, i18n.t) : undefined);
  /** Se il carovaniere selezionato può commerciare nel luogo della casella selezionata. */
  let tradePlace = $derived.by(() => {
    const place = hexInfo?.place;
    if (!character || character.job !== "caravaneer" || character.task || !place) return undefined;
    return place.kind === "town" || place.kind === "market" ? place : undefined;
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

{#snippet featured(place: Place)}
  {#if world && (place.kind === "town" || place.kind === "market")}
    <p class="featured">
      {i18n.t(place.kind === "town" ? "place.wanted" : "place.sells")}:
      {#each priceList(world.map, place).featured as m (m)}
        <span title={i18n.t(`material.${m}`)}><Token name="mat_{m}" scale={2} /></span>
      {/each}
    </p>
  {/if}
{/snippet}

{#snippet close()}
  <button type="button" class="close" onclick={() => game.clearSelection()}>
    <span aria-hidden="true">✕</span>
    <span class="visually-hidden">{i18n.t("action.close")}</span>
  </button>
{/snippet}

<section class="panel" aria-live="polite">
  {#if character}
    <header>
      <Token name="char_{character.ethnicity}" />
      <div class="title">
        <h2>{character.name}</h2>
        <p>
          {i18n.t(`job.${character.job}`, { gender: character.gender })} ·
          {i18n.t(`ethnicity.${character.ethnicity}`, { gender: character.gender })}
        </p>
      </div>
      {@render close()}
    </header>
    <p class="status">{status?.text}</p>
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
      {#if tradePlace}
        {#key tradePlace.id}
          <TradeForm {character} place={tradePlace} />
        {/key}
      {:else if hexInfo.place}
        <p class="about">{i18n.t(`place.${hexInfo.place.kind}.about`)}</p>
        {@render featured(hexInfo.place)}
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
      {#if building || character.task?.kind === "trade"}
        <!-- Sul cantiere, o in viaggio per commerciare, non prende altri ordini. -->
      {:else if preview === null}
        <p class="warn">{i18n.t("route.unreachable")}</p>
      {:else if preview?.here}
        {#if !site?.ok}<p class="hint">{i18n.t("route.here")}</p>{/if}
      {:else if preview}
        <button type="button" class:primary={!site?.ok && !tradePlace} onclick={() => game.sendSelected()}>
          {i18n.t("action.send", { eta: formatDuration(i18n.t, preview.real) })}
        </button>
      {/if}
    {:else if character.destination && character.task?.kind !== "trade"}
      <button type="button" onclick={() => game.stopSelected()}>{i18n.t("action.stop")}</button>
    {:else if !building && !character.task}
      <p class="hint">
        {#if character.job === "builder"}
          {i18n.t("hint.build")}
        {:else if character.job === "caravaneer"}
          {i18n.t("hint.trade")}
        {:else}
          {i18n.t("hint.send", { gender: character.gender })}
        {/if}
      </p>
    {/if}
  {:else if hexInfo?.place}
    <header>
      <Token name="place_{hexInfo.place.kind}" scale={1} />
      <div class="title">
        <h2>{hexInfo.place.name}</h2>
        <p>{i18n.t(`place.${hexInfo.place.kind}`)} · {i18n.t(`biome.${hexInfo.biome}`)}</p>
      </div>
      {@render close()}
    </header>
    <p class="about">{i18n.t(`place.${hexInfo.place.kind}.about`)}</p>
    {@render featured(hexInfo.place)}
  {:else if hexInfo}
    <header>
      <div class="title">
        <h2>
          {#if hexInfo.outpost}{i18n.t(`outpost.${hexInfo.outpost.kind}`)} ·{/if}
          {hexInfo.biome ? i18n.t(`biome.${hexInfo.biome}`) : i18n.t("fog.unexplored")}
        </h2>
        <p class:dim={hexInfo.dim}>
          {i18n.t("hex.title", { q: hexInfo.hex.q, r: hexInfo.hex.r })} · {i18n.t(hexInfo.fogKey)}
        </p>
      </div>
      {@render close()}
    </header>
    {#if hexInfo.guild}<p class="accent">{i18n.t("hex.start")}</p>{/if}
    {#if hexInfo.outpost}<p class="about">{outpostLine(hexInfo.outpost)}</p>{/if}
  {/if}
</section>

<style>
  .panel {
    width: min(340px, 100%);
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

  .title {
    flex: 1;
    min-width: 0;
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

  .featured {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  button {
    min-height: 40px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 12px;
  }

  .close {
    width: 36px;
    min-height: 36px;
    flex: none;
    align-self: flex-start;
    padding: 0;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    font-weight: 600;
  }
</style>
