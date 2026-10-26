<script lang="ts">
  import { onMount } from "svelte";
  import DebugPanel from "./components/DebugPanel.svelte";
  import HexPanel from "./components/HexPanel.svelte";
  import TopBar from "./components/TopBar.svelte";
  import ZoomControls from "./components/ZoomControls.svelte";
  import { game } from "./lib/game.svelte";
  import { MapView } from "./lib/map/MapView";

  let host: HTMLDivElement;
  let view = $state<MapView | undefined>();
  let showDebug = $state(false);

  onMount(() => {
    const mapView = new MapView(host, { onTap: (hex) => game.tap(hex) });
    let alive = true;
    void mapView.init(`${import.meta.env.BASE_URL}assets/tiles.json`).then(() => {
      if (!alive) return;
      view = mapView;
      game.generate();
    });
    return () => {
      alive = false;
      mapView.destroy();
    };
  });

  $effect(() => {
    const { map, fog } = game;
    if (view && map && fog) view.setMap(map, fog);
  });
  $effect(() => {
    void game.fogVersion;
    view?.refreshFog(game.revealFrom);
  });
  $effect(() => {
    view?.setFogEnabled(game.fogEnabled);
  });
  $effect(() => {
    view?.setGridEnabled(game.gridEnabled);
  });
  $effect(() => {
    view?.select(game.selected);
  });
</script>

<div class="map" bind:this={host}></div>

<div class="hud">
  <TopBar bind:showDebug />
  {#if showDebug}
    <DebugPanel />
  {/if}
  <div class="bottom">
    <HexPanel />
    <ZoomControls onZoom={(steps) => view?.zoomBy(steps)} />
  </div>
</div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }

  .hud {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    pointer-events: none;
  }

  .hud :global(> *),
  .bottom :global(> *) {
    pointer-events: auto;
  }

  .bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    pointer-events: none;
  }
</style>
