<script lang="ts">
  import {
    MATERIAL_IDS,
    cargoCapacity,
    hexEquals,
    previewRoute,
    priceList,
    quotePurchase,
    quoteSale,
    unitQuote,
    type Character,
    type MaterialId,
    type Place,
  } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import Token from "./Token.svelte";

  /**
   * Il carico di un carovaniere: cosa vendere a una cittadina (dal magazzino) o cosa comprare a
   * un mercato, con i prezzi del momento, la capienza e il conto previsto.
   */
  let { character, place }: { character: Character; place: Place } = $props();

  const selling = $derived(place.kind === "town");
  let qty = $state<Partial<Record<MaterialId, number>>>({});

  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    const { guild } = world.state;
    const prices = priceList(world.map, place);
    const capacity = cargoCapacity(character);
    const materials = selling ? MATERIAL_IDS.filter((m) => guild.stock[m] > 0) : prices.featured;
    const rows = materials.map((m) => ({
      id: m,
      max: selling ? Math.min(guild.stock[m], capacity) : capacity,
      price: unitQuote(world, place, m),
      wanted: selling && prices.featured.includes(m),
    }));
    const goods = rows.map((r): [MaterialId, number] => [r.id, Math.min(qty[r.id] ?? 0, r.max)]).filter(([, n]) => n > 0);
    const units = goods.reduce((sum, [, n]) => sum + n, 0);
    const total = selling ? quoteSale(world, place, goods) : quotePurchase(world, place, goods);
    const route = previewRoute(world, character, place.hex);
    const atGuild = !character.step && hexEquals(character.hex, guild.hex);
    return {
      rows,
      goods,
      units,
      capacity,
      total,
      eta: route ? formatDuration(i18n.t, route.duration / world.state.clock.speed) : undefined,
      blocked: selling && !atGuild,
      affordable: selling || total <= guild.gold,
    };
  });

  /** Quante unità di una materia si possono ancora caricare, oltre a quelle già scelte. */
  function room(id: MaterialId): number {
    if (!view) return 0;
    return view.capacity - view.units + Math.min(qty[id] ?? 0, view.rows.find((r) => r.id === id)?.max ?? 0);
  }

  function set(id: MaterialId, n: number): void {
    const max = view?.rows.find((r) => r.id === id)?.max ?? 0;
    qty = { ...qty, [id]: Math.max(0, Math.min(n, max, room(id))) };
  }
</script>

{#if view}
  <div class="trade">
    <h3>{i18n.t(selling ? "trade.sellTitle" : "trade.buyTitle", { place: place.name })}</h3>
    {#if view.blocked}
      <p class="hint">{i18n.t("trade.fromGuild")}</p>
    {:else if view.rows.length === 0}
      <p class="hint">{i18n.t("trade.nothingToSell")}</p>
    {:else}
      <ul>
        {#each view.rows as r (r.id)}
          <li class:wanted={r.wanted}>
            <Token name="mat_{r.id}" scale={2} />
            <span class="price" title={i18n.t("trade.price")}><Token name="coin" scale={1} />{r.price}</span>
            {#if selling}<span class="stock">/ {r.max}</span>{/if}
            <span class="stepper">
              <button type="button" aria-label={i18n.t("trade.less")} onclick={() => set(r.id, (qty[r.id] ?? 0) - 1)}>−</button>
              <span class="qty">{Math.min(qty[r.id] ?? 0, r.max)}</span>
              <button type="button" aria-label={i18n.t("trade.more")} onclick={() => set(r.id, (qty[r.id] ?? 0) + 1)}>+</button>
              <button type="button" class="max" onclick={() => set(r.id, r.max)}>{i18n.t("trade.max")}</button>
            </span>
          </li>
        {/each}
      </ul>
      <p class="sum">
        <span>{i18n.t("trade.load", { units: view.units, capacity: view.capacity })}</span>
        <span class:warn={!view.affordable}>
          {i18n.t(selling ? "trade.revenue" : "trade.cost", { gold: i18n.t("gold", { n: view.total }) })}
        </span>
      </p>
      <button
        type="button"
        class="go"
        disabled={view.units === 0 || !view.affordable || view.eta === undefined}
        onclick={() => game.trade(place.id, selling ? "sell" : "buy", view!.goods)}
      >
        {i18n.t(selling ? "trade.sell" : "trade.buy", { eta: view.eta ?? "–" })}
      </button>
    {/if}
  </div>
{/if}

<style>
  .trade {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--panel-border);
    padding-top: 6px;
  }

  h3 {
    margin: 0;
    font-size: 0.85rem;
    color: var(--accent);
  }

  p {
    margin: 0;
    font-size: 0.85rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .price {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-width: 3.2em;
    font-weight: 600;
  }

  li.wanted .price {
    color: var(--accent);
  }

  .stock {
    color: var(--muted);
    font-size: 0.78rem;
  }

  .stepper {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .qty {
    min-width: 2ch;
    text-align: center;
    font-weight: 600;
  }

  button {
    min-width: 32px;
    min-height: 32px;
    padding: 0 8px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  .max {
    font-size: 0.75rem;
  }

  .sum {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 0.8rem;
  }

  .warn {
    color: #ff9a8a;
  }

  .hint {
    color: var(--text);
  }

  .go {
    min-height: 40px;
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
    font-weight: 600;
  }

  .go:disabled {
    opacity: 0.5;
  }
</style>
