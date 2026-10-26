<script lang="ts">
  import { MATERIAL_IDS, OUTPOSTS, RECIPES, STORAGE_CAPACITY, type MaterialId } from "@exp/core";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import Token from "./Token.svelte";

  /**
   * Le risorse della gilda in colonna, solo icona e quantità: le monete, poi le materie che ha in
   * magazzino o che i suoi avamposti e laboratori muovono (così le righe non vanno e vengono quando
   * una scorta arriva a zero).
   */
  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    const { guild, outposts, workshops } = world.state;
    const used: MaterialId[] = outposts.map((o) => OUTPOSTS[o.kind].material);
    for (const w of workshops) {
      for (const [m] of [...RECIPES[w.recipe].inputs, ...RECIPES[w.recipe].outputs]) used.push(m);
    }
    return {
      gold: guild.gold,
      materials: MATERIAL_IDS.filter((m) => guild.stock[m] > 0 || used.includes(m)).map((m) => ({ id: m, amount: guild.stock[m] })),
    };
  });
</script>

{#if view}
  <ul class="resources" aria-label={i18n.t("resources.label")}>
    <li title={i18n.t("gold", { n: view.gold })}>
      <Token name="coin" scale={2} />
      <span class="amount">{view.gold}</span>
      <span class="visually-hidden">{i18n.t("gold", { n: view.gold })}</span>
    </li>
    {#each view.materials as m (m.id)}
      <li class:full={m.amount >= STORAGE_CAPACITY} title={i18n.t(`material.${m.id}`)}>
        <Token name="mat_{m.id}" scale={2} />
        <span class="amount">{m.amount}</span>
        <span class="visually-hidden">{i18n.t(`material.${m.id}`)}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .resources {
    list-style: none;
    margin: 0;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 26px;
  }

  .amount {
    min-width: 2ch;
    text-align: right;
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  li.full .amount {
    color: #ff9a8a;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
