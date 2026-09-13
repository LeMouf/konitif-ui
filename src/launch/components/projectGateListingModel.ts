import type { ProjectGateContextOption, ProjectGateContextRow } from '../projectGateContext';
import type { WorkbenchTranslate } from '../../i18n/workbenchI18n';

export type ProjectGateListingSortKey = 'name' | 'date';

export type ProjectGateListingRowMeta = {
  secondary: string;
  status: string;
  statusTone: 'ready' | 'info' | 'warning' | 'muted';
  dateLabel: string;
  dateValue: number;
};

export type ProjectGateListingItem = {
  option: ProjectGateContextOption;
  meta: ProjectGateListingRowMeta;
};

const referenceTimestamp = Date.UTC(2026, 4, 24, 9, 0, 0);

export function createProjectGateListingItems(row: ProjectGateContextRow, t?: WorkbenchTranslate): ProjectGateListingItem[] {
  return row.options.map((option, index) => ({
    option,
    meta: createProjectGateListingRowMeta(option, index, t)
  }));
}

function createProjectGateListingRowMeta(option: ProjectGateContextOption, index: number, t?: WorkbenchTranslate): ProjectGateListingRowMeta {
  const dateOffsetHours = createStableOffset(option.id, index);
  const dateValue = referenceTimestamp - dateOffsetHours * 60 * 60 * 1000;

  if (option.category === 'application') {
    const environmentKey = resolveApplicationEnvironmentKey(option, index);
    const environment = translateListingStatus(environmentKey, t);

    return {
      secondary: option.project?.root ?? option.eyebrow,
      status: environment,
      statusTone: environmentKey === 'production' ? 'ready' : environmentKey === 'staging' ? 'info' : 'muted',
      dateLabel: formatRelativeOffset(dateOffsetHours, t),
      dateValue
    };
  }

  if (option.category === 'tool') {
    return {
      secondary: option.tool?.toolId ?? option.eyebrow,
      status: option.tool
        ? translate(t, 'ui.shell.launchGate.listing.status.registered', 'Registered')
        : translate(t, 'ui.shell.launchGate.listing.status.available', 'Available'),
      statusTone: 'ready',
      dateLabel: formatRelativeOffset(dateOffsetHours, t),
      dateValue
    };
  }

  if (option.category === 'widget') {
    return {
      secondary: option.widget?.id ?? option.eyebrow,
      status: option.widget?.scope === 'contextual'
        ? translate(t, 'ui.shell.launchGate.widgets.scope.contextual', 'Contextual')
        : translate(t, 'ui.shell.launchGate.widgets.scope.global', 'Global'),
      statusTone: option.widget?.scope === 'contextual' ? 'info' : 'ready',
      dateLabel: formatRelativeOffset(dateOffsetHours, t),
      dateValue
    };
  }

  if (option.category === 'poc') {
    const active = translate(t, 'ui.shell.launchGate.listing.status.active', 'Active');
    const review = translate(t, 'ui.shell.launchGate.listing.status.review', 'Review');
    const status = index % 3 === 1
      ? translate(t, 'ui.shell.launchGate.listing.status.inProgress', 'In progress')
      : index % 3 === 2 ? review : active;

    return {
      secondary: option.project?.root ?? option.quickLaunch?.id ?? option.eyebrow,
      status,
      statusTone: status === active ? 'ready' : status === review ? 'warning' : 'info',
      dateLabel: formatRelativeOffset(dateOffsetHours, t),
      dateValue
    };
  }

  return {
    secondary: option.project?.root ?? option.eyebrow,
    status: translate(t, 'ui.shell.launchGate.listing.status.ready', 'Ready'),
    statusTone: 'ready',
    dateLabel: formatRelativeOffset(dateOffsetHours, t),
    dateValue
  };
}

function resolveApplicationEnvironmentKey(option: ProjectGateContextOption, index: number): 'production' | 'staging' | 'development' {
  const signature = `${option.title} ${option.project?.root ?? ''}`.toLowerCase();

  if (signature.includes('admin') || signature.includes('dev')) {
    return 'development';
  }

  if (signature.includes('staging') || index % 4 === 2) {
    return 'staging';
  }

  return 'production';
}

function translateListingStatus(status: 'production' | 'staging' | 'development', t?: WorkbenchTranslate): string {
  if (status === 'development') {
    return translate(t, 'ui.shell.launchGate.listing.status.development', 'Development');
  }

  if (status === 'staging') {
    return translate(t, 'ui.shell.launchGate.listing.status.staging', 'Staging');
  }

  return translate(t, 'ui.shell.launchGate.listing.status.production', 'Production');
}

function createStableOffset(id: string, index: number): number {
  const signature = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return Math.max(1, (signature % 96) + index * 3);
}

function formatRelativeOffset(hours: number, t?: WorkbenchTranslate): string {
  if (hours < 24) {
    return translate(t, 'ui.shell.launchGate.listing.relativeHours', '{{count}} hour{{plural}} ago', {
      count: String(hours),
      plural: hours === 1 ? '' : 's'
    });
  }

  const days = Math.round(hours / 24);
  return translate(t, 'ui.shell.launchGate.listing.relativeDays', '{{count}} day{{plural}} ago', {
    count: String(days),
    plural: days === 1 ? '' : 's'
  });
}

function translate(
  t: WorkbenchTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, string>
): string {
  return t?.(key, { default: fallback, values }) ?? fallback;
}
