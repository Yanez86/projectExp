<script lang="ts">
  import { onMount } from "svelte";
  import { gameTimeAt, previewRoute } from "@exp/core";
  import ContextPanel from "./components/ContextPanel.svelte";
  import DebugPanel from "./components/DebugPanel.svelte";
  import Roster from "./components/Roster.svelte";
  import Toasts from "./components/Toasts.svelte";
  import TopBar from "./components/TopBar.svelte";
  import ZoomControls from "./components/ZoomControls.svelte";
  import { game } from "./lib/game.svelte";
  import { MapView } from "./lib/map/MapView";
  import { daylight } from "./lib/map/daylight";
  import { SHEET_URL } from "./lib/sheet";

  /** Ogni quanto il gioco porta il mondo all'ora attuale. */
  const TICK_MS = 250;

  let host: HTMLDivElement;
  let view = $state<MapView | undefined>();
  let showDebug = $state(false);

  onMount(() => {
    const mapView = new MapView(host, { onTap: (hex) => game.tapHex(hex) });
    let alive = true;
    void mapView.init(SHEET_URL).then(async () => {
      if (!alive) return;
      await game.start();
      view = mapView;
    });
    const timer = setInterval(() => game.tick(), TICK_MS);
    const onVisibility = () => (document.hidden ? game.saveNow() : game.tick());
    const onPageHide = () => game.saveNow();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      mapView.destroy();
    };
  });

  // Un mondo nuovo (o caricato): si ridisegna tutto.
  $effect(() => {
    const world = game.world;
    if (!view || !world) return;
    view.setMap(world.map, world.state.fog);
    view.setWorld(world);
  });
  // Il mondo è cambiato: nuvole e personaggi si aggiornano.
  $effect(() => {
    void game.version;
    view?.refreshFog(game.revealFrom);
    view?.refreshCharacters();
  });
  $effect(() => {
    view?.setFogEnabled(game.fogEnabled);
  });
  $effect(() => {
    view?.setGridEnabled(game.gridEnabled);
  });
  $effect(() => {
    view?.setAmbienceEnabled(game.ambienceEnabled);
  });
  // La luce segue l'ora del mondo.
  $effect(() => {
    const world = game.world;
    if (!view || !world) return;
    if (!game.dayNightEnabled) {
      view.setDaylight(0xffffff, 0);
      return;
    }
    const light = daylight(gameTimeAt(world.state.clock, game.now));
    view.setDaylight(light.tint, light.glow);
  });
  $effect(() => {
    view?.select(game.selectedHex);
  });
  $effect(() => {
    view?.setSelectedCharacter(game.selectedId);
  });
  // Il percorso del personaggio selezionato, o quello che farebbe verso la casella selezionata.
  $effect(() => {
    void game.version;
    const world = game.world;
    const character = world?.state.characters.find((c) => c.id === game.selectedId);
    if (!view || !world || !character) {
      view?.setRoute([], undefined, false);
      return;
    }
    if (game.selectedHex) {
      const preview = previewRoute(world, character, game.selectedHex);
      view.setRoute(preview?.route ?? [], preview ? game.selectedHex : undefined, true);
    } else if (character.destination) {
      const ahead = character.step ? [character.step.to, ...character.route] : character.route;
      view.setRoute(ahead, character.destination, false);
    } else {
      view.setRoute([], undefined, false);
    }
  });
</script>

<div class="map" bind:this={host}></div>

<div class="hud">
  <TopBar bind:showDebug />
  {#if showDebug}
    <DebugPanel />
  {/if}
  <div class="bottom">
    <div class="left">
      <Roster />
      <ContextPanel />
    </div>
    <ZoomControls onZoom={(steps) => view?.zoomBy(steps)} />
  </div>
</div>
<Toasts />

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
  .bottom :global(> *),
  .left :global(> *) {
    pointer-events: auto;
  }

  .bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    pointer-events: none;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
  }
</style>
