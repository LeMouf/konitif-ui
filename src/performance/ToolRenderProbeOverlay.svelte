<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { ToolRenderProbe, ToolRenderProbeSample, ToolRenderProbeSnapshot } from './toolRenderProbe';

  export let probe: ToolRenderProbe;
  export let position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left';

  const GRAPH_WIDTH = 228;
  const GRAPH_HEIGHT = 58;

  let snapshot: ToolRenderProbeSnapshot | null = null;
  let graphCanvas: HTMLCanvasElement | null = null;
  let unsubscribe: (() => void) | null = null;

  $: topMeasure = snapshot?.measures[0] ?? null;
  $: signalLabel = snapshot && snapshot.signals.length > 0
    ? snapshot.signals.map((signal) => `${signal.label}:${signal.count}`).join(' ')
    : '-';
  $: measureLabel = snapshot && snapshot.measures.length > 0
    ? snapshot.measures.slice(0, 3).map((measure) => `${measure.label} ${measure.averageMs.toFixed(1)}`).join(' | ')
    : '-';
  $: if (snapshot && graphCanvas) {
    drawGraph(graphCanvas, snapshot.samples, snapshot.targetFrameRate);
  }

  onMount(() => {
    unsubscribe = probe.subscribe((nextSnapshot) => {
      snapshot = nextSnapshot;
    });
  });

  onDestroy(() => {
    unsubscribe?.();
    unsubscribe = null;
  });

  function drawGraph(canvas: HTMLCanvasElement, samples: ToolRenderProbeSample[], targetFrameRate: number): void {
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const pixelRatio = Math.max(1, Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2));
    const deviceWidth = Math.round(GRAPH_WIDTH * pixelRatio);
    const deviceHeight = Math.round(GRAPH_HEIGHT * pixelRatio);

    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
    }

    context.save();
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);
    context.fillStyle = 'rgba(8, 24, 44, 0.62)';
    context.fillRect(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);
    drawGrid(context);

    if (samples.length > 1) {
      const fpsMax = Math.max(60, Math.ceil(targetFrameRate / 30) * 30);
      const msMax = Math.max(24, Math.ceil(Math.max(...samples.map((sample) => sample.maxMeasureMs), 8) / 8) * 8);

      drawSeries(context, samples, (sample) => sample.rafFrameRate, fpsMax, 3, 4, GRAPH_WIDTH - 6, 20, '#67e8f9');
      drawSeries(context, samples, (sample) => sample.updateFrameRate, fpsMax, 3, 4, GRAPH_WIDTH - 6, 20, '#22c55e');
      drawSeries(context, samples, (sample) => sample.maxMeasureMs, msMax, 3, 32, GRAPH_WIDTH - 6, 20, '#fb7185');
      drawSeries(context, samples, (sample) => sample.timerDelayMs, msMax, 3, 32, GRAPH_WIDTH - 6, 20, '#f59e0b');
    }

    context.fillStyle = 'rgba(203, 213, 225, 0.72)';
    context.font = '600 8px Helvetica, Arial, sans-serif';
    context.fillText(`DISPLAY ${targetFrameRate}Hz · RAF/UPD`, 4, 10);
    context.fillText('MEASURE/TIMER', 4, 38);
    context.restore();
  }

  function drawGrid(context: CanvasRenderingContext2D): void {
    context.strokeStyle = 'rgba(103, 232, 249, 0.12)';
    context.lineWidth = 1;

    for (let index = 1; index < 4; index += 1) {
      const x = Math.round((GRAPH_WIDTH / 4) * index) + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, GRAPH_HEIGHT);
      context.stroke();
    }

    for (const y of [24.5, 52.5]) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(GRAPH_WIDTH, y);
      context.stroke();
    }
  }

  function drawSeries(
    context: CanvasRenderingContext2D,
    samples: ToolRenderProbeSample[],
    readValue: (sample: ToolRenderProbeSample) => number,
    maxValue: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    const startTime = samples[0]?.time ?? 0;
    const endTime = samples[samples.length - 1]?.time ?? startTime + 1;
    const duration = Math.max(1, endTime - startTime);

    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();

    samples.forEach((sample, index) => {
      const sampleX = x + ((sample.time - startTime) / duration) * width;
      const ratio = Math.max(0, Math.min(1, readValue(sample) / Math.max(maxValue, 1)));
      const sampleY = y + height - ratio * height;

      if (index === 0) {
        context.moveTo(sampleX, sampleY);
      } else {
        context.lineTo(sampleX, sampleY);
      }
    });

    context.stroke();
  }
</script>

{#if snapshot?.enabled}
  <aside class:tool-render-probe--bottom-left={position === 'bottom-left'} class:tool-render-probe--bottom-right={position === 'bottom-right'} class:tool-render-probe--top-left={position === 'top-left'} class:tool-render-probe--top-right={position === 'top-right'} class="tool-render-probe" aria-hidden="true">
    <div class="tool-render-probe__line">
      DISPLAY {snapshot.displayFrameRateSource === 'estimated' ? '~' : ''}{snapshot.targetFrameRate}Hz
      {snapshot.displayFrameRateSource === 'estimated' ? 'est.' : 'cfg.'}
      | RAF {Math.round(snapshot.rafFrameRate)} {snapshot.averageRafMs.toFixed(1)}ms
      | UPD {Math.round(snapshot.updateFrameRate)}
    </div>
    <div class="tool-render-probe__line">
      HOT {topMeasure ? `${topMeasure.label} ${topMeasure.averageMs.toFixed(2)}ms` : '-'} | TMR {snapshot.averageTimerDelayMs.toFixed(2)}ms | LT {snapshot.longTaskCount}/{snapshot.longTaskMs.toFixed(0)}ms
    </div>
    <div class="tool-render-probe__line">M {measureLabel}</div>
    <div class="tool-render-probe__line">SIG {signalLabel}</div>
    <canvas bind:this={graphCanvas} class="tool-render-probe__graph"></canvas>
  </aside>
{/if}

<style>
  .tool-render-probe {
    position: absolute;
    z-index: 8;
    width: 228px;
    padding: 0.25rem 0.34rem 0.34rem;
    border: 1px solid color-mix(in srgb, var(--color-info, #38bdf8) 42%, transparent);
    border-radius: 0.28rem;
    background: color-mix(in srgb, var(--color-background-canvas, #020c18) 78%, transparent);
    color: var(--color-info, #67e8f9);
    font: 600 9px Helvetica, Arial, sans-serif;
    letter-spacing: 0;
    line-height: 1.28;
    pointer-events: none;
    box-shadow: 0 0.4rem 1.8rem color-mix(in srgb, black 32%, transparent);
  }

  .tool-render-probe--bottom-left {
    left: 0.5rem;
    bottom: 0.5rem;
  }

  .tool-render-probe--bottom-right {
    right: 0.5rem;
    bottom: 0.5rem;
  }

  .tool-render-probe--top-left {
    left: 0.5rem;
    top: 0.5rem;
  }

  .tool-render-probe--top-right {
    right: 0.5rem;
    top: 0.5rem;
  }

  .tool-render-probe__line {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .tool-render-probe__graph {
    display: block;
    width: 228px;
    height: 58px;
    margin-top: 0.24rem;
    border-top: 1px solid color-mix(in srgb, var(--color-info, #38bdf8) 20%, transparent);
  }
</style>
