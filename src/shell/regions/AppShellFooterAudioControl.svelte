<script lang="ts">
  import WorkbenchIcon from '../../icons/WorkbenchIcon.svelte';
  import { getWorkbenchTranslator } from '../../i18n/workbenchI18n';
  import StereoAudioVuMeter from '../../audio/StereoAudioVuMeter.svelte';

  import type { FooterControlId } from './footerControl';

  type FooterAudioMeter = {
    left: number;
    right: number;
    peakDb: number;
  };

  type FooterAudioChannel = {
    id: string;
    label: string;
    volume: number;
    muted: boolean;
    meter?: FooterAudioMeter;
  };

  type FooterAudioSummary = {
    title: string;
    status: string;
    summary: string;
    meta: string[];
    mediaBlocks?: Array<{
      id: string;
      title: string;
      status: string;
      summary: string;
      meta: string[];
      progress: number | null;
    }>;
  };

  const SILENT_FOOTER_AUDIO_METER: FooterAudioMeter = {
    left: 0,
    right: 0,
    peakDb: -90
  };

  const i18nT = getWorkbenchTranslator();

  export let hoveredFooterControl: FooterControlId | null = null;
  export let audioControlGroupElement: HTMLDivElement | null = null;
  export let audioMenuElement: HTMLDivElement | null = null;
  export let isAudioMenuOpen = false;
  export let audioMuted = false;
  export let footerAudioMasterVolume = 1;
  export let footerAudioMasterMeter: FooterAudioMeter = SILENT_FOOTER_AUDIO_METER;
  export let footerAudioChannels: FooterAudioChannel[] = [];
  export let footerAudioSummary: FooterAudioSummary | null = null;
  export let isAudioMediaBlocksOpen = false;
  export let onToggleAudioMuted: () => void = () => undefined;
  export let onSetAudioMasterVolume: (volume: number) => void = () => undefined;
  export let onSetAudioChannelVolume: (channelId: string, volume: number) => void = () => undefined;
  export let toggleAudioMenu: () => void = () => undefined;
  export let toggleAudioMediaBlocks: () => void = () => undefined;

  function clampAudioRatio(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(1, value));
  }

  function formatAudioPercent(value: number): string {
    return `${Math.round(clampAudioRatio(value) * 100)}%`;
  }

  function readAudioRangeInput(event: Event): number {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null;

    return clampAudioRatio(Number(input?.value ?? 0));
  }

  function resolveFooterAudioMeter(meter: FooterAudioMeter | undefined): FooterAudioMeter {
    if (!meter) {
      return SILENT_FOOTER_AUDIO_METER;
    }

    return {
      left: clampAudioRatio(meter.left),
      right: clampAudioRatio(meter.right),
      peakDb: Number.isFinite(meter.peakDb) ? Math.max(-90, Math.min(6, meter.peakDb)) : -90
    };
  }

  function scaleFooterAudioMeter(meter: FooterAudioMeter | undefined, gain: number): FooterAudioMeter {
    const resolvedMeter = resolveFooterAudioMeter(meter);
    const outputLevel = Math.max(resolvedMeter.left, resolvedMeter.right) * clampAudioRatio(gain);

    return {
      left: clampAudioRatio(resolvedMeter.left * gain),
      right: clampAudioRatio(resolvedMeter.right * gain),
      peakDb: outputLevel <= 0.0001 ? -90 : Math.max(-90, 20 * Math.log10(outputLevel))
    };
  }

  function resolveAudioChannelOutputMeter(channel: FooterAudioChannel): FooterAudioMeter {
    if (audioMuted || channel.muted) {
      return SILENT_FOOTER_AUDIO_METER;
    }

    return scaleFooterAudioMeter(channel.meter, footerAudioMasterVolume);
  }

  function resolveAudioMasterOutputMeter(): FooterAudioMeter {
    return audioMuted ? SILENT_FOOTER_AUDIO_METER : resolveFooterAudioMeter(footerAudioMasterMeter);
  }

  function resolveAudioChannelEffectiveVolume(channel: FooterAudioChannel): number {
    if (audioMuted || channel.muted) {
      return 0;
    }

    return clampAudioRatio(footerAudioMasterVolume) * clampAudioRatio(channel.volume);
  }

  function resolveAudioMediaBlockProgressLabel(progress: number | null): string | null {
    return progress === null ? null : formatAudioPercent(progress);
  }
</script>

<div
  bind:this={audioControlGroupElement}
  role="presentation"
  class:app-shell__footer-control--open={isAudioMenuOpen}
  class:app-shell__footer-audio-group--muted={audioMuted}
  class="app-shell__footer-toggle-group app-shell__footer-audio-group app-shell__footer-control"
  on:mouseenter={() => (hoveredFooterControl = 'audio')}
  on:mouseleave={() => (hoveredFooterControl = null)}
>
  <button
    type="button"
    class:app-shell__footer-audio-toggle--muted={audioMuted}
    class="app-shell__footer-toggle app-shell__footer-toggle--audio-primary"
    aria-pressed={audioMuted}
    aria-label={audioMuted
      ? $i18nT('ui.shell.footer.audio.unmute', { default: 'Unmute audio globally' })
      : $i18nT('ui.shell.footer.audio.mute', { default: 'Mute audio globally' })}
    on:click={onToggleAudioMuted}
  >
    <WorkbenchIcon
      className={`app-shell__footer-audio-state-icon ${
        audioMuted ? 'app-shell__footer-audio-state-icon--muted' : ''
      }`}
      icon={audioMuted ? 'action.audio-muted' : 'action.audio-on'}
      label={audioMuted ? 'Audio muted' : 'Audio enabled'}
    />
  </button>

  <button
    type="button"
    class:app-shell__footer-toggle-menu-button--open={isAudioMenuOpen}
    class="app-shell__footer-toggle-menu-button app-shell__footer-audio-menu-button"
    aria-label={$i18nT('ui.shell.footer.audio.openPanel', { default: 'Open audio panel' })}
    aria-haspopup="menu"
    aria-expanded={isAudioMenuOpen}
    on:click={toggleAudioMenu}
  >
    <WorkbenchIcon
      className="app-shell__footer-control-icon app-shell__footer-control-icon--audio"
      icon="action.audio-meter"
      label="Audio"
    />
  </button>

  {#if isAudioMenuOpen}
    {@const masterMeter = resolveAudioMasterOutputMeter()}
    <div
      bind:this={audioMenuElement}
      class="app-shell__footer-help-menu app-shell__footer-audio-menu"
      role="menu"
      aria-label={$i18nT('ui.shell.footer.audio.panel', { default: 'Audio panel' })}
    >
      <div class="app-shell__footer-help-menu-groups">
        <section class="app-shell__footer-help-menu-section">
          <header class="app-shell__footer-help-menu-section-header">
            <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.footer.audio.global', { default: 'Global' })}</h4>
          </header>
          <div class="app-shell__footer-help-menu-items">
            <article class="app-shell__footer-help-menu-item">
              <div class="app-shell__footer-help-menu-item-head">
                <strong class="app-shell__footer-help-menu-item-title">{$i18nT('ui.shell.footer.audio.masterBus', { default: 'Master Bus' })}</strong>
                <span class="app-shell__footer-help-menu-item-status">
                  {audioMuted
                    ? $i18nT('ui.shell.footer.audio.muted', { default: 'Muted' })
                    : $i18nT('ui.shell.footer.audio.live', { default: 'Live' })}
                </span>
              </div>
              <p class="app-shell__footer-help-menu-item-summary">
                {audioMuted
                  ? $i18nT('ui.shell.footer.audio.mutedSummary', { default: 'All workbench audio is currently muted.' })
                  : $i18nT('ui.shell.footer.audio.liveSummary', { default: 'Core UI cues and timeline audio are active.' })}
              </p>
              <div class="app-shell__footer-audio-control" aria-label={$i18nT('ui.shell.footer.audio.masterVolume', { default: 'Master volume' })}>
                <label class="app-shell__footer-audio-meter-head" for="app-shell-footer-audio-master-volume">
                  <span>{$i18nT('ui.shell.footer.audio.masterVolume', { default: 'Master volume' })}</span>
                  <strong>{audioMuted ? $i18nT('ui.shell.footer.audio.muted', { default: 'Muted' }) : formatAudioPercent(footerAudioMasterVolume)}</strong>
                </label>
                <input
                  id="app-shell-footer-audio-master-volume"
                  class="app-shell__footer-audio-range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={clampAudioRatio(footerAudioMasterVolume)}
                  aria-label={$i18nT('ui.shell.footer.audio.setMasterVolume', { default: 'Set master volume' })}
                  on:input={(event) => onSetAudioMasterVolume(readAudioRangeInput(event))}
                />
              </div>
              <StereoAudioVuMeter
                meter={masterMeter}
                label={$i18nT('ui.shell.footer.audio.vuMeter', { default: 'VU meter' })}
                leftLabel={$i18nT('ui.shell.footer.audio.left', { default: 'Left' })}
                rightLabel={$i18nT('ui.shell.footer.audio.right', { default: 'Right' })}
              />
            </article>
          </div>
        </section>

        <section class="app-shell__footer-help-menu-section">
          <header class="app-shell__footer-help-menu-section-header">
            <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.footer.audio.channels', { default: 'Channels' })}</h4>
          </header>
          <div class="app-shell__footer-help-menu-items">
            {#each footerAudioChannels as channel (channel.id)}
              {@const effectiveVolume = resolveAudioChannelEffectiveVolume(channel)}
              {@const channelMeter = resolveAudioChannelOutputMeter(channel)}
              <article class="app-shell__footer-help-menu-item">
                <div class="app-shell__footer-help-menu-item-head">
                  <strong class="app-shell__footer-help-menu-item-title">{channel.label}</strong>
                  <span class="app-shell__footer-help-menu-item-status">
                    {channel.muted ? $i18nT('ui.shell.footer.audio.muted', { default: 'Muted' }) : `${Math.round(channel.volume * 100)}%`}
                  </span>
                </div>
                <p class="app-shell__footer-help-menu-item-summary">
                  {channel.muted
                    ? $i18nT('ui.shell.footer.audio.channelMuted', {
                        default: '{{id}} channel is muted.',
                        values: { id: channel.id }
                      })
                    : $i18nT('ui.shell.footer.audio.channelReady', {
                        default: '{{id}} channel is routed and ready.',
                        values: { id: channel.id }
                      })}
                </p>
                <div class="app-shell__footer-audio-channel-grid">
                  <div class="app-shell__footer-audio-control" aria-label={$i18nT('ui.shell.footer.audio.channelVolume', { default: 'Channel volume' })}>
                    <label class="app-shell__footer-audio-meter-head" for={`app-shell-footer-audio-channel-${channel.id}`}>
                      <span>{$i18nT('ui.shell.footer.audio.channelVolume', { default: 'Channel volume' })}</span>
                      <strong>{channel.muted ? $i18nT('ui.shell.footer.audio.muted', { default: 'Muted' }) : formatAudioPercent(channel.volume)}</strong>
                    </label>
                    <input
                      id={`app-shell-footer-audio-channel-${channel.id}`}
                      class="app-shell__footer-audio-range"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={clampAudioRatio(channel.volume)}
                      aria-label={$i18nT('ui.shell.footer.audio.setChannelVolume', {
                        default: 'Set {{label}} volume',
                        values: { label: channel.label }
                      })}
                      on:input={(event) => onSetAudioChannelVolume(channel.id, readAudioRangeInput(event))}
                    />
                  </div>
                  <div class="app-shell__footer-audio-meter app-shell__footer-audio-meter--effective" aria-label={$i18nT('ui.shell.footer.audio.effectiveVolume', { default: 'Effective output' })}>
                    <div class="app-shell__footer-audio-meter-head">
                      <span>{$i18nT('ui.shell.footer.audio.effectiveVolume', { default: 'Effective output' })}</span>
                      <strong>{formatAudioPercent(effectiveVolume)}</strong>
                    </div>
                    <div class="app-shell__footer-audio-meter-track">
                      <span style:--app-shell-footer-audio-level={formatAudioPercent(effectiveVolume)}></span>
                    </div>
                  </div>
                </div>
                <StereoAudioVuMeter
                  meter={channelMeter}
                  label={$i18nT('ui.shell.footer.audio.vuMeter', { default: 'VU meter' })}
                  leftLabel={$i18nT('ui.shell.footer.audio.left', { default: 'Left' })}
                  rightLabel={$i18nT('ui.shell.footer.audio.right', { default: 'Right' })}
                  spaced
                />
              </article>
            {/each}
          </div>
        </section>

        {#if footerAudioSummary}
          <section class="app-shell__footer-help-menu-section">
            <header class="app-shell__footer-help-menu-section-header">
              <h4 class="app-shell__footer-help-menu-section-title">{$i18nT('ui.shell.footer.audio.currentComposition', { default: 'Current Composition' })}</h4>
            </header>
            <div class="app-shell__footer-help-menu-items">
              <article class="app-shell__footer-help-menu-item">
                <div class="app-shell__footer-help-menu-item-head">
                  <strong class="app-shell__footer-help-menu-item-title">{footerAudioSummary.title}</strong>
                  <span class="app-shell__footer-help-menu-item-status">{footerAudioSummary.status}</span>
                </div>
                <p class="app-shell__footer-help-menu-item-summary">{footerAudioSummary.summary}</p>
                {#if footerAudioSummary.meta.length > 0}
                  <div class="app-shell__footer-help-menu-item-meta">
                    <span class="app-shell__footer-help-menu-item-tags">{footerAudioSummary.meta.join(' · ')}</span>
                  </div>
                {/if}
                {#if footerAudioSummary.mediaBlocks?.length}
                  <div class="app-shell__footer-audio-media-blocks" aria-label={$i18nT('ui.shell.footer.audio.mediaBlocks', { default: 'Available media blocks' })}>
                    <button
                      type="button"
                      class="app-shell__footer-audio-media-toggle"
                      aria-expanded={isAudioMediaBlocksOpen}
                      on:click={toggleAudioMediaBlocks}
                    >
                      <span>
                        <strong>{$i18nT('ui.shell.footer.audio.mediaBlocks', { default: 'Available media blocks' })}</strong>
                        <small>
                          {$i18nT('ui.shell.footer.audio.mediaBlockCount', {
                            default: '{{count}} blocks',
                            values: { count: footerAudioSummary.mediaBlocks.length }
                          })}
                        </small>
                      </span>
                      <WorkbenchIcon
                        className={`app-shell__footer-audio-media-toggle-icon ${
                          isAudioMediaBlocksOpen ? 'app-shell__footer-audio-media-toggle-icon--open' : ''
                        }`}
                        icon="action.chevron-down"
                        label="Toggle media blocks"
                      />
                    </button>
                    {#if isAudioMediaBlocksOpen}
                      <div class="app-shell__footer-audio-media-list">
                        {#each footerAudioSummary.mediaBlocks as block (block.id)}
                          {@const progressLabel = resolveAudioMediaBlockProgressLabel(block.progress)}
                          <article class="app-shell__footer-audio-media-block">
                            <div class="app-shell__footer-audio-media-block-head">
                              <strong>{block.title}</strong>
                              <span>{block.status}</span>
                            </div>
                            <p>{block.summary}</p>
                            {#if block.meta.length > 0}
                              <div class="app-shell__footer-audio-media-block-meta">{block.meta.join(' · ')}</div>
                            {/if}
                            {#if progressLabel}
                              <div class="app-shell__footer-audio-meter app-shell__footer-audio-meter--media" aria-label={$i18nT('ui.shell.footer.audio.mediaProgress', { default: 'Media progress' })}>
                                <div class="app-shell__footer-audio-meter-head">
                                  <span>{$i18nT('ui.shell.footer.audio.mediaProgress', { default: 'Media progress' })}</span>
                                  <strong>{progressLabel}</strong>
                                </div>
                                <div class="app-shell__footer-audio-meter-track">
                                  <span style:--app-shell-footer-audio-level={progressLabel}></span>
                                </div>
                              </div>
                            {/if}
                          </article>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </article>
            </div>
          </section>
        {/if}
      </div>

      <div class="app-shell__footer-help-menu-bottom">
        <div class="app-shell__footer-help-menu-header">
          <div>
            <p class="app-shell__footer-help-menu-eyebrow">{$i18nT('ui.shell.footer.audio.eyebrow', { default: 'Audio' })}</p>
            <h3 class="app-shell__footer-help-menu-title">{$i18nT('ui.shell.footer.audio.title', { default: 'Audio Panel' })}</h3>
          </div>
          <div class="app-shell__footer-help-menu-header-actions">
            <span class="app-shell__footer-help-menu-count">{footerAudioChannels.length}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-shell__footer-audio-group {
    color: var(--app-shell-footer-control-text-muted, color-mix(in srgb, var(--color-text-secondary) 64%, var(--color-text-muted)));
  }

  .app-shell__footer-audio-group--muted {
    color: color-mix(in srgb, var(--color-status-warning) 64%, var(--color-text-muted));
  }

  .app-shell__footer-toggle-group {
    max-width: 100%;
  }

  .app-shell__footer-toggle,
  .app-shell__footer-toggle-menu-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.875rem;
    min-height: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 var(--space-6);
  }

  .app-shell__footer-toggle {
    gap: var(--app-shell-footer-control-gap, var(--space-4));
    border-top-left-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
    border-bottom-left-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  .app-shell__footer-toggle--audio-primary {
    min-width: var(--app-shell-footer-icon-button-width, 1.65rem);
    padding: 0 0.45rem;
  }

  .app-shell__footer-audio-toggle--muted {
    color: color-mix(in srgb, var(--color-status-warning) 82%, var(--color-text-primary));
  }

  .app-shell__footer-toggle-menu-button {
    min-width: var(--app-shell-footer-icon-button-width, 1.65rem);
    padding: 0 0.45rem;
    border-left: 1px solid var(--app-shell-footer-control-border, var(--color-border-subtle));
    border-top-right-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
    border-bottom-right-radius: calc(var(--app-shell-footer-control-radius, var(--radius-medium)) - 1px);
  }

  :global(.app-shell__footer-toggle-state-icon),
  :global(.app-shell__footer-audio-state-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    color: color-mix(in srgb, var(--color-text-secondary) 82%, var(--color-action-primary));
  }

  :global(.app-shell__footer-audio-state-icon--muted) {
    color: color-mix(in srgb, var(--color-status-warning) 82%, var(--color-text-primary));
  }

  .app-shell__footer-toggle:hover,
  .app-shell__footer-toggle-menu-button:hover {
    background: color-mix(in srgb, var(--color-background-hover) 24%, transparent);
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-menu-button:hover,
  .app-shell__footer-toggle-menu-button--open {
    color: var(--color-text-primary);
  }

  .app-shell__footer-toggle-menu-button--open {
    background: color-mix(in srgb, var(--color-background-hover) 24%, transparent);
  }

  :global(.app-shell__footer-control-icon) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
    flex: 0 0 auto;
    display: block;
  }

  :global(.app-shell__footer-control-icon--audio) {
    width: var(--app-shell-footer-icon-size, 0.95rem);
    height: var(--app-shell-footer-icon-size, 0.95rem);
  }

  .app-shell__footer-help-menu {
    position: absolute;
    right: 0;
    bottom: calc(100% + var(--space-4));
    z-index: 30;
    width: min(36rem, calc(var(--app-shell-shell-width, 100vw) - var(--space-16)));
    max-width: calc(var(--app-shell-shell-width, 100vw) - var(--space-16));
    max-height: min(var(--app-shell-workspace-height, 28rem), calc(100vh - 8rem));
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    overflow: hidden;
    padding: var(--space-10);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-large);
    background: var(--color-background-elevated);
    box-shadow:
      0 -12px 28px rgb(0 0 0 / 0.22),
      0 0 0 1px color-mix(in srgb, var(--color-border-subtle) 38%, transparent);
  }

  .app-shell__footer-help-menu-bottom {
    position: sticky;
    bottom: 0;
    z-index: 1;
    background: var(--color-background-elevated);
    padding-top: var(--space-10);
    border-top: 1px solid color-mix(in srgb, var(--color-border-subtle) 72%, transparent);
    box-shadow:
      0 -10px 18px rgb(0 0 0 / 0.14),
      0 -1px 0 color-mix(in srgb, var(--color-border-subtle) 48%, transparent);
  }

  .app-shell__footer-help-menu-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-12);
    margin-bottom: var(--space-12);
  }

  .app-shell__footer-help-menu-header-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .app-shell__footer-help-menu-eyebrow {
    margin: 0 0 var(--space-4);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6875rem;
  }

  .app-shell__footer-help-menu-title {
    margin: 0;
    font-size: 0.875rem;
  }

  .app-shell__footer-help-menu-count {
    display: inline-flex;
    align-items: center;
    min-height: 1.25rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: 999px;
    background: var(--color-background-muted);
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    white-space: nowrap;
  }

  .app-shell__footer-help-menu-groups {
    display: grid;
    gap: var(--space-12);
    min-height: 0;
    overflow: auto;
    padding-right: var(--space-2);
    padding-bottom: var(--space-6);
  }

  .app-shell__footer-help-menu-section {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-section + .app-shell__footer-help-menu-section {
    padding-top: var(--space-10);
    border-top: 1px solid var(--color-border-subtle);
  }

  .app-shell__footer-help-menu-section-title {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }

  .app-shell__footer-help-menu-items {
    display: grid;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-item {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-8);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-medium);
    background: color-mix(in srgb, var(--color-background-muted) 74%, transparent);
  }

  .app-shell__footer-help-menu-item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-8);
  }

  .app-shell__footer-help-menu-item-title {
    font-size: var(--font-size-body);
    line-height: 1.2;
  }

  .app-shell__footer-help-menu-item-status {
    color: var(--color-text-muted);
    font-size: var(--font-size-label);
    text-transform: capitalize;
    white-space: nowrap;
  }

  .app-shell__footer-help-menu-item-summary {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-label);
    line-height: 1.35;
  }

  .app-shell__footer-help-menu-item-meta {
    display: grid;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    line-height: 1.35;
  }

  .app-shell__footer-audio-channel-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-8);
  }

  .app-shell__footer-audio-control {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .app-shell__footer-audio-range {
    width: 100%;
    min-width: 0;
    height: 0.9rem;
    margin: 0;
    accent-color: #9bc4ff;
    cursor: pointer;
  }

  .app-shell__footer-audio-meter {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .app-shell__footer-audio-meter-head,
  .app-shell__footer-audio-media-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-width: 0;
  }

  .app-shell__footer-audio-meter-head span,
  .app-shell__footer-audio-media-block-head span,
  .app-shell__footer-audio-media-block-meta {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
    line-height: 1.2;
  }

  .app-shell__footer-audio-meter-head strong {
    color: var(--color-text-secondary);
    font-size: 0.6875rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .app-shell__footer-audio-meter-track {
    position: relative;
    height: 0.34rem;
    overflow: hidden;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
  }

  .app-shell__footer-audio-meter-track span {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--app-shell-footer-audio-level, 0%);
    border-radius: inherit;
    background: color-mix(in srgb, #78a9ff 72%, var(--color-text-primary));
    box-shadow: 0 0 14px color-mix(in srgb, #78a9ff 24%, transparent);
  }

  .app-shell__footer-audio-meter--effective .app-shell__footer-audio-meter-track span {
    background: color-mix(in srgb, #7de0b0 70%, var(--color-text-primary));
  }

  .app-shell__footer-audio-meter--media .app-shell__footer-audio-meter-track span {
    background: color-mix(in srgb, #ffd56a 70%, var(--color-text-primary));
  }

  .app-shell__footer-audio-media-blocks {
    display: grid;
    gap: var(--space-6);
    padding-top: var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
  }

  .app-shell__footer-audio-media-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    width: 100%;
    min-height: 1.6rem;
    padding: var(--space-4) 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .app-shell__footer-audio-media-toggle span {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .app-shell__footer-audio-media-toggle strong {
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    line-height: 1.2;
  }

  .app-shell__footer-audio-media-toggle small {
    color: var(--color-text-muted);
    font-size: 0.64rem;
    line-height: 1.2;
  }

  :global(.app-shell__footer-audio-media-toggle-icon) {
    width: 0.75rem;
    height: 0.75rem;
    flex: 0 0 auto;
    color: var(--color-text-muted);
    --workbench-icon-stroke-width: 1.6;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  :global(.app-shell__footer-audio-media-toggle-icon--open) {
    transform: rotate(180deg);
  }

  .app-shell__footer-audio-media-list {
    display: grid;
    gap: var(--space-6);
  }

  .app-shell__footer-audio-media-block {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-6);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-small);
    background: color-mix(in srgb, var(--color-background-surface) 70%, transparent);
  }

  .app-shell__footer-audio-media-block-head strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .app-shell__footer-audio-media-block p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  @media (max-width: 720px) {
    .app-shell__footer-help-menu {
      width: calc(100vw - var(--space-16));
    }

    .app-shell__footer-audio-channel-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
