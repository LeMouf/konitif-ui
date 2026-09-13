import { writable } from 'svelte/store';
import type { ShellRegionId } from '@konitif/workbench';

export const workbenchShellWidgetDragMimeType = 'application/x-workbench-shell-widget';
export const legacyShellWidgetDragMimeType = 'application/x-konitif-shell-widget';
export const shellWidgetDragMimeType = workbenchShellWidgetDragMimeType;
export const shellWidgetDragMimeTypes = [workbenchShellWidgetDragMimeType, legacyShellWidgetDragMimeType] as const;

export interface ShellWidgetDragPointer {
  x: number;
  y: number;
}

export type ShellWidgetDragSourceRegionId = ShellRegionId | 'tool-internal';

export interface ShellWidgetDragState {
  sourceRegionId: ShellWidgetDragSourceRegionId;
  widgetId: string;
  pointer: ShellWidgetDragPointer | null;
}

export const shellWidgetDragState = writable<ShellWidgetDragState | null>(null);

export function writeShellWidgetDragData(dataTransfer: DataTransfer, payload: string): void {
  dataTransfer.setData(workbenchShellWidgetDragMimeType, payload);
  dataTransfer.setData(legacyShellWidgetDragMimeType, payload);
}

export function hasShellWidgetDragData(dataTransfer: DataTransfer | null | undefined): boolean {
  const types = Array.from(dataTransfer?.types ?? []);
  return shellWidgetDragMimeTypes.some((mimeType) => types.includes(mimeType));
}

export function readShellWidgetDragData(dataTransfer: DataTransfer | null | undefined): string {
  if (!dataTransfer) {
    return '';
  }

  for (const mimeType of shellWidgetDragMimeTypes) {
    const payload = dataTransfer.getData(mimeType);

    if (payload) {
      return payload;
    }
  }

  return '';
}

export function startShellWidgetDrag(input: {
  sourceRegionId: ShellWidgetDragSourceRegionId;
  widgetId: string;
  pointer?: ShellWidgetDragPointer | null;
}): void {
  shellWidgetDragState.set({
    sourceRegionId: input.sourceRegionId,
    widgetId: input.widgetId,
    pointer: input.pointer ?? null
  });
}

export function updateShellWidgetDragPointer(pointer: ShellWidgetDragPointer | null): void {
  shellWidgetDragState.update((state) => state ? { ...state, pointer } : state);
}

export function clearShellWidgetDrag(): void {
  shellWidgetDragState.set(null);
}
