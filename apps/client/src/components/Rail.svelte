<script lang="ts">
  import { calendar, gameTimeAt } from "@exp/core";
  import { formatClock } from "../lib/format";
  import { game, type Drawer } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { daylight } from "../lib/map/daylight";
  import Token from "./Token.svelte";

  /** Il menu a sinistra: l'ora, le monete e le icone che aprono i pannelli. */
  let { onZoom }: { onZoom: (steps: number) => void } = $props();

  let gameNow = $derived(game.world ? gameTimeAt(game.world.state.clock, game.now) : undefined);
  let time = $derived.by(() => {
    if (gameNow === undefined) return undefined;
    const { day, hours, minutes } = calendar(gameNow);
    return { day, text: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`, night: daylight(gameNow).night };
  });
  let gold = $derived.by(() => {
    void game.version;
    return game.world?.state.guild.gold;
  });
  let units = $derived.by(() => {
    void game.version;
    return game.world?.state.characters.length ?? 0;
  });

  const ITEMS: { drawer: Drawer; icon: string; scale: number; label: string }[] = [
    { drawer: "units", icon: "ui_units", scale: 2, label: "rail.units" },
    { drawer: "guild", icon: "guild", scale: 1, label: "rail.guild" },
  ];
</script>

<nav class="rail" aria-label={i18n.t("rail.label")}>
  {#if time && gameNow !== undefined}
    <div class="clock" title={`${formatClock(i18n.t, gameNow)} · ${i18n.t("speed", { speed: game.speed })}`}>
      <Token name={time.night ? "ui_moon" : "ui_sun"} scale={2} />
      <span class="time">{time.text}</span>
      <span class="small">{i18n.t("clock.day", { day: time.day })}</span>
    </div>
  {/if}
  {#if gold !== undefined}
    <div class="gold" title={i18n.t("gold", { n: gold })}>
      <Token name="coin" scale={1} />
      <span>{gold}</span>
    </div>
  {/if}

  {#each ITEMS as item (item.drawer)}
    <button
      type="button"
      class="item"
      class:active={game.drawer === item.drawer}
      aria-pressed={game.drawer === item.drawer}
      onclick={() => game.toggleDrawer(item.drawer)}
    >
      <span class="icon"><Token name={item.icon} scale={item.scale} /></span>
      <span class="small">{i18n.t(item.label)}</span>
      {#if item.drawer === "units" && units > 0}<span class="badge">{units}</span>{/if}
    </button>
  {/each}

  <span class="spacer"></span>
  <button type="button" class="zoom" aria-label={i18n.t("zoom.in")} onclick={() => onZoom(1)}>+</button>
  <button type="button" class="zoom" aria-label={i18n.t("zoom.out")} onclick={() => onZoom(-1)}>−</button>
  <button
    type="button"
    class="item"
    class:active={game.drawer === "options"}
    aria-pressed={game.drawer === "options"}
    onclick={() => game.toggleDrawer("options")}
  >
    <span class="icon"><Token name="ui_options" scale={2} /></span>
    <span class="small">{i18n.t("rail.options")}</span>
  </button>
</nav>

<style>
  .rail {
    width: 64px;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px 4px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    overflow-y: auto;
    scrollbar-width: none;
  }

  .clock,
  .gold {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-variant-numeric: tabular-nums;
  }

  .time {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .gold {
    flex-direction: row;
    justify-content: center;
    gap: 3px;
    font-size: 0.8rem;
    font-weight: 600;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--panel-border);
  }

  .small {
    font-size: 0.68rem;
    color: var(--muted);
    white-space: nowrap;
  }

  button {
    position: relative;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    padding: 0;
  }

  .item {
    min-height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .item:hover {
    border-color: var(--panel-border);
  }

  .item.active {
    background: rgb(244 212 76 / 14%);
    border-color: var(--accent);
  }

  .item.active .small {
    color: var(--accent);
  }

  .icon {
    height: 24px;
    display: flex;
    align-items: center;
  }

  .badge {
    position: absolute;
    top: 3px;
    right: 6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 16px;
  }

  .spacer {
    flex: 1;
    min-height: 4px;
  }

  .zoom {
    min-height: 40px;
    font-size: 1.3rem;
    line-height: 1;
    border-color: var(--panel-border);
  }
</style>
