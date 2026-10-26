<script lang="ts">
  import { EVENTS, MANIAS, PAST_JOBS, type Character, type StatEffects } from "@exp/core";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";

  /** La storia di un personaggio, capitolo per capitolo, con quello che gli ha dato. */
  let { character }: { character: Pick<Character, "story" | "gender"> } = $props();

  function effects(e: StatEffects): string {
    return Object.entries(e)
      .filter(([, n]) => n !== 0)
      .map(([stat, n]) => `${n > 0 ? "+" : "−"}${Math.abs(n)} ${i18n.t(`stat.${stat}`)}`)
      .join(", ");
  }

  let chapters = $derived.by(() => {
    const { story, gender } = character;
    const g = { gender };
    const places = game.world?.map.places ?? [];
    return [
      { text: i18n.t(`story.origin.${story.origin}`, g), note: i18n.t("story.originNote", { biome: i18n.t(`biome.${story.origin}`) }) },
      { text: i18n.t(`story.pastJob.${story.pastJob}`, g), note: effects(PAST_JOBS[story.pastJob] ?? {}) },
      {
        text: i18n.t(`story.event.${story.event}`, g),
        note: [i18n.t("story.trait", { trait: i18n.t(`story.trait.${story.event}`, g) }), effects(EVENTS[story.event] ?? {})]
          .filter(Boolean)
          .join(" · "),
      },
      { text: i18n.t(`story.mania.${story.mania}`, g), note: effects(MANIAS[story.mania] ?? {}) },
      ...story.more.map((ch) => ({
        text: i18n.t("story.scar", { ...g, place: places.find((p) => p.id === ch.placeId)?.name ?? "" }),
        note: effects({ [ch.stat]: 1 }),
      })),
    ];
  });
</script>

<details class="story">
  <summary>{i18n.t("story.title")}</summary>
  <ol>
    {#each chapters as ch, i (i)}
      <li>
        {ch.text}
        {#if ch.note}<span class="note">{ch.note}</span>{/if}
      </li>
    {/each}
  </ol>
</details>

<style>
  .story {
    font-size: 0.82rem;
  }

  summary {
    cursor: pointer;
    color: var(--accent);
    font-size: 0.85rem;
  }

  ol {
    margin: 4px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    line-height: 1.35;
  }

  .note {
    display: block;
    color: var(--muted);
    font-size: 0.76rem;
  }
</style>
