<script lang="ts">
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
</script>

<div class="toasts" role="status">
  {#each game.toasts as toast (toast.id)}
    <button type="button" onclick={() => game.dismissToast(toast.id)}>
      {i18n.t(toast.key, {
        ...toast.values,
        ...Object.fromEntries(Object.entries(toast.refs).map(([name, key]) => [name, i18n.t(key)])),
      })}
    </button>
  {/each}
</div>

<style>
  .toasts {
    position: absolute;
    top: max(64px, calc(env(safe-area-inset-top) + 56px));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: min(420px, calc(100vw - 16px));
    pointer-events: none;
  }

  button {
    pointer-events: auto;
    background: var(--panel);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    padding: 8px 14px;
    font-size: 0.9rem;
  }
</style>
