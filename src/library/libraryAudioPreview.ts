import { get, writable } from 'svelte/store';

export type LibraryAudioSource = { id: string; name: string; duration: number };
type State<T> = { source: T | null; time: number; playing: boolean; muted: boolean; error: string };
type Options<T> = {
  mediaUrl: (source: T) => string;
  errorMessage: () => string;
  beforePlay?: () => void;
};

export const LIBRARY_AUDIO_PREVIEW = Symbol('library-audio-preview');

export function createLibraryAudioPreview<T extends LibraryAudioSource>(options: Options<T>) {
  const store = writable<State<T>>({ source: null, time: 0, playing: false, muted: false, error: '' });
  let media: HTMLAudioElement | undefined;
  let mediaId: string | undefined;
  let frame = 0;
  let epoch = 0;
  let disposed = false;
  let wantedPlaying = false;

  function update(change: Partial<State<T>>) {
    if (!disposed) store.update(state => ({ ...state, ...change }));
  }

  function stopFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function sync() {
    if (!media || disposed) return;
    update({ time: media.currentTime, playing: !media.paused });
    if (!media.paused) frame = requestAnimationFrame(sync);
  }

  function pause() {
    wantedPlaying = false;
    epoch++;
    media?.pause();
    stopFrame();
    update({ playing: false });
  }

  function choose(source: T) {
    if (get(store).source?.id === source.id) return;
    pause();
    update({ source, time: 0, error: '' });
  }

  function ended() {
    wantedPlaying = false;
    stopFrame();
    update({ playing: false, time: get(store).source?.duration ?? 0 });
  }

  function paused() {
    if (!media?.paused) return;
    stopFrame();
    update({ playing: false });
  }

  function failed() {
    if (get(store).source?.id !== mediaId) return;
    pause();
    update({ error: options.errorMessage() });
  }

  function loaded() {
    if (media && get(store).source?.id === mediaId) media.currentTime = get(store).time;
  }

  function player() {
    if (!media) {
      media = new Audio();
      media.preload = 'metadata';
      media.muted = get(store).muted;
      media.addEventListener('ended', ended);
      media.addEventListener('pause', paused);
      media.addEventListener('error', failed);
      media.addEventListener('loadedmetadata', loaded);
    }
    return media;
  }

  async function play(source: T) {
    if (disposed) return;
    choose(source);
    options.beforePlay?.();
    wantedPlaying = true;
    const token = ++epoch;
    const value = player();
    try {
      if (mediaId !== source.id) {
        mediaId = source.id;
        value.src = options.mediaUrl(source);
      }
      if (get(store).time >= source.duration) update({ time: 0 });
      value.currentTime = get(store).time;
      update({ playing: true, error: '' });
      await value.play();
      if (token !== epoch || disposed) {
        if (!wantedPlaying) value.pause();
        return;
      }
      stopFrame();
      sync();
    } catch {
      if (token === epoch) failed();
    }
  }

  function seek(source: T, time: number) {
    choose(source);
    const position = Math.max(0, Math.min(source.duration, Number.isFinite(time) ? time : 0));
    update({ time: position });
    if (media && mediaId === source.id) media.currentTime = position;
  }

  return {
    subscribe: store.subscribe,
    read: () => get(store),
    choose, play, pause, seek,
    toggle() {
      const state = get(store);
      if (!state.source) return;
      if (wantedPlaying) pause();
      else void play(state.source);
    },
    setMuted(muted: boolean) {
      if (media) media.muted = muted;
      update({ muted });
    },
    clear() {
      pause();
      update({ source: null, time: 0, error: '' });
    },
    dispose() {
      pause();
      disposed = true;
      if (!media) return;
      media.removeEventListener('ended', ended);
      media.removeEventListener('pause', paused);
      media.removeEventListener('error', failed);
      media.removeEventListener('loadedmetadata', loaded);
      media.removeAttribute('src');
      media.load();
      media = undefined;
    }
  };
}

export type LibraryAudioPreview<T extends LibraryAudioSource = LibraryAudioSource> =
  ReturnType<typeof createLibraryAudioPreview<T>>;

export const libraryAudioLabels = {
  en: { player: 'Library audio player', play: 'Play', pause: 'Pause', mute: 'Mute preview',
    unmute: 'Unmute preview', position: 'Playback position', error: 'This audio could not be played.' },
  fr: { player: 'Lecteur audio de la bibliothèque', play: 'Écouter', pause: 'Mettre en pause', mute: 'Couper la préécoute',
    unmute: 'Rétablir la préécoute', position: 'Position de lecture', error: 'Impossible de lire cet extrait.' },
  'zh-CN': { player: '资源库音频播放器', play: '播放', pause: '暂停', mute: '预览静音',
    unmute: '取消预览静音', position: '播放位置', error: '无法播放此音频。' }
};

export function getLibraryAudioLabels(locale: string) {
  return libraryAudioLabels[locale as keyof typeof libraryAudioLabels] ?? libraryAudioLabels.en;
}
