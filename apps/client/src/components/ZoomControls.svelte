<script lang="ts">
  import { i18n } from "../lib/i18n.svelte";

  let { onZoom }: { onZoom: (steps: number) => void } = $props();
</script>

<div class="zoom">
  <button type="button" aria-label={i18n.t("zoom.in")} onclick={() => onZoom(1)}>+</button>
  <button type="button" aria-label={i18n.t("zoom.out")} onclick={() => onZoom(-1)}>−</button>
</div>

<style>
  .zoom {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  button {
    width: 44px;
    height: 44px;
    font-size: 1.4rem;
    line-height: 1;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }
</style>
