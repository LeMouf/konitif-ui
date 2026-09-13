<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';
  import type { ControlDockItem, ControlDockMenuItem, ControlDockOrientation, ControlDockPlacement } from './controlDock';

  export let ariaLabel = 'Control dock';
  export let className = '';
  export let items: ControlDockItem[] = [];
  export let orientation: ControlDockOrientation = 'vertical';
  export let placement: ControlDockPlacement = 'right';

  const dispatch = createEventDispatcher<{
    toggle: { item: ControlDockItem };
    menuAction: { item: ControlDockItem; menuItem: ControlDockMenuItem };
  }>();

  let openItemId: string | null = null;
  let closeMenuTimeout: ReturnType<typeof setTimeout> | null = null;

  $: rootClass = [
    'control-dock',
    `control-dock--${orientation}`,
    `control-dock--placement-${placement}`,
    className
  ]
    .filter(Boolean)
    .join(' ');

  function hasGroupBoundary(item: ControlDockItem, index: number): boolean {
    return index > 0 && items[index - 1]?.group !== item.group;
  }

  function openItemMenu(item: ControlDockItem): void {
    if (!item.menuItems?.length || item.disabled) {
      return;
    }

    cancelCloseItemMenu();
    openItemId = item.id;
  }

  function cancelCloseItemMenu(): void {
    if (closeMenuTimeout) {
      clearTimeout(closeMenuTimeout);
      closeMenuTimeout = null;
    }
  }

  function scheduleCloseItemMenu(item: ControlDockItem): void {
    cancelCloseItemMenu();

    closeMenuTimeout = setTimeout(() => {
      if (openItemId === item.id) {
        openItemId = null;
      }

      closeMenuTimeout = null;
    }, 140);
  }

  function closeItemMenu(item: ControlDockItem): void {
    if (openItemId !== item.id) {
      return;
    }

    scheduleCloseItemMenu(item);
  }

  function toggleItem(item: ControlDockItem): void {
    if (item.disabled) {
      return;
    }

    if (item.menuOnly) {
      openItemMenu(item);
      return;
    }
    dispatch('toggle', { item });
  }

  function runMenuAction(item: ControlDockItem, menuItem: ControlDockMenuItem): void {
    if (item.disabled || menuItem.disabled) {
      return;
    }

    dispatch('menuAction', { item, menuItem });
  }

  onDestroy(cancelCloseItemMenu);
</script>

<svelte:window on:keydown={(event) => {
  if (event.key === 'Escape') { openItemId = null; cancelCloseItemMenu(); }
}} />
<nav class={rootClass} aria-label={ariaLabel}>
  {#each items as item, index (item.id)}
    {#if hasGroupBoundary(item, index)}
      <span class="control-dock__separator" aria-hidden="true"></span>
    {/if}

    <span
      class="control-dock__item-shell"
      on:pointerenter={() => openItemMenu(item)}
      on:pointerleave={() => closeItemMenu(item)}
      on:focusin={() => openItemMenu(item)}
      on:focusout={() => closeItemMenu(item)}
    >
      <button
        type="button"
        class:control-dock__button--active={item.active}
        class:control-dock__button--menu-open={openItemId === item.id}
        class:control-dock__button--with-menu={!!item.menuItems?.length}
        class="control-dock__button"
        aria-label={item.label}
        aria-pressed={item.menuOnly ? undefined : item.active}
        aria-haspopup={item.menuItems?.length ? 'menu' : undefined}
        aria-expanded={item.menuItems?.length ? openItemId === item.id : undefined}
        disabled={item.disabled}
        data-tooltip={item.title ?? item.label}
        data-control-dock-item={item.id}
        on:click={() => toggleItem(item)}
      >
        <WorkbenchIcon icon={item.icon} label={item.label} />
      </button>

      {#if item.menuItems?.length && openItemId === item.id}
        <div class="control-dock__menu" role="menu" aria-label={item.menuLabel ?? item.label}>
          {#each item.menuItems as menuItem (menuItem.id)}
            <button
              type="button"
              class:control-dock__menu-item--active={menuItem.active}
              class="control-dock__menu-item"
              disabled={menuItem.disabled}
              role="menuitemcheckbox"
              aria-checked={menuItem.active}
              on:click={() => runMenuAction(item, menuItem)}
            >
              {#if menuItem.icon}
                <WorkbenchIcon icon={menuItem.icon} label="" />
              {/if}
              <span>{menuItem.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </span>
  {/each}
</nav>

<style>
  .control-dock {
    --control-dock-size: 2rem;
    --control-dock-gap: 0.25rem;
    --control-dock-pad: 0.3rem;
    display: grid;
    gap: var(--control-dock-gap);
    padding: var(--control-dock-pad);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 64%, transparent);
    border-radius: var(--radius-sm);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-background-panel) 94%, transparent),
        color-mix(in srgb, var(--color-background-canvas) 92%, transparent)
      ),
      color-mix(in srgb, var(--color-background-canvas) 90%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-text-primary) 4%, transparent),
      0 10px 24px color-mix(in srgb, var(--color-background-canvas) 68%, transparent);
  }

  .control-dock--vertical {
    width: calc(var(--control-dock-size) + var(--control-dock-pad) * 2);
    grid-auto-flow: row;
  }

  .control-dock--horizontal {
    grid-auto-flow: column;
    width: max-content;
  }

  .control-dock__item-shell {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 0;
  }

  .control-dock__button {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: var(--control-dock-size);
    height: var(--control-dock-size);
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 72%, transparent);
    border-radius: 0.24rem;
    background: color-mix(in srgb, var(--color-background-surface) 58%, transparent);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      background 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
  }

  .control-dock__button :global(.workbench-icon) {
    width: 1rem;
    height: 1rem;
  }

  .control-dock__button:hover,
  .control-dock__button:focus-visible {
    border-color: color-mix(in srgb, var(--color-accent-primary) 78%, transparent);
    color: var(--color-text-primary);
    outline: none;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 24%, transparent);
  }

  .control-dock__button:not(.control-dock__button--menu-open)::before {
    position: absolute;
    z-index: 16;
    display: none;
    box-sizing: border-box;
    width: max-content;
    max-width: min(16rem, 46vw);
    padding: 0.45rem 0.65rem;
    overflow: visible;
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 68%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-background-panel) 97%, transparent);
    box-shadow: 0 10px 24px color-mix(in srgb, black 40%, transparent);
    color: var(--color-text-secondary);
    content: attr(data-tooltip);
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.2;
    pointer-events: none;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .control-dock__button:not(.control-dock__button--menu-open):hover::before,
  .control-dock__button:not(.control-dock__button--menu-open):focus-visible::before {
    display: block;
  }

  .control-dock--placement-right .control-dock__button:not(.control-dock__button--menu-open)::before {
    top: 50%;
    right: calc(100% + 0.55rem);
    transform: translateY(-50%);
  }

  .control-dock--placement-left .control-dock__button:not(.control-dock__button--menu-open)::before {
    top: 50%;
    left: calc(100% + 0.55rem);
    transform: translateY(-50%);
  }

  .control-dock--placement-top .control-dock__button:not(.control-dock__button--menu-open)::before {
    top: calc(100% + 0.55rem);
    left: 50%;
    transform: translateX(-50%);
  }

  .control-dock--placement-bottom .control-dock__button:not(.control-dock__button--menu-open)::before {
    bottom: calc(100% + 0.55rem);
    left: 50%;
    transform: translateX(-50%);
  }

  .control-dock__button--active {
    border-color: color-mix(in srgb, var(--color-accent-primary) 84%, transparent);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-accent-primary) 24%, transparent),
        color-mix(in srgb, var(--color-accent-primary) 12%, transparent)
      ),
      color-mix(in srgb, var(--color-background-surface) 84%, transparent);
    color: var(--color-accent-primary);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 18%, transparent),
      0 0 14px color-mix(in srgb, var(--color-accent-primary) 10%, transparent);
  }

  .control-dock__button--menu-open {
    z-index: 14;
    overflow: visible;
    border-color: color-mix(in srgb, var(--color-accent-primary) 88%, transparent);
    color: var(--color-text-primary);
  }

  .control-dock__button--with-menu::after {
    position: absolute;
    right: 0.16rem;
    bottom: 0.16rem;
    width: 0.28rem;
    height: 0.28rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent-primary) 76%, transparent);
    content: '';
    opacity: 0.74;
  }

  .control-dock__button--menu-open::before {
    position: absolute;
    z-index: 12;
    width: 0;
    height: 0;
    content: '';
    pointer-events: none;
    filter:
      drop-shadow(0 0 6px color-mix(in srgb, var(--color-accent-primary) 34%, transparent))
      drop-shadow(0 0 1px color-mix(in srgb, var(--color-background-canvas) 78%, transparent));
  }

  .control-dock--placement-right .control-dock__button--menu-open::before {
    top: 50%;
    left: -0.68rem;
    border-top: 0.42rem solid transparent;
    border-bottom: 0.42rem solid transparent;
    border-right: 0.52rem solid color-mix(in srgb, var(--color-accent-primary) 86%, var(--color-border-strong));
    transform: translateY(-50%);
  }

  .control-dock--placement-left .control-dock__button--menu-open::before {
    top: 50%;
    right: -0.68rem;
    border-top: 0.42rem solid transparent;
    border-bottom: 0.42rem solid transparent;
    border-left: 0.52rem solid color-mix(in srgb, var(--color-accent-primary) 86%, var(--color-border-strong));
    transform: translateY(-50%);
  }

  .control-dock--placement-top .control-dock__button--menu-open::before {
    bottom: -0.68rem;
    left: 50%;
    border-left: 0.42rem solid transparent;
    border-right: 0.42rem solid transparent;
    border-top: 0.52rem solid color-mix(in srgb, var(--color-accent-primary) 86%, var(--color-border-strong));
    transform: translateX(-50%);
  }

  .control-dock--placement-bottom .control-dock__button--menu-open::before {
    top: -0.68rem;
    left: 50%;
    border-left: 0.42rem solid transparent;
    border-right: 0.42rem solid transparent;
    border-bottom: 0.52rem solid color-mix(in srgb, var(--color-accent-primary) 86%, var(--color-border-strong));
    transform: translateX(-50%);
  }

  .control-dock__button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  .control-dock__separator {
    display: block;
    background: color-mix(in srgb, var(--color-border-subtle) 70%, transparent);
  }

  .control-dock--vertical .control-dock__separator {
    width: 100%;
    height: 1px;
    margin: 0.15rem 0;
  }

  .control-dock--horizontal .control-dock__separator {
    width: 1px;
    height: 100%;
    margin: 0 0.15rem;
  }

  .control-dock__menu {
    position: absolute;
    z-index: 10;
    display: grid;
    gap: 0.25rem;
    min-width: 13.5rem;
    max-width: min(19rem, 72vw);
    padding: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 64%, transparent);
    border-radius: var(--radius-sm);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-background-panel) 96%, transparent),
        color-mix(in srgb, var(--color-background-canvas) 94%, transparent)
      ),
      var(--color-background-canvas);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--color-text-primary) 4%, transparent),
      0 16px 32px color-mix(in srgb, black 46%, transparent);
  }

  .control-dock__menu::before {
    position: absolute;
    content: '';
  }

  .control-dock--placement-right .control-dock__menu {
    top: 50%;
    right: calc(100% + 0.55rem);
    transform: translateY(-50%);
  }

  .control-dock--placement-right .control-dock__menu::before {
    top: -0.2rem;
    right: -0.75rem;
    width: 0.85rem;
    height: calc(100% + 0.4rem);
  }

  .control-dock--placement-left .control-dock__menu {
    top: 50%;
    left: calc(100% + 0.55rem);
    transform: translateY(-50%);
  }

  .control-dock--placement-left .control-dock__menu::before {
    top: -0.2rem;
    left: -0.75rem;
    width: 0.85rem;
    height: calc(100% + 0.4rem);
  }

  .control-dock--placement-top .control-dock__menu {
    top: calc(100% + 0.55rem);
    left: 50%;
    transform: translateX(-50%);
  }

  .control-dock--placement-top .control-dock__menu::before {
    top: -0.75rem;
    left: -0.2rem;
    width: calc(100% + 0.4rem);
    height: 0.85rem;
  }

  .control-dock--placement-bottom .control-dock__menu {
    bottom: calc(100% + 0.55rem);
    left: 50%;
    transform: translateX(-50%);
  }

  .control-dock--placement-bottom .control-dock__menu::before {
    bottom: -0.75rem;
    left: -0.2rem;
    width: calc(100% + 0.4rem);
    height: 0.85rem;
  }

  .control-dock__menu-item {
    display: grid;
    grid-template-columns: 1rem max-content;
    align-items: center;
    gap: 0.45rem;
    min-height: 1.85rem;
    padding: 0 0.55rem;
    border: 1px solid transparent;
    border-radius: 0.24rem;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }

  .control-dock__menu-item span {
    overflow: visible;
    text-overflow: clip;
    white-space: nowrap;
  }

  .control-dock__menu-item :global(.workbench-icon) {
    width: 0.92rem;
    height: 0.92rem;
  }

  .control-dock__menu-item:hover,
  .control-dock__menu-item:focus-visible,
  .control-dock__menu-item--active {
    border-color: color-mix(in srgb, var(--color-accent-primary) 54%, transparent);
    background: color-mix(in srgb, var(--color-accent-primary) 12%, var(--color-background-surface));
    color: var(--color-text-primary);
    outline: none;
  }

  .control-dock__menu-item:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
</style>
