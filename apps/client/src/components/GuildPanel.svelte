<script lang="ts">
  import {
    HARVEST_MS,
    MATERIAL_IDS,
    OUTPOSTS,
    RECIPES,
    RECIPE_IDS,
    STORAGE_CAPACITY,
    WORKSHOP_COST,
    WORKSHOP_SLOTS,
    nextHarvest,
    realDelay,
    workshopStatus,
    type Amounts,
    type MaterialId,
    type Workshop,
  } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import Token from "./Token.svelte";

  // La simulazione modifica lo stato sul posto: a ogni versione si rilegge tutto.
  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    const { guild, outposts, workshops, clock } = world.state;
    return {
      world,
      clock,
      gold: guild.gold,
      stock: MATERIAL_IDS.filter((m) => guild.stock[m] > 0).map((m) => ({ id: m, amount: guild.stock[m] })),
      outposts: outposts.map((o) => ({ ...o })),
      workshops: workshops.map((w) => ({ ...w })),
    };
  });
  let adding = $state(false);

  /** Un tempo di gioco come attesa reale, a parole. */
  const wait = (gameTime: number) => (view ? formatDuration(i18n.t, realDelay(view.clock, gameTime, game.now)) : "");
  /** Una durata di gioco come durata reale, a parole. */
  const span = (gameMs: number) => (view ? formatDuration(i18n.t, gameMs / view.clock.speed) : "");
  const names = (materials: readonly MaterialId[]) => materials.map((m) => i18n.t(`material.${m}`)).join(", ");

  function statusText(w: Workshop): string {
    if (!view) return "";
    const status = workshopStatus(view.world, w);
    switch (status.kind) {
      case "building":
        return i18n.t("workshop.status.building", { eta: wait(status.until) });
      case "working":
        return i18n.t("workshop.status.working", { eta: wait(status.until) });
      case "paused":
        return i18n.t("workshop.status.paused");
      case "missing":
        return i18n.t("workshop.status.missing", { materials: names(status.materials) });
      case "full":
        return i18n.t("workshop.status.full", { materials: names(status.materials) });
    }
  }
</script>

{#snippet amounts(list: Amounts)}
  {#each list as [material, amount], i (material)}
    {#if i > 0}<span class="plus">+</span>{/if}
    <span class="amount" title={i18n.t(`material.${material}`)}>{amount}<Token name="mat_{material}" scale={1} /></span>
  {/each}
{/snippet}

{#snippet recipe(id: (typeof RECIPE_IDS)[number])}
  <span class="recipe">
    {@render amounts(RECIPES[id].inputs)}
    <span class="arrow" aria-hidden="true">→</span>
    {@render amounts(RECIPES[id].outputs)}
    <span class="cycle">{i18n.t("workshop.cycle", { eta: span(RECIPES[id].duration) })}</span>
  </span>
{/snippet}

<div class="guild">
  {#if view}
    <p class="gold"><Token name="coin" scale={2} />{i18n.t("gold", { n: view.gold })}</p>
    <h3>{i18n.t("guild.storage")}</h3>
    {#if view.stock.length === 0}
      <p class="muted">{i18n.t("guild.storage.empty")}</p>
    {:else}
      <ul class="stock">
        {#each view.stock as item (item.id)}
          <li class:full={item.amount >= STORAGE_CAPACITY}>
            <Token name="mat_{item.id}" scale={2} />
            <span class="name">{i18n.t(`material.${item.id}`)}</span>
            <span class="count">{item.amount}</span>
          </li>
        {/each}
      </ul>
      <p class="muted small">{i18n.t("guild.storage.about", { n: STORAGE_CAPACITY })}</p>
    {/if}

    <h3>{i18n.t("guild.workshops", { used: view.workshops.length, slots: WORKSHOP_SLOTS })}</h3>
    {#if view.workshops.length === 0}
      <p class="muted">{i18n.t("guild.workshops.empty")}</p>
    {/if}
    <ul class="rows">
      {#each view.workshops as w (w.id)}
        <li>
          <Token name="mat_{RECIPES[w.recipe].outputs[0]![0]}" scale={2} />
          <div class="body">
            <strong>{i18n.t(`workshop.${w.recipe}`)}</strong>
            {@render recipe(w.recipe)}
            <span class="status">{statusText(w)}</span>
          </div>
          {#if w.readyAt === null}
            <button type="button" class="small" onclick={() => game.toggleWorkshop(w.id)}>
              {i18n.t(w.paused ? "action.resume" : "action.pause")}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if view.workshops.length >= WORKSHOP_SLOTS}
      <p class="muted small">{i18n.t("guild.workshops.full")}</p>
    {:else if adding}
      <ul class="rows choices">
        {#each RECIPE_IDS as id (id)}
          <li>
            <Token name="mat_{RECIPES[id].outputs[0]![0]}" scale={2} />
            <div class="body">
              <strong>{i18n.t(`workshop.${id}`)}</strong>
              {@render recipe(id)}
            </div>
            <button
              type="button"
              class="small primary"
              disabled={view.gold < WORKSHOP_COST}
              onclick={() => {
                if (game.buildWorkshop(id)?.ok) adding = false;
              }}
            >
              {i18n.t("workshop.build", { cost: i18n.t("gold", { n: WORKSHOP_COST }) })}
            </button>
          </li>
        {/each}
      </ul>
      <button type="button" onclick={() => (adding = false)}>{i18n.t("guild.cancel")}</button>
    {:else}
      <button type="button" class="add" onclick={() => (adding = true)}>+ {i18n.t("guild.workshops.add")}</button>
    {/if}

    <h3>{i18n.t("guild.outposts")}</h3>
    {#if view.outposts.length === 0}
      <p class="muted">{i18n.t("guild.outposts.empty")}</p>
    {/if}
    <ul class="rows">
      {#each view.outposts as o (o.id)}
        {@const material = OUTPOSTS[o.kind].material}
        {@const next = o.readyAt === null ? nextHarvest(view.world, o) : undefined}
        <li>
          <Token name="mat_{material}" scale={2} />
          <div class="body">
            <strong>{i18n.t(`outpost.${o.kind}`)}</strong>
            <span class="status">
              {#if o.readyAt !== null}
                {i18n.t("outpost.status.building", { eta: wait(o.readyAt) })}
              {:else}
                {i18n.t("outpost.yield", { amount: o.yield, material: i18n.t(`material.${material}`), eta: span(HARVEST_MS) })}
                {#if next !== undefined}· {i18n.t("outpost.status.next", { eta: wait(next) })}{/if}
              {/if}
            </span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .guild {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: var(--accent);
  }

  p {
    margin: 0;
    font-size: 0.85rem;
  }

  .muted {
    color: var(--muted);
  }

  .small {
    font-size: 0.78rem;
  }

  .gold {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .stock {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 4px 10px;
  }

  .stock li {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }

  .stock .name {
    flex: 1;
  }

  .count {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .stock li.full .count {
    color: #ff9a8a;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rows li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .choices li {
    border-top: 1px solid var(--panel-border);
    padding-top: 6px;
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 0.85rem;
  }

  .recipe {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 4px;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .amount {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    color: var(--text);
  }

  .status {
    color: var(--muted);
    font-size: 0.78rem;
  }

  button {
    min-height: 36px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 10px;
  }

  button.small {
    min-height: 32px;
    flex: none;
    font-size: 0.8rem;
  }

  button.primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    font-weight: 600;
  }

  button:disabled {
    opacity: 0.5;
  }
</style>
