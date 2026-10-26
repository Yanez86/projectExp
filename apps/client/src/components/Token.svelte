<script lang="ts">
  import { loadSheet, type SheetInfo } from "../lib/sheet";

  /** Un riquadro dello sprite sheet mostrato in HTML, ingrandito senza sfocare. */
  let { name, scale = 2 }: { name: string; scale?: number } = $props();

  let sheet = $state<SheetInfo | undefined>();
  void loadSheet().then((s) => (sheet = s));
  let frame = $derived(sheet?.frames[name]);
</script>

{#if sheet && frame}
  <span
    class="token"
    aria-hidden="true"
    style:width="{frame.w * scale}px"
    style:height="{frame.h * scale}px"
    style:background-image="url({sheet.image})"
    style:background-position="-{frame.x * scale}px -{frame.y * scale}px"
    style:background-size="{sheet.width * scale}px {sheet.height * scale}px"
  ></span>
{/if}

<style>
  .token {
    display: inline-block;
    flex: none;
    background-repeat: no-repeat;
    image-rendering: pixelated;
  }
</style>
