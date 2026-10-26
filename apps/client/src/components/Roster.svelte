<script lang="ts">
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import Token from "./Token.svelte";

  let characters = $derived.by(() => {
    void game.version;
    return (game.world?.state.characters ?? []).map((c) => ({ ...c }));
  });
</script>

<nav class="roster" aria-label={i18n.t("roster.label")}>
  {#each characters as c (c.id)}
    <button
      type="button"
      class:selected={c.id === game.selectedId}
      aria-pressed={c.id === game.selectedId}
      onclick={() => game.selectCharacter(c.id)}
    >
      <Token name="char_{c.ethnicity}" />
      <span class="name">{c.name}</span>
      {#if c.step}<span class="moving" aria-hidden="true">›</span>{/if}
    </button>
  {/each}
</nav>

<style>
  .roster {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  button {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 2px 10px 2px 6px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  button.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent) inset;
  }

  .name {
    font-size: 0.9rem;
  }

  .moving {
    color: var(--accent);
    font-weight: bold;
  }
</style>
