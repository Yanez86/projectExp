<script lang="ts">
  import { onMount } from "svelte";
  import { gameTimeAt, previewRoute } from "@exp/core";
  import ContextPanel from "./components/ContextPanel.svelte";
  import DebugPanel from "./components/DebugPanel.svelte";
  import GuildPanel from "./components/GuildPanel.svelte";
  import Roster from "./components/Roster.svelte";
  import Toasts from "./components/Toasts.svelte";
  import TopBar from "./components/TopBar.svelte";
  import ZoomControls from "./components/ZoomControls.svelte";
  import { game } from "./lib/game.svelte";
  import { MapView } from "./lib/map/MapView";
  import { daylight } from "./lib/map/daylight";
  import { i18n } from "./lib/i18n.svelte";
  import { SHEET_DATA, SHEET_IMAGE } from "./lib/sheet";
  import type { SpritesheetData } from "pixi.js";

  /** Ogni quanto il gioco porta il mondo all'ora attuale. */
  const TICK_MS = 250;

  let host: HTMLDivElement;
  let view = $state<MapView | undefined>();
  let showDebug = $state(false);
  /** Se il gioco non riesce a partire, il motivo: meglio un messaggio che uno schermo vuoto. */
  let startError = $state<string | undefined>();

  onMount(() => {
    const mapView = new MapView(host, { onTap: (hex) => game.tapHex(hex) });
    let alive = true;
    mapView
      .init(SHEET_DATA as unknown as SpritesheetData, SHEET_IMAGE)
      .then(async () => {
        if (!alive) return;
        await game.start();
        view = mapView;
      })
      .catch((error: unknown) => {
        console.error(error);
        startError = error instanceof Error ? error.message : String(error);
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
    view?.refreshOutposts();
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
      {#if game.showGuild}
        <GuildPanel />
      {:else}
        <ContextPanel />
      {/if}
    </div>
    <ZoomControls onZoom={(steps) => view?.zoomBy(steps)} />
  </div>
</div>
<Toasts />
{#if startError}
  <div class="error" role="alert">
    <h2>{i18n.t("error.title")}</h2>
    <p>{startError}</p>
    <button type="button" onclick={() => location.reload()}>{i18n.t("error.reload")}</button>
  </div>
{/if}

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

  .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(360px, calc(100vw - 32px));
    background: var(--panel);
    border: 1px solid #ff9a8a;
    border-radius: var(--radius);
    padding: 14px 16px;
  }

  .error h2 {
    margin: 0 0 6px;
    font-size: 1rem;
  }

  .error p {
    margin: 0 0 10px;
    color: var(--muted);
    font-size: 0.85rem;
    word-break: break-word;
  }

  .error button {
    min-height: 40px;
    padding: 0 14px;
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
  }
</style>
