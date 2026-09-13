import {
  DEFAULT_DISPLAY_FRAME_RATE_HZ,
  normalizeConfiguredDisplayFrameRate,
  observeDisplayFrameRateCeiling,
  resolveDisplayFrameRateTarget
} from './displayFrameRate';

export interface ToolRenderProbeMeasure {
  label: string;
  averageMs: number;
  maxMs: number;
  count: number;
}

export interface ToolRenderProbeSample {
  time: number;
  rafFrameRate: number;
  updateFrameRate: number;
  maxMeasureMs: number;
  longTaskMs: number;
  timerDelayMs: number;
}

export interface ToolRenderProbeSnapshot {
  id: string;
  label: string;
  enabled: boolean;
  targetFrameRate: number;
  displayFrameRateSource: 'configured' | 'estimated';
  rafFrameRate: number;
  updateFrameRate: number;
  averageRafMs: number;
  averageUpdateMs: number;
  averageTimerDelayMs: number;
  longTaskCount: number;
  longTaskMs: number;
  measures: ToolRenderProbeMeasure[];
  signals: Array<{ label: string; count: number }>;
  samples: ToolRenderProbeSample[];
}

export interface ToolRenderProbeOptions {
  id: string;
  label: string;
  targetFrameRate?: number;
  historyMs?: number;
  reportIntervalMs?: number;
  timerIntervalMs?: number;
}

type ToolRenderProbeSubscriber = (snapshot: ToolRenderProbeSnapshot) => void;

interface InternalMeasure {
  averageMs: number;
  maxMs: number;
  count: number;
}

const DEFAULT_HISTORY_MS = 60_000;
const DEFAULT_REPORT_INTERVAL_MS = 500;
const DEFAULT_TIMER_INTERVAL_MS = 100;

export class ToolRenderProbe {
  readonly id: string;
  readonly label: string;
  private readonly configuredTargetFrameRate: number | null;
  private observedFrameRateCeiling = DEFAULT_DISPLAY_FRAME_RATE_HZ;
  private readonly historyMs: number;
  private readonly reportIntervalMs: number;
  private readonly timerIntervalMs: number;
  private enabled = false;
  private destroyed = false;
  private rafFrame = 0;
  private timerProbe: ReturnType<typeof setInterval> | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private lastRafAt = 0;
  private lastReportAt = 0;
  private lastTimerProbeAt = 0;
  private rafFramesSinceReport = 0;
  private updateFramesSinceReport = 0;
  private longTaskCountSinceReport = 0;
  private longTaskDurationSinceReport = 0;
  private averageRafMs = 1000 / DEFAULT_DISPLAY_FRAME_RATE_HZ;
  private averageUpdateMs = 0;
  private averageTimerDelayMs = 0;
  private measures = new Map<string, InternalMeasure>();
  private signalCounts = new Map<string, number>();
  private samples: ToolRenderProbeSample[] = [];
  private subscribers = new Set<ToolRenderProbeSubscriber>();
  private snapshot: ToolRenderProbeSnapshot;

  constructor(options: ToolRenderProbeOptions) {
    this.id = options.id;
    this.label = options.label;
    this.configuredTargetFrameRate = normalizeConfiguredDisplayFrameRate(options.targetFrameRate);
    this.historyMs = options.historyMs ?? DEFAULT_HISTORY_MS;
    this.reportIntervalMs = options.reportIntervalMs ?? DEFAULT_REPORT_INTERVAL_MS;
    this.timerIntervalMs = options.timerIntervalMs ?? DEFAULT_TIMER_INTERVAL_MS;
    this.snapshot = this.createSnapshot(0, 0);
  }

  get targetFrameRate(): number {
    return resolveDisplayFrameRateTarget(this.configuredTargetFrameRate, this.observedFrameRateCeiling);
  }

  setEnabled(enabled: boolean): void {
    if (this.destroyed || this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;

    if (enabled) {
      this.resetCadence(this.now());
      this.startRafProbe();
      this.startTimerProbe();
      this.observeLongTasks();
      this.publishSnapshot();
      return;
    }

    this.stopRuntimeProbes();
    this.publishSnapshot();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  destroy(): void {
    this.destroyed = true;
    this.stopRuntimeProbes();
    this.subscribers.clear();
  }

  subscribe(subscriber: ToolRenderProbeSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.snapshot);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  measure<T>(label: string, callback: () => T): T {
    if (!this.enabled) {
      return callback();
    }

    const startedAt = this.now();

    try {
      return callback();
    } finally {
      this.recordMeasure(label, this.now() - startedAt);
    }
  }

  beginMeasure(): number {
    return this.enabled ? this.now() : 0;
  }

  endMeasure(label: string, startedAt: number): void {
    if (!this.enabled || startedAt <= 0) {
      return;
    }

    this.recordMeasure(label, this.now() - startedAt);
  }

  markUpdate(label = 'update'): void {
    if (!this.enabled) {
      return;
    }

    this.updateFramesSinceReport += 1;
    this.markSignal(label);
  }

  markSignal(label: string): void {
    if (!this.enabled) {
      return;
    }

    const normalizedLabel = label.trim().slice(0, 18);

    if (!normalizedLabel) {
      return;
    }

    this.signalCounts.set(normalizedLabel, (this.signalCounts.get(normalizedLabel) ?? 0) + 1);
  }

  private recordMeasure(label: string, durationMs: number): void {
    const normalizedLabel = label.trim().slice(0, 18);

    if (!normalizedLabel || !Number.isFinite(durationMs)) {
      return;
    }

    const current = this.measures.get(normalizedLabel) ?? { averageMs: 0, maxMs: 0, count: 0 };
    current.averageMs = this.updateAverage(current.averageMs, Math.max(0, durationMs), 0.18);
    current.maxMs = Math.max(current.maxMs, durationMs);
    current.count += 1;
    this.measures.set(normalizedLabel, current);

    if (normalizedLabel === 'svelte.update') {
      this.averageUpdateMs = this.updateAverage(this.averageUpdateMs, durationMs, 0.18);
    }
  }

  private startRafProbe(): void {
    if (!this.enabled || this.rafFrame !== 0 || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    this.rafFrame = requestAnimationFrame(this.runRafProbe);
  }

  private runRafProbe = (now: number): void => {
    this.rafFrame = 0;

    if (!this.enabled || this.destroyed) {
      return;
    }

    if (this.lastRafAt > 0) {
      const frameMs = now - this.lastRafAt;

      if (frameMs >= 4 && frameMs <= 120) {
        this.averageRafMs = this.updateAverage(this.averageRafMs, frameMs, 0.08);
        this.observedFrameRateCeiling = observeDisplayFrameRateCeiling(
          this.observedFrameRateCeiling,
          this.averageRafMs
        );
      }
    }

    this.lastRafAt = now;
    this.rafFramesSinceReport += 1;
    this.reportIfDue(now);
    this.startRafProbe();
  };

  private reportIfDue(now: number): void {
    if (this.lastReportAt === 0) {
      this.lastReportAt = now;
      return;
    }

    const elapsedMs = now - this.lastReportAt;

    if (elapsedMs < this.reportIntervalMs) {
      return;
    }

    const elapsedSeconds = Math.max(0.001, elapsedMs / 1000);
    const rafFrameRate = this.rafFramesSinceReport / elapsedSeconds;
    const updateFrameRate = this.updateFramesSinceReport / elapsedSeconds;
    const maxMeasureMs = this.resolveTopMeasures()[0]?.maxMs ?? 0;

    this.recordSample({
      time: now,
      rafFrameRate,
      updateFrameRate,
      maxMeasureMs,
      longTaskMs: this.longTaskDurationSinceReport,
      timerDelayMs: this.averageTimerDelayMs
    });
    this.snapshot = this.createSnapshot(rafFrameRate, updateFrameRate);
    this.notifySubscribers();
    this.resetCadence(now);
  }

  private recordSample(sample: ToolRenderProbeSample): void {
    this.samples.push(sample);

    const cutoff = sample.time - this.historyMs;

    while (this.samples.length > 0 && (this.samples[0]?.time ?? 0) < cutoff) {
      this.samples.shift();
    }
  }

  private createSnapshot(rafFrameRate: number, updateFrameRate: number): ToolRenderProbeSnapshot {
    return {
      id: this.id,
      label: this.label,
      enabled: this.enabled,
      targetFrameRate: this.targetFrameRate,
      displayFrameRateSource: this.configuredTargetFrameRate === null ? 'estimated' : 'configured',
      rafFrameRate,
      updateFrameRate,
      averageRafMs: this.averageRafMs,
      averageUpdateMs: this.averageUpdateMs,
      averageTimerDelayMs: this.averageTimerDelayMs,
      longTaskCount: this.longTaskCountSinceReport,
      longTaskMs: this.longTaskDurationSinceReport,
      measures: this.resolveTopMeasures(),
      signals: this.resolveTopSignals(),
      samples: [...this.samples]
    };
  }

  private resolveTopMeasures(): ToolRenderProbeMeasure[] {
    return [...this.measures.entries()]
      .map(([label, measure]) => ({ label, ...measure }))
      .sort((left, right) => right.averageMs - left.averageMs)
      .slice(0, 5);
  }

  private resolveTopSignals(): Array<{ label: string; count: number }> {
    return [...this.signalCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }

  private resetCadence(now: number): void {
    this.lastReportAt = now;
    this.rafFramesSinceReport = 0;
    this.updateFramesSinceReport = 0;
    this.longTaskCountSinceReport = 0;
    this.longTaskDurationSinceReport = 0;
    this.measures.clear();
    this.signalCounts.clear();
  }

  private publishSnapshot(): void {
    this.snapshot = this.createSnapshot(0, 0);
    this.notifySubscribers();
  }

  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.snapshot);
    }
  }

  private startTimerProbe(): void {
    if (!this.enabled || this.timerProbe !== null || typeof setInterval === 'undefined') {
      return;
    }

    this.lastTimerProbeAt = this.now();
    this.timerProbe = setInterval(() => {
      const now = this.now();
      const delayMs = Math.max(0, now - this.lastTimerProbeAt - this.timerIntervalMs);
      this.lastTimerProbeAt = now;
      this.averageTimerDelayMs = this.updateAverage(this.averageTimerDelayMs, delayMs, 0.16);
    }, this.timerIntervalMs);
  }

  private observeLongTasks(): void {
    if (this.longTaskObserver || typeof PerformanceObserver === 'undefined') {
      return;
    }

    if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTaskCountSinceReport += 1;
          this.longTaskDurationSinceReport += entry.duration;
        }
      });
      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      this.longTaskObserver = null;
    }
  }

  private stopRuntimeProbes(): void {
    if (this.rafFrame !== 0 && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafFrame);
    }

    this.rafFrame = 0;

    if (this.timerProbe !== null && typeof clearInterval !== 'undefined') {
      clearInterval(this.timerProbe);
    }

    this.timerProbe = null;
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
  }

  private updateAverage(current: number, value: number, weight: number): number {
    return current === 0 ? value : current * (1 - weight) + value * weight;
  }

  private now(): number {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
  }
}

export function createToolRenderProbe(options: ToolRenderProbeOptions): ToolRenderProbe {
  return new ToolRenderProbe(options);
}
