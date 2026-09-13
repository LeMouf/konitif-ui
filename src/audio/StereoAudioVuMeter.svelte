<script lang="ts">
  import {
    formatStereoAudioLevelPercent,
    formatStereoAudioPeakDb,
    normalizeStereoAudioMeter,
    type StereoAudioMeterValue
  } from './stereoAudioMeter';

  export let meter: StereoAudioMeterValue;
  export let label = 'VU meter';
  export let leftLabel = 'Left';
  export let rightLabel = 'Right';
  export let spaced = false;

  $: normalizedMeter = normalizeStereoAudioMeter(meter);
</script>

<div
  class="stereo-audio-vu"
  class:stereo-audio-vu--spaced={spaced}
  aria-label={label}
  data-qualified-audio-vu-meter
>
  <div class="stereo-audio-vu__scale" aria-hidden="true">
    <span>-90</span>
    <span>-60</span>
    <span>-30</span>
    <span>-12</span>
    <span>0</span>
  </div>
  <div class="stereo-audio-vu__row">
    <span>{leftLabel}</span>
    <div class="stereo-audio-vu__track">
      <span style:--stereo-audio-level={formatStereoAudioLevelPercent(normalizedMeter.left)}></span>
    </div>
    <strong>{formatStereoAudioPeakDb(normalizedMeter.peakDb)}</strong>
  </div>
  <div class="stereo-audio-vu__row">
    <span>{rightLabel}</span>
    <div class="stereo-audio-vu__track">
      <span style:--stereo-audio-level={formatStereoAudioLevelPercent(normalizedMeter.right)}></span>
    </div>
    <strong>{formatStereoAudioPeakDb(normalizedMeter.peakDb)}</strong>
  </div>
</div>

<style>
  .stereo-audio-vu {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-6);
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 82%, #9fc6ff);
    border-radius: var(--radius-small);
    background:
      repeating-linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-text-primary) 8%, transparent) 0 1px,
        transparent 1px 8px
      ),
      color-mix(in srgb, var(--color-background-deep) 72%, transparent);
  }

  .stereo-audio-vu--spaced {
    margin-top: var(--space-6);
  }

  .stereo-audio-vu__row {
    display: grid;
    grid-template-columns: 3.1rem minmax(0, 1fr) 3.8rem;
    align-items: center;
    gap: var(--space-6);
    min-width: 0;
  }

  .stereo-audio-vu__scale {
    position: relative;
    height: 0.62rem;
    margin-left: 3.1rem;
    margin-right: 3.8rem;
    color: var(--color-text-muted);
    font-family: var(--font-family-mono, monospace);
    font-size: 0.58rem;
    line-height: 1;
  }

  .stereo-audio-vu__scale span {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
  }

  .stereo-audio-vu__scale span:nth-child(1) {
    left: 0;
    transform: none;
  }

  .stereo-audio-vu__scale span:nth-child(2) {
    left: 25%;
  }

  .stereo-audio-vu__scale span:nth-child(3) {
    left: 55%;
  }

  .stereo-audio-vu__scale span:nth-child(4) {
    left: 78%;
  }

  .stereo-audio-vu__scale span:nth-child(5) {
    left: 100%;
  }

  .stereo-audio-vu__row > span {
    color: var(--color-text-secondary);
    font-size: 0.64rem;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
  }

  .stereo-audio-vu__row > strong {
    color: var(--color-text-primary);
    font-family: var(--font-family-mono, monospace);
    font-size: 0.65rem;
    line-height: 1;
    text-align: right;
    white-space: nowrap;
  }

  .stereo-audio-vu__track {
    position: relative;
    height: 0.72rem;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-border-subtle) 68%, transparent);
    border-radius: 2px;
    background: color-mix(in srgb, #050a10 84%, transparent);
    box-shadow: inset 0 0 12px color-mix(in srgb, #7fb0ff 10%, transparent);
  }

  .stereo-audio-vu__track span {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--stereo-audio-level, 0%);
    min-width: 2px;
    background: linear-gradient(90deg, #38d27a 0%, #c8e94b 58%, #ff9a4d 82%, #ff5c71 100%);
    box-shadow: 0 0 10px color-mix(in srgb, #78e6b5 26%, transparent);
    transition: width 42ms linear;
  }
</style>
