<script lang="ts">
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { fullName } from "../lib/names";
  import { unitStatus } from "../lib/status";
  import Token from "./Token.svelte";

  /** Sotto questa larghezza il pannello copre la mappa: scelta un'unità, si chiude. */
  const NARROW = "(max-width: 720px)";

  let units = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return [];
    return world.state.characters.map((c) => ({ ...c, status: unitStatus(world, c, game.now, i18n.t) }));
  });

  function pick(id: number): void {
    game.selectCharacter(id, true);
    if (window.matchMedia(NARROW).matches) game.drawer = undefined;
  }
</script>

<ul class="units">
  {#each units as u (u.id)}
    <li>
      <button type="button" class:selected={u.id === game.selectedId} aria-pressed={u.id === game.selectedId} onclick={() => pick(u.id)}>
        <Token name="char_{u.ethnicity}" />
        <span class="body">
          <span class="name">{fullName(i18n.t, u)}</span>
          <span class="role">
            {i18n.t(`job.${u.job}`, { gender: u.gender })} · {i18n.t(`ethnicity.${u.ethnicity}`, { gender: u.gender })}
          </span>
          <span class="status"><span class="dot {u.status.activity}" aria-hidden="true"></span>{u.status.text}</span>
        </span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .units {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    text-align: left;
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
  }

  button:hover {
    border-color: var(--muted);
  }

  button.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent) inset;
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name {
    font-weight: 600;
  }

  .role {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--muted);
  }

  .dot.moving {
    background: #6fb4ff;
  }

  .dot.building {
    background: #f4a04c;
  }

  .dot.trading {
    background: #7fd36b;
  }

  .dot.dungeon {
    background: #b48cf0;
  }

  .dot.wounded {
    background: #ff7a6a;
  }
</style>
