<script lang="ts">
  import { getLibraryAudioLabels, type LibraryAudioPreview, type LibraryAudioSource } from './libraryAudioPreview';

  type Source = $$Generic<LibraryAudioSource>;
  export let player: LibraryAudioPreview<Source>;
  export let locale = 'en';
  export let closeLabel: string | undefined = undefined;

  $: labels = getLibraryAudioLabels(locale);
  const time = (value: number) => Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
</script>

{#if $player.source}
  <div class="library-player" data-library-audio-player data-space-key-owner="library-audio" role="group" aria-label={labels.player}>
    <button type="button" aria-label={$player.playing ? labels.pause : labels.play} on:click={player.toggle}>
      {$player.playing ? 'Ⅱ' : '▶'}
    </button>
    <button type="button" aria-label={$player.muted ? labels.unmute : labels.mute} aria-pressed={$player.muted}
      on:click={() => player.setMuted(!$player.muted)}>{$player.muted ? '×' : '♪'}</button>
    <div class="track">
      <strong>{$player.source.name}</strong>
      <input type="range" aria-label={labels.position} min="0" max={$player.source.duration} step="0.01" value={$player.time}
        on:input={event => $player.source && player.seek($player.source, Number(event.currentTarget.value))} />
    </div>
    <span>{time($player.time)} / {time($player.source.duration)}</span>
    {#if closeLabel}<button type="button" aria-label={closeLabel} on:click={player.clear}>×</button>{/if}
    {#if $player.error}<small role="alert">{$player.error}</small>{/if}
  </div>
{/if}

<style>
  .library-player { display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 9px 0; color: var(--color-text-primary); }
  button { flex: none; width: 31px; height: 31px; border: 1px solid var(--color-border-subtle); border-radius: 5px;
    background: var(--color-background-muted); color: inherit; cursor: pointer; }
  .track { min-width: 0; flex: 1; display: grid; gap: 5px; }
  .track strong { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  input { width: 100%; margin: 0; accent-color: #c399ee; }
  span, small { font-size: 10px; }
  span { white-space: nowrap; }
</style>
