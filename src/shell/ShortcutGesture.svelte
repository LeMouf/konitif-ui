<script lang="ts">
  import WorkbenchIcon from '../icons/WorkbenchIcon.svelte';

  export let shortcutKey: string;
  export let compact = false;

  type ShortcutGesturePart =
    | {
        kind: 'keycap';
        label: string;
      }
    | {
        kind: 'mouse';
        variant: 'click' | 'right-click' | 'double-click' | 'drag' | 'wheel';
      }
    | {
        kind: 'tag';
        label: string;
      };

  type ShortcutGestureGroup = {
    parts: ShortcutGesturePart[];
  };

  const KEYCAP_LABELS = new Map<string, string>([
    ['alt', '⌥'],
    ['shift', '⇧'],
    ['ctrl', 'Ctrl'],
    ['cmd', '⌘'],
    ['ctrl/cmd', '⌃⌘'],
    ['esc', 'Esc'],
    ['escape', 'Esc'],
    ['enter', '↵'],
    ['delete', '⌫'],
    ['backspace', '⌫'],
    ['space', '␣'],
    ['home / end', 'Home/End'],
    [', / .', ',/.'],
    ['← / →', '←→']
  ]);

  let groups: ShortcutGestureGroup[] = [];

  $: groups = resolveShortcutGestureGroups(shortcutKey);

  function resolveShortcutGestureGroups(value: string): ShortcutGestureGroup[] {
    return value
      .split(/\s*\+\s*/g)
      .map((segment) => resolveShortcutGestureGroup(segment.trim()))
      .filter((group) => group.parts.length > 0);
  }

  function resolveShortcutGestureGroup(segment: string): ShortcutGestureGroup {
    const normalized = segment.trim();
    const lower = normalized.toLowerCase();
    const exactKeycap = KEYCAP_LABELS.get(lower);

    if (exactKeycap) {
      return {
        parts: [{ kind: 'keycap', label: exactKeycap }]
      };
    }

    if (/^[a-z0-9]$/i.test(normalized)) {
      return {
        parts: [{ kind: 'keycap', label: normalized.toUpperCase() }]
      };
    }

    const mousePattern =
      resolveMousePattern(normalized, 'right-click', /^right click\b/i) ??
      resolveMousePattern(normalized, 'double-click', /^double click\b/i) ??
      resolveMousePattern(normalized, 'click', /^click\b/i) ??
      resolveMousePattern(normalized, 'drag', /^drag\b/i) ??
      resolveMousePattern(normalized, 'wheel', /^wheel\b/i);

    if (mousePattern) {
      return mousePattern;
    }

    return {
      parts: [{ kind: 'keycap', label: normalized }]
    };
  }

  function resolveMousePattern(
    segment: string,
    variant: Extract<ShortcutGesturePart, { kind: 'mouse' }>['variant'],
    pattern: RegExp
  ): ShortcutGestureGroup | null {
    if (!pattern.test(segment)) {
      return null;
    }

    const remainder = segment.replace(pattern, '').trim();
    return {
      parts: [
        { kind: 'mouse', variant },
        ...(remainder ? [{ kind: 'tag' as const, label: remainder }] : [])
      ]
    };
  }
</script>

<span class:shortcut-gesture--compact={compact} class="shortcut-gesture" aria-label={shortcutKey} title={shortcutKey}>
  {#each groups as group, groupIndex}
    {#if groupIndex > 0}
      <span class="shortcut-gesture__join" aria-hidden="true">+</span>
    {/if}

    <span class="shortcut-gesture__group">
      {#each group.parts as part}
        {#if part.kind === 'keycap'}
          <kbd class="shortcut-gesture__keycap">{part.label}</kbd>
        {:else if part.kind === 'mouse'}
          <span class:shortcut-gesture__mouse--click={part.variant === 'click'} class:shortcut-gesture__mouse--right-click={part.variant === 'right-click'} class:shortcut-gesture__mouse--double-click={part.variant === 'double-click'} class:shortcut-gesture__mouse--drag={part.variant === 'drag'} class:shortcut-gesture__mouse--wheel={part.variant === 'wheel'} class="shortcut-gesture__mouse" aria-hidden="true">
            <WorkbenchIcon icon="action.mouse" label="Mouse shortcut" className="shortcut-gesture__mouse-svg" />
          </span>
        {:else}
          <span class="shortcut-gesture__tag">{part.label}</span>
        {/if}
      {/each}
    </span>
  {/each}
</span>

<style>
  .shortcut-gesture {
    --shortcut-gesture-surface: color-mix(in srgb, var(--color-background-muted) 84%, rgba(11, 15, 19, 0.94));
    --shortcut-gesture-surface-hover: color-mix(in srgb, var(--color-background-hover) 58%, rgba(255, 255, 255, 0.04));
    --shortcut-gesture-border: color-mix(in srgb, var(--color-border-subtle) 86%, rgba(255, 255, 255, 0.08));
    --shortcut-gesture-emboss: color-mix(in srgb, white 12%, transparent);
    --shortcut-gesture-shadow: color-mix(in srgb, black 22%, transparent);
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
    color: inherit;
  }

  .shortcut-gesture--compact {
    gap: var(--space-3);
  }

  .shortcut-gesture__join {
    color: var(--color-text-muted);
    font-size: 0.625rem;
    line-height: 1;
  }

  .shortcut-gesture__group {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .shortcut-gesture__keycap,
  .shortcut-gesture__tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.125rem;
    padding: 0 var(--space-4);
    border-radius: var(--radius-small);
    line-height: 1;
    white-space: nowrap;
  }

  .shortcut-gesture__keycap {
    min-width: 1.15rem;
    border: 1px solid var(--shortcut-gesture-border);
    background: linear-gradient(180deg, var(--shortcut-gesture-emboss), transparent), var(--shortcut-gesture-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: 0.6875rem;
    letter-spacing: 0.01em;
    box-shadow:
      inset 0 1px 0 var(--shortcut-gesture-emboss),
      0 1px 0 var(--shortcut-gesture-shadow);
  }

  .shortcut-gesture__tag {
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 62%, transparent);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent), var(--shortcut-gesture-surface-hover);
    color: color-mix(in srgb, var(--color-text-secondary) 84%, white);
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .shortcut-gesture__mouse {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.22rem;
    height: 1.28rem;
    padding: 0.06rem;
    border-radius: 0.38rem;
    border: 1px solid var(--shortcut-gesture-border);
    background: linear-gradient(180deg, var(--shortcut-gesture-emboss), transparent), var(--shortcut-gesture-surface);
    box-shadow:
      inset 0 1px 0 var(--shortcut-gesture-emboss),
      0 1px 0 var(--shortcut-gesture-shadow);
    color: color-mix(in srgb, var(--color-text-secondary) 88%, white);
    flex: 0 0 auto;
  }

  :global(.shortcut-gesture__mouse-svg) {
    width: 1em;
    height: 1em;
    font-size: 1rem;
  }

  .shortcut-gesture--compact .shortcut-gesture__keycap,
  .shortcut-gesture--compact .shortcut-gesture__tag {
    min-height: 1rem;
    padding-inline: var(--space-4);
    font-size: 0.625rem;
  }

  .shortcut-gesture--compact .shortcut-gesture__mouse {
    width: 1.14rem;
    height: 1.2rem;
  }
</style>
