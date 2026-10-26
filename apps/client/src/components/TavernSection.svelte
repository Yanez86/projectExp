<script lang="ts">
  import { STAT_IDS, nextTavernChange, realDelay, tavernCandidates, type Place } from "@exp/core";
  import { formatDuration } from "../lib/format";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { fullName } from "../lib/names";
  import StorySection from "./StorySection.svelte";
  import Token from "./Token.svelte";

  /** La locanda di una cittadina: chi c'è da ingaggiare, quanto costa e quanto chiede di paga. */
  let { place }: { place: Place } = $props();

  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    return {
      gold: world.state.guild.gold,
      candidates: tavernCandidates(world, place),
      changes: formatDuration(i18n.t, realDelay(world.state.clock, nextTavernChange(world.state.time), game.now)),
    };
  });
</script>

{#if view}
  <div class="tavern">
    <h3>{i18n.t("tavern.title")} <span class="muted">· {i18n.t("tavern.changes", { eta: view.changes })}</span></h3>
    {#each view.candidates as cand (cand.slot)}
      {@const c = cand.character}
      <div class="candidate">
        <header>
          <Token name="char_{c.ethnicity}" />
          <div class="who">
            <strong>{fullName(i18n.t, c)}</strong>
            <span class="muted">
              {i18n.t(`job.${c.job}`, { gender: c.gender })} · {i18n.t(`ethnicity.${c.ethnicity}`, { gender: c.gender })}
            </span>
          </div>
        </header>
        <dl class="stats">
          {#each STAT_IDS as stat (stat)}
            <div><dt>{i18n.t(`stat.${stat}`)}</dt><dd>{c.stats[stat]}</dd></div>
          {/each}
        </dl>
        <StorySection character={c} />
        <div class="deal">
          <span class="muted">{i18n.t("wage.label", { gold: i18n.t("gold", { n: cand.wage }) })}</span>
          <button type="button" class="primary" disabled={view.gold < cand.cost} onclick={() => game.hire(place.id, cand.slot)}>
            {i18n.t("tavern.hire", { cost: i18n.t("gold", { n: cand.cost }) })}
          </button>
        </div>
      </div>
    {:else}
      <p class="muted">{i18n.t("tavern.empty")}</p>
    {/each}
  </div>
{/if}

<style>
  .tavern {
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

  h3 .muted {
    font-weight: normal;
    font-size: 0.75rem;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
  }

  .muted {
    color: var(--muted);
  }

  .candidate {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .who {
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
  }

  .who .muted {
    font-size: 0.78rem;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    margin: 0;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .stats div {
    display: flex;
    gap: 3px;
  }

  dd {
    margin: 0;
    color: var(--text);
    font-weight: 600;
  }

  .deal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.8rem;
  }

  button {
    min-height: 34px;
    padding: 0 10px;
    border-radius: var(--radius);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  button:disabled {
    opacity: 0.5;
  }
</style>
