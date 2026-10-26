<script lang="ts">
  import { ITEMS, atGuildToEquip, slotsFor, type Character, type Slot } from "@exp/core";
  import { game } from "../lib/game.svelte";
  import { i18n } from "../lib/i18n.svelte";
  import { itemBonus } from "../lib/names";
  import Token from "./Token.svelte";

  /** Gli slot di un personaggio; alla sede si cambia con gli oggetti del forziere. */
  let { character }: { character: Character } = $props();

  let open = $state<Slot | undefined>(undefined);

  let view = $derived.by(() => {
    void game.version;
    const world = game.world;
    if (!world) return undefined;
    return {
      canChange: atGuildToEquip(world, character),
      chest: world.state.guild.items.map((i) => ({ ...i })),
    };
  });
</script>

{#if view}
  <div class="equipment">
    <h3>{i18n.t("equipment.title")}</h3>
    {#each slotsFor(character.job) as slot (slot)}
      {@const item = character.equipment[slot]}
      <div class="slot">
        <button
          type="button"
          class="pick"
          class:active={open === slot}
          disabled={!view.canChange}
          onclick={() => (open = open === slot ? undefined : slot)}
        >
          <span class="box rarity-{item?.rarity ?? 0}">
            {#if item}<Token name="item_{item.kind}" scale={2} />{/if}
          </span>
          <span class="text">
            <span class="label">{i18n.t(`slot.${slot}`)}</span>
            {#if item}
              <span>{i18n.t(`item.${item.kind}`)} · {itemBonus(i18n.t, item)}</span>
            {:else}
              <span class="muted">{i18n.t("equipment.empty")}</span>
            {/if}
          </span>
        </button>
      </div>
      {#if open === slot && view.canChange}
        {@const options = view.chest.filter((i) => ITEMS[i.kind].slot === slot)}
        <div class="choices">
          {#each options as option (option.id)}
            <button type="button" class="choice" onclick={() => game.equip(option.id)}>
              <span class="box rarity-{option.rarity}"><Token name="item_{option.kind}" scale={2} /></span>
              <span class="text">
                <span>{i18n.t(`item.${option.kind}`)}</span>
                <span class="muted">{i18n.t(`rarity.${option.rarity}`)} · {itemBonus(i18n.t, option)}</span>
              </span>
            </button>
          {:else}
            <p class="muted">{i18n.t("equipment.none")}</p>
          {/each}
          {#if item}
            <button type="button" class="remove" onclick={() => game.unequip(slot)}>{i18n.t("equipment.remove")}</button>
          {/if}
        </div>
      {/if}
    {/each}
    {#if !view.canChange}<p class="muted small">{i18n.t("equipment.atGuild")}</p>{/if}
  </div>
{/if}

<style>
  .equipment {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h3 {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--accent);
  }

  p {
    margin: 0;
    font-size: 0.8rem;
  }

  .muted {
    color: var(--muted);
  }

  .small {
    font-size: 0.75rem;
  }

  button {
    background: transparent;
    border: 1px solid var(--panel-border);
    border-radius: var(--radius);
    padding: 3px 6px;
    text-align: left;
  }

  button:disabled {
    cursor: default;
    opacity: 1;
  }

  .pick,
  .choice {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pick.active {
    border-color: var(--accent);
  }

  .box {
    width: 30px;
    height: 30px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--panel-border);
    border-radius: 4px;
  }

  .rarity-1 {
    border: 1px solid #b7aecb;
  }

  .rarity-2 {
    border: 1px solid #6fb4ff;
  }

  .rarity-3 {
    border: 1px solid var(--accent);
  }

  .text {
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
    min-width: 0;
  }

  .label {
    font-size: 0.72rem;
    color: var(--muted);
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 12px;
  }

  .remove {
    align-self: flex-start;
    font-size: 0.8rem;
  }
</style>
