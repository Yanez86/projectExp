<script lang="ts">
  import { untrack } from "svelte";
  import {
    MAX_SQUAD,
    dungeonLevels,
    levelEmptyUntil,
    previewRoute,
    squadStrength,
    successChance,
    type Character,
    type Place,
  } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { fullName } from "../lib/names";
  import Token from "./Token.svelte";

  /**
   * La spedizione: chi va (il mercenario selezionato e altri liberi, fino a tre), fino a che
   * livello, con la probabilità di riuscita di ogni livello per questa squadra.
   */
  let { character, place }: { character: Character; place: Place } = $props();

  // Si parte dal mercenario selezionato: il componente rinasce quando cambia (vedi {#key}).
  let chosen = $state<number[]>(untrack(() => [character.id]));
  let depth = $state(1);

  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    const time = world.state.time;
    const free = world.state.characters.filter(
      (c) => c.job === "mercenary" && !c.task && (c.woundedUntil === null || c.woundedUntil <= time),
    );
    const squad = free.filter((c) => chosen.includes(c.id));
    const strength = squadStrength(squad);
    const levels = dungeonLevels(world, place);
    const route = previewRoute(world, character, place.hex);
    return {
      free: free.map((c) => ({ ...c })),
      squad,
      levels,
      chances: Array.from({ length: levels }, (_, i) => ({
        level: i + 1,
        chance: successChance(strength, i + 1),
        empty: levelEmptyUntil(world, place.id, i + 1) !== undefined,
      })),
      eta: route ? formatDuration(i18n.t, route.duration / world.state.clock.speed) : undefined,
    };
  });

  function toggle(id: number): void {
    if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
    else if (chosen.length < MAX_SQUAD) chosen = [...chosen, id];
  }
</script>

{#if view}
  <div class="expedition">
    <h3>{i18n.t("dungeon.title")} · {place.name}</h3>
    <p class="muted">{i18n.t("dungeon.squad", { max: MAX_SQUAD })}</p>
    <ul class="squad">
      {#each view.free as c (c.id)}
        <li>
          <label>
            <input
              type="checkbox"
              checked={chosen.includes(c.id)}
              disabled={!chosen.includes(c.id) && chosen.length >= MAX_SQUAD}
              onchange={() => toggle(c.id)}
            />
            <Token name="char_{c.ethnicity}" scale={1} />
            <span>{fullName(i18n.t, c)}</span>
            <span class="muted">{i18n.t("stat.vigor")} {c.stats.vigor} · {i18n.t("stat.guts")} {c.stats.guts}</span>
          </label>
        </li>
      {/each}
    </ul>
    <label class="depth">
      <span>{i18n.t("dungeon.depth")}</span>
      <select bind:value={depth}>
        {#each Array.from({ length: view.levels }, (_, i) => i + 1) as l (l)}
          <option value={l}>{l}</option>
        {/each}
      </select>
    </label>
    <ul class="chances">
      {#each view.chances.slice(0, depth) as c (c.level)}
        <li class:empty={c.empty}>
          {c.empty ? i18n.t("dungeon.emptyLevel", { level: c.level }) : i18n.t("dungeon.chance", { level: c.level, chance: c.chance })}
        </li>
      {/each}
    </ul>
    <button
      type="button"
      class="go"
      disabled={view.squad.length === 0 || view.eta === undefined}
      onclick={() => game.expedition(place.id, view!.squad.map((c) => c.id), depth)}
    >
      {i18n.t("dungeon.go", { eta: view.eta ?? "–" })}
    </button>
  </div>
{/if}

<style>
  .expedition {
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
    font-size: 0.8rem;
  }

  .muted {
    color: var(--muted);
    font-size: 0.75rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .squad label {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    font-size: 0.82rem;
  }

  .depth {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
  }

  select {
    min-height: 32px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 8px;
  }

  .chances {
    font-size: 0.8rem;
  }

  .chances .empty {
    color: var(--muted);
  }

  .go {
    min-height: 40px;
    background: var(--accent);
    color: var(--accent-ink);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-weight: 600;
  }

  .go:disabled {
    opacity: 0.5;
  }
</style>
