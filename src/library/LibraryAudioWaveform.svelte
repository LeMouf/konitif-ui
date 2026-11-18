<script lang="ts">
  import { readable } from 'svelte/store';
  import { getLibraryAudioLabels, type LibraryAudioPreview, type LibraryAudioSource } from './libraryAudioPreview';

  type Source = $$Generic<LibraryAudioSource>;
  export let source: Source;
  export let player: LibraryAudioPreview<Source> | undefined;
  export let locale = 'en';

  let pointer: number | undefined;
  const empty = readable<{ source: Source | null; time: number; playing: boolean }>({ source: null, time: 0, playing: false });
  $: state = player ?? empty;
  $: labels = getLibraryAudioLabels(locale);
  $: selected = $state.source?.id === source.id;
  $: time = selected ? $state.time : 0;
  $: progress = source.duration > 0 ? Math.max(0, Math.min(1, time / source.duration)) : 0;

  function toggle() {
    if (selected && $state.playing) player?.pause();
    else void player?.play(source);
  }

  function scrub(event: PointerEvent) {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (bounds.width > 0) player?.seek(source, (event.clientX - bounds.left) / bounds.width * source.duration);
  }

  function start(event: PointerEvent) {
    if (!player || event.button !== 0 || (event.target as Element).closest('button')) return;
    event.preventDefault();
    const node = event.currentTarget as HTMLElement;
    node.focus({ preventScroll: true });
    node.setPointerCapture(event.pointerId);
    pointer = event.pointerId;
    scrub(event);
  }

  function move(event: PointerEvent) {
    if (event.pointerId === pointer) scrub(event);
  }

  function end(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    scrub(event);
    pointer = undefined;
  }

  function cancel(event: PointerEvent) {
    if (event.pointerId === pointer) pointer = undefined;
  }

  function keys(event: KeyboardEvent) {
    if (event.target !== event.currentTarget || !player) return;
    switch (event.key) {
      case 'ArrowLeft': player.seek(source, time - 1); break;
      case 'ArrowRight': player.seek(source, time + 1); break;
      case 'Home': player.seek(source, 0); break;
      case 'End': player.seek(source, source.duration); break;
      case ' ': toggle(); break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
  }
</script>

<div class="waveform">
  <slot />
  {#if player}
    <div class="scrub" data-audio-scrub data-space-key-owner="library-audio" role="slider" tabindex="0"
      aria-label={labels.position + ' · ' + source.name} aria-valuemin={0} aria-valuemax={source.duration} aria-valuenow={time}
      on:pointerdown={start} on:pointermove={move} on:pointerup={end}
      on:pointercancel={cancel} on:lostpointercapture={cancel} on:keydown={keys}>
      {#if selected}
        <span class="progress" style:width={progress * 100 + '%'}></span>
        <span class="playhead" style:left={progress * 100 + '%'}></span>
      {/if}
    </div>
    <button type="button" class="play" aria-label={($state.playing && selected ? labels.pause : labels.play) + ' · ' + source.name}
      on:click|stopPropagation={toggle}>{$state.playing && selected ? 'Ⅱ' : '▶'}</button>
  {/if}
</div>

<style>
  .waveform { position: relative; min-width: 0; border-radius: 5px; }
  .scrub { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; touch-action: none; cursor: ew-resize; }
  .scrub:focus-visible { outline: 2px solid #c399ee; outline-offset: 2px; }
  .progress, .playhead { position: absolute; pointer-events: none; }
  .progress { bottom: 0; left: 0; height: 3px; background: #c399ee; }
  .playhead { top: 0; bottom: 0; width: 1px; background: #ead8ff; opacity: .8; }
  .play { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); display: grid;
    place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid #d8b9f5;
    border-radius: 50%; background: #151225cc; color: #eee; opacity: 0; transition: opacity .12s; cursor: pointer; }
  .waveform:hover .play, .waveform:focus-within .play { opacity: 1; }
  @media (hover: none) { .play { opacity: 1; } }
</style>
