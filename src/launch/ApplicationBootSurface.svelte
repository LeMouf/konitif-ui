<script lang="ts">
  import type { ApplicationBootLifecycleProjection, ApplicationBootJournalEntry } from '@konitif/workbench';
  import { getWorkbenchTranslator, type WorkbenchTranslate } from '../i18n/workbenchI18n';

  export let projection: ApplicationBootLifecycleProjection;
  export let title = 'Application boot';
  export let subtitle = '';
  export let productVersion = '';
  const i18nT = getWorkbenchTranslator();

  $: currentStep = projection.currentStep;
  $: recentJournal = projection.journal.slice(-8);
  $: errorJournal = projection.journal.filter(
    (entry) => entry.status === 'failed' || entry.status === 'blocked'
  );
  $: errorLogPayload = formatErrorLogPayload(errorJournal, projection.blockingDiagnostics);
  $: progressLabel =
    projection.progress.kind === 'planned-steps'
      ? $i18nT('ui.shell.applicationBoot.steps', {
          default: '{{completed}} / {{total}} steps',
          values: {
            completed: projection.progress.completed,
            total: projection.progress.total
          }
        })
      : $i18nT('ui.shell.applicationBoot.planning', { default: 'Planning boot' });
  $: progressPercent =
    projection.progress.kind === 'planned-steps' && projection.progress.total > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((projection.progress.completed / projection.progress.total) * 100))
        )
      : null;
  $: progressActivityLabel = currentStep
    ? `${formatSource(currentStep.source, $i18nT)} · ${formatEntryStatus(currentStep, $i18nT)}`
    : $i18nT('ui.shell.applicationBoot.preparingPlan', { default: 'Preparing boot plan' });
  $: bootState = resolveBootState(projection.status, projection.revealReadiness.status);
  $: readinessLabel = formatReadiness(bootState, $i18nT);

  type BootSurfaceState = 'loading' | 'success' | 'blocked' | 'error';

  function resolveBootState(
    status: ApplicationBootLifecycleProjection['status'],
    readiness: ApplicationBootLifecycleProjection['revealReadiness']['status']
  ): BootSurfaceState {
    if (status === 'failed') return 'error';
    switch (readiness) {
      case 'ready':
      case 'ready_with_warnings':
      case 'safe_mode':
        return 'success';
      case 'blocked':
        return 'blocked';
      case 'unknown':
      default:
        return 'loading';
    }
  }

  function formatReadiness(status: BootSurfaceState, translate: WorkbenchTranslate): string {
    switch (status) {
      case 'success':
        return translate('ui.shell.applicationBoot.readiness.success', { default: 'Success' });
      case 'blocked':
        return translate('ui.shell.applicationBoot.readiness.blocked', { default: 'Blocked' });
      case 'error':
        return translate('ui.shell.applicationBoot.readiness.error', { default: 'Error' });
      case 'loading':
      default:
        return translate('ui.shell.applicationBoot.readiness.loading', { default: 'Loading' });
    }
  }

  function formatEntryStatus(entry: ApplicationBootJournalEntry, translate: WorkbenchTranslate): string {
    return translate(`ui.shell.applicationBoot.status.${entry.status}`, {
      default: entry.status.replace(/_/g, ' ')
    });
  }

  function formatSource(
    source: ApplicationBootJournalEntry['source'],
    translate: WorkbenchTranslate
  ): string {
    return translate(`ui.shell.applicationBoot.source.${source}`, {
      default: source.replace(/_/g, ' ')
    });
  }

  function formatPhase(
    phase: ApplicationBootLifecycleProjection['phase'],
    translate: WorkbenchTranslate
  ): string {
    return translate(`ui.shell.applicationBoot.phase.${phase}`, {
      default: phase.replace(/_/g, ' ')
    });
  }

  function formatStepMessage(entry: ApplicationBootJournalEntry, translate: WorkbenchTranslate): string {
    return translate(`ui.shell.applicationBoot.step.${entry.stepId}`, { default: entry.message });
  }

  function formatDiagnostic(diagnostic: string, translate: WorkbenchTranslate): string {
    const runtimeTimeout = diagnostic.match(/boot\.runtime\.services\.timeout:.*?(\d+)ms/i);
    if (runtimeTimeout) {
      return translate('ui.shell.applicationBoot.diagnostic.runtimeServicesTimeout', {
        default: 'Runtime services did not become ready within {{timeout}} ms.',
        values: { timeout: runtimeTimeout[1] }
      });
    }

    return diagnostic;
  }

  function formatErrorLogPayload(
    entries: readonly ApplicationBootJournalEntry[],
    diagnostics: readonly string[]
  ): string {
    const entryLogs = entries.map((entry) => {
      const timestamp = entry.completedAt ?? entry.startedAt;
      const header = [
        timestamp ? new Date(timestamp).toISOString() : 'time-unavailable',
        entry.source,
        entry.stepId,
        entry.status,
        entry.diagnosticCode ?? 'diagnostic-code-unavailable'
      ].join(' · ');
      return `${header}\n${entry.message}\n${safeStringify(entry.details)}`;
    });
    const knownMessages = new Set(entries.map((entry) => entry.message));
    const extraDiagnostics = diagnostics
      .filter((diagnostic) => !knownMessages.has(diagnostic))
      .map((diagnostic) => `diagnostic · ${diagnostic}`);
    return [...entryLogs, ...extraDiagnostics].join('\n\n');
  }

  function safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
</script>

<section
  class="application-boot-surface"
  aria-label={title}
  data-reveal-readiness={projection.revealReadiness.status}
>
  <div class="application-boot-surface__header">
    <p class="application-boot-surface__eyebrow">{formatPhase(projection.phase, $i18nT)}</p>
    <h1>{title}</h1>
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
  </div>

  <div class="application-boot-surface__status" aria-live="polite">
    <strong
      >{currentStep
        ? formatStepMessage(currentStep, $i18nT)
        : $i18nT('ui.shell.applicationBoot.waitingForPlan', { default: 'Waiting for boot plan' })}</strong
    >
    <small>{progressLabel}</small>
  </div>

  <div
    class:application-boot-surface__progress--indeterminate={progressPercent === null}
    class="application-boot-surface__progress"
    data-boot-progress-kind={projection.progress.kind}
    data-boot-progress-state={bootState}
    role="progressbar"
    aria-label={$i18nT('ui.shell.applicationBoot.resourcePreparation', {
      default: 'Workbench resource preparation'
    })}
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={progressPercent}
    aria-valuetext={progressPercent === null
      ? progressActivityLabel
      : `${progressPercent}% · ${progressActivityLabel}`}
    style={`--application-boot-progress: ${progressPercent === null ? '32%' : `${progressPercent}%`}`}
  >
    <div class="application-boot-surface__progress-track" aria-hidden="true"><span></span></div>
    <div class="application-boot-surface__progress-meta">
      <span class="application-boot-surface__progress-spinner" aria-hidden="true"></span>
      <span>{progressActivityLabel}</span>
      <strong
        >{progressPercent === null
          ? $i18nT('ui.shell.applicationBoot.working', { default: 'Working…' })
          : `${progressPercent}%`}</strong
      >
    </div>
  </div>

  <ol
    class="application-boot-surface__journal"
    aria-label={$i18nT('ui.shell.applicationBoot.journal', { default: 'Application boot journal' })}
  >
    {#each recentJournal as entry (entry.eventId)}
      <li
        class:application-boot-surface__journal-entry--active={entry === currentStep}
        data-status={entry.status}
      >
        <span>{formatSource(entry.source, $i18nT)}</span>
        <strong>{formatStepMessage(entry, $i18nT)}</strong>
        <small>{formatEntryStatus(entry, $i18nT)}</small>
      </li>
    {/each}
  </ol>

  <div class="application-boot-surface__readiness" aria-live="polite">
    <span data-boot-state={bootState}>{readinessLabel}</span>
  </div>

  {#if projection.blockingDiagnostics.length > 0}
    <div class="application-boot-surface__diagnostic" role="alert">
      {formatDiagnostic(projection.blockingDiagnostics[0], $i18nT)}
    </div>
  {/if}

  {#if errorLogPayload}
    <details class="application-boot-surface__error-log" data-boot-error-log>
      <summary>
        <span>{$i18nT('ui.shell.applicationBoot.viewErrorLogs', { default: 'View boot error logs' })}</span>
        <small
          >{$i18nT('ui.shell.applicationBoot.errorEntries', {
            default: '{{count}} error {{entry}}',
            values: {
              count: errorJournal.length,
              entry:
                errorJournal.length === 1
                  ? $i18nT('ui.shell.applicationBoot.errorEntry', { default: 'entry' })
                  : $i18nT('ui.shell.applicationBoot.errorEntriesPlural', { default: 'entries' })
            }
          })}</small
        >
      </summary>
      <pre>{errorLogPayload}</pre>
    </details>
  {/if}

  {#if productVersion}
    <div class="application-boot-surface__version">{productVersion}</div>
  {/if}
</section>

<style>
  .application-boot-surface {
    display: grid;
    min-height: 100%;
    align-content: center;
    gap: 24px;
    color: inherit;
  }

  .application-boot-surface__header,
  .application-boot-surface__status,
  .application-boot-surface__readiness,
  .application-boot-surface__diagnostic {
    max-width: min(620px, calc(100vw - 48px));
    margin-inline: auto;
    text-align: center;
  }

  .application-boot-surface__error-log {
    box-sizing: border-box;
    width: min(780px, calc(100vw - 40px));
    margin-inline: auto;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, #fca5a5 28%, transparent);
    color: #fecaca;
    background: color-mix(in srgb, #450a0a 30%, #020617);
  }

  .application-boot-surface__error-log summary {
    display: flex;
    min-height: 36px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 12px;
    cursor: pointer;
  }

  .application-boot-surface__error-log summary small {
    color: color-mix(in srgb, currentColor 62%, transparent);
    font-size: 0.72rem;
  }

  .application-boot-surface__error-log pre {
    max-height: min(30vh, 280px);
    margin: 0;
    padding: 12px;
    overflow: auto;
    border-top: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    color: #fecaca;
    background: rgba(2, 6, 23, 0.72);
    font:
      0.72rem/1.45 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
    text-align: left;
    white-space: pre-wrap;
    user-select: text;
  }

  .application-boot-surface__eyebrow {
    margin: 0 0 8px;
    color: color-mix(in srgb, currentColor 64%, transparent);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .application-boot-surface h1 {
    margin: 0;
    font-size: clamp(1.6rem, 4vw, 3rem);
    line-height: 1.05;
  }

  .application-boot-surface__header p:last-child {
    margin: 10px 0 0;
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .application-boot-surface__status {
    display: grid;
    gap: 6px;
  }

  .application-boot-surface__progress {
    display: grid;
    width: min(620px, calc(100vw - 48px));
    gap: 8px;
    margin: -8px auto 0;
  }

  .application-boot-surface__progress-track {
    position: relative;
    height: 5px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, #67e8f9 22%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, #020617 68%, transparent);
  }

  .application-boot-surface__progress-track span {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--application-boot-progress);
    overflow: hidden;
    border-radius: inherit;
    background: linear-gradient(90deg, #0891b2, #67e8f9);
    box-shadow: 0 0 14px color-mix(in srgb, #67e8f9 42%, transparent);
    transition: width 240ms ease-out;
  }

  .application-boot-surface__progress-track span::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 50%, transparent 100%);
    content: '';
    transform: translateX(-100%);
    animation: application-boot-progress-shimmer 1.35s ease-in-out infinite;
  }

  .application-boot-surface__progress--indeterminate .application-boot-surface__progress-track span {
    animation: application-boot-progress-indeterminate 1.45s ease-in-out infinite;
  }

  .application-boot-surface__progress-meta {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    color: color-mix(in srgb, currentColor 62%, transparent);
    font:
      0.72rem/1.25 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
    text-transform: uppercase;
  }

  .application-boot-surface__progress-meta > span:not(.application-boot-surface__progress-spinner) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .application-boot-surface__progress-meta strong {
    color: #a5f3fc;
    font-size: inherit;
  }

  .application-boot-surface__progress-spinner {
    width: 9px;
    aspect-ratio: 1;
    border: 1px solid color-mix(in srgb, #67e8f9 30%, transparent);
    border-top-color: #67e8f9;
    border-radius: 999px;
    animation: application-boot-progress-spin 720ms linear infinite;
  }

  .application-boot-surface__progress[data-boot-progress-state='success']
    .application-boot-surface__progress-spinner {
    border-color: #86efac;
    animation: none;
  }

  .application-boot-surface__progress[data-boot-progress-state='blocked']
    .application-boot-surface__progress-track
    span,
  .application-boot-surface__progress[data-boot-progress-state='error']
    .application-boot-surface__progress-track
    span {
    background: #fb7185;
  }

  .application-boot-surface__readiness {
    margin-top: -12px;
  }

  .application-boot-surface__readiness span {
    position: relative;
    display: inline-grid;
    min-width: 6.8rem;
    place-self: center;
    place-items: center;
    padding: 5px 12px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, #67e8f9 28%, transparent);
    border-radius: 999px;
    color: #67e8f9;
    background: color-mix(in srgb, #082f49 28%, transparent);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .application-boot-surface__readiness span::after {
    position: absolute;
    inset: 50% auto auto 50%;
    width: 10px;
    aspect-ratio: 1;
    border-radius: 999px;
    content: '';
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(1);
  }

  .application-boot-surface__readiness span[data-boot-state='loading'] {
    animation: application-boot-loading-label 1.8s ease-in-out infinite;
  }

  .application-boot-surface__readiness span[data-boot-state='success'] {
    border-color: color-mix(in srgb, #86efac 54%, transparent);
    color: #bbf7d0;
    background: color-mix(in srgb, #14532d 34%, transparent);
    animation: application-boot-success-bubble 520ms cubic-bezier(0.2, 0.9, 0.24, 1.25) both;
  }

  .application-boot-surface__readiness span[data-boot-state='success']::after {
    background: color-mix(in srgb, #86efac 34%, transparent);
    animation: application-boot-success-ring 620ms ease-out both;
  }

  .application-boot-surface__readiness span[data-boot-state='blocked'] {
    border-color: color-mix(in srgb, #fca5a5 46%, transparent);
    color: #fecaca;
    background: color-mix(in srgb, #7f1d1d 26%, transparent);
  }

  .application-boot-surface__readiness span[data-boot-state='error'] {
    border-color: color-mix(in srgb, #fb7185 62%, transparent);
    color: #fecdd3;
    background: color-mix(in srgb, #881337 34%, transparent);
  }

  .application-boot-surface__status strong {
    font-size: 1rem;
  }

  .application-boot-surface__status small,
  .application-boot-surface__journal small,
  .application-boot-surface__version {
    color: color-mix(in srgb, currentColor 58%, transparent);
    font-size: 0.78rem;
  }

  .application-boot-surface__journal {
    display: grid;
    width: min(780px, calc(100vw - 40px));
    max-height: min(34vh, 320px);
    margin: 0 auto;
    padding: 0;
    overflow: hidden;
    list-style: none;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    background: color-mix(in srgb, #020617 68%, transparent);
  }

  .application-boot-surface__journal li {
    display: grid;
    grid-template-columns: minmax(92px, 0.35fr) minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    min-height: 34px;
    padding: 7px 12px;
    border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.78rem;
  }

  .application-boot-surface__journal li:last-child {
    border-bottom: 0;
  }

  .application-boot-surface__journal span {
    color: color-mix(in srgb, currentColor 48%, transparent);
    text-transform: uppercase;
  }

  .application-boot-surface__journal strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .application-boot-surface__journal-entry--active {
    color: #e0f2fe;
    background: color-mix(in srgb, #0891b2 14%, transparent);
  }

  .application-boot-surface__journal [data-status='failed'],
  .application-boot-surface__journal [data-status='blocked'] {
    color: #fecaca;
  }

  .application-boot-surface__journal [data-status='completed_with_warnings'],
  .application-boot-surface__journal [data-status='skipped'] {
    color: #fde68a;
  }

  .application-boot-surface__diagnostic {
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, #fca5a5 34%, transparent);
    color: #fecaca;
    background: color-mix(in srgb, #7f1d1d 26%, transparent);
  }

  .application-boot-surface__version {
    position: fixed;
    right: 18px;
    bottom: 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    .application-boot-surface__readiness span,
    .application-boot-surface__readiness span::after,
    .application-boot-surface__progress-track span,
    .application-boot-surface__progress-track span::after,
    .application-boot-surface__progress-spinner {
      animation: none;
    }
  }

  @keyframes application-boot-progress-spin {
    to {
      transform: rotate(1turn);
    }
  }

  @keyframes application-boot-progress-shimmer {
    55%,
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes application-boot-progress-indeterminate {
    0% {
      left: -32%;
    }
    50%,
    100% {
      left: 100%;
    }
  }

  @keyframes application-boot-loading-label {
    0%,
    100% {
      opacity: 0.68;
      transform: translateY(0) scale(1);
    }

    50% {
      opacity: 1;
      transform: translateY(-1px) scale(1.025);
    }
  }

  @keyframes application-boot-success-bubble {
    0% {
      transform: scale(0.94);
    }

    58% {
      transform: scale(1.08);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes application-boot-success-ring {
    0% {
      opacity: 0.55;
      transform: translate(-50%, -50%) scale(0);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(9);
    }
  }
</style>
