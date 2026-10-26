<script lang="ts">
  import { MAP_SIZES, game, randomSeed, type MapSize } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";

  const sizes = Object.keys(MAP_SIZES) as MapSize[];
</script>

<form
  class="panel"
  onsubmit={(e) => {
    e.preventDefault();
    game.generate();
  }}
>
  <h2>{i18n.t("debug.title")}</h2>
  <label class="row">
    <span>{i18n.t("debug.seed")}</span>
    <input bind:value={game.seed} autocomplete="off" spellcheck="false" />
  </label>
  <label class="row">
    <span>{i18n.t("debug.size")}</span>
    <select bind:value={game.size}>
      {#each sizes as size (size)}
        <option value={size}>{i18n.t(`debug.size.${size}`)}</option>
      {/each}
    </select>
  </label>
  <div class="buttons">
    <button
      type="button"
      onclick={() => {
        game.seed = randomSeed();
        game.generate();
      }}>{i18n.t("debug.random")}</button
    >
    <button type="submit" class="primary">{i18n.t("debug.generate")}</button>
  </div>
  <label class="check">
    <input type="checkbox" bind:checked={game.fogEnabled} />
    {i18n.t("debug.fog")}
  </label>
  <label class="check">
    <input type="checkbox" bind:checked={game.exploreOnTap} disabled={!game.fogEnabled} />
    {i18n.t("debug.exploreOnTap")}
  </label>
  <button type="button" onclick={() => game.resetFog()} disabled={!game.fogEnabled}>
    {i18n.t("debug.resetFog")}
  </button>
</form>

<style>
  .panel {
    align-self: flex-end;
    width: min(260px, calc(100vw - 16px));
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }

  input:not([type]),
  select,
  button {
    min-height: 36px;
    min-width: 0;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 0 8px;
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .primary {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  button:disabled,
  input:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
