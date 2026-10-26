<script lang="ts">
  import { LOCALES, isLocale } from "@exp/core";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";

  let { showDebug = $bindable(false) }: { showDebug?: boolean } = $props();
</script>

<header class="bar">
  <div class="title">
    <h1>{i18n.t("app.title")}</h1>
    {#if game.map}
      <span class="size">
        {i18n.t("map.size", {
          width: game.map.width,
          height: game.map.height,
          count: game.map.width * game.map.height,
        })}
      </span>
    {/if}
  </div>
  <div class="actions">
    <label>
      <span class="visually-hidden">{i18n.t("language.label")}</span>
      <select
        value={i18n.locale}
        onchange={(e) => {
          const value = e.currentTarget.value;
          if (isLocale(value)) i18n.setLocale(value);
        }}
      >
        {#each LOCALES as locale (locale)}
          <option value={locale}>{locale.toUpperCase()}</option>
        {/each}
      </select>
    </label>
    <button
      type="button"
      class:active={showDebug}
      aria-pressed={showDebug}
      title={i18n.t(showDebug ? "debug.hide" : "debug.show")}
      onclick={() => (showDebug = !showDebug)}
    >
      <span aria-hidden="true">⚙</span>
      <span class="visually-hidden">{i18n.t(showDebug ? "debug.hide" : "debug.show")}</span>
    </button>
  </div>
</header>

<style>
  .bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    align-self: stretch;
    pointer-events: none;
  }

  .title,
  .actions {
    pointer-events: auto;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 6px 10px;
  }

  h1 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .size {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .actions {
    display: flex;
    gap: 6px;
    padding: 4px;
  }

  select,
  button {
    min-width: 40px;
    min-height: 36px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 8px;
  }

  button.active {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
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
