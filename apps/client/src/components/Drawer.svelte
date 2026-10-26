<script lang="ts">
  import type { Snippet } from "svelte";
  import { i18n } from "../lib/i18n.svelte";

  /** Un pannello aperto dal menu a sinistra, con titolo e chiusura. */
  let { title, onClose, children }: { title: string; onClose: () => void; children: Snippet } = $props();
</script>

<aside class="drawer" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <button type="button" class="close" onclick={onClose}>
      <span aria-hidden="true">✕</span>
      <span class="visually-hidden">{i18n.t("action.close")}</span>
    </button>
  </header>
  <div class="content">
    {@render children()}
  </div>
</aside>

<style>
  .drawer {
    width: min(340px, calc(100vw - 96px));
    max-height: 100%;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 6px 12px;
    border-bottom: 1px solid var(--panel-border);
  }

  h2 {
    flex: 1;
    margin: 0;
    font-size: 1rem;
  }

  .content {
    overflow-y: auto;
    padding: 8px 12px 12px;
  }

  .close {
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* Su schermi stretti il pannello copre la mappa invece di spingere il resto. */
  @media (max-width: 720px) {
    .drawer {
      position: absolute;
      left: calc(max(8px, env(safe-area-inset-left)) + 72px);
      top: max(8px, env(safe-area-inset-top));
      max-height: calc(100% - 16px);
      z-index: 2;
    }
  }
</style>
