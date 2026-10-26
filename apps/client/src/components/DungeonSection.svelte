<script lang="ts">
  import { dungeonLevels, levelEmptyUntil, realDelay, type Place } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";

  /** I livelli di un dungeon: quali sono da esplorare e quali sono vuoti, e fino a quando. */
  let { place }: { place: Place } = $props();

  let levels = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return [];
    return Array.from({ length: dungeonLevels(world, place) }, (_, i) => {
      const until = levelEmptyUntil(world, place.id, i + 1);
      return {
        level: i + 1,
        status:
          until === undefined
            ? i18n.t("dungeon.full")
            : i18n.t("dungeon.emptyUntil", { eta: formatDuration(i18n.t, realDelay(world.state.clock, until, game.now)) }),
        empty: until !== undefined,
      };
    });
  });
</script>

<div class="dungeon">
  <h3>{i18n.t("dungeon.levels")}</h3>
  <ul>
    {#each levels as l (l.level)}
      <li class:empty={l.empty}><strong>{i18n.t("dungeon.level", { level: l.level })}</strong> · {l.status}</li>
    {/each}
  </ul>
</div>

<style>
  .dungeon {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h3 {
    margin: 0;
    font-size: 0.85rem;
    color: var(--accent);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.82rem;
  }

  li.empty {
    color: var(--muted);
  }
</style>
