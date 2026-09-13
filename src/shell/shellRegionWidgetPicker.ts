import type { ShellRegionId, ShellWidgetPlacement, WorkbenchIconInput } from '@konitif/workbench';

export interface ShellRegionEmptyCandidate {
  id: string;
  title: string;
  description: string;
  icon?: WorkbenchIconInput;
  relevance: 'contextual' | 'available' | 'unavailable';
  reason?: string;
}

export interface ShellRegionEmptyPickerAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ShellRegionEmptyPickerRequest {
  regionId: ShellRegionId;
  candidates: ShellRegionEmptyCandidate[];
  anchorRect: ShellRegionEmptyPickerAnchor;
  triggerRect: ShellRegionEmptyPickerAnchor;
  placement?: ShellWidgetPlacement;
}

export function refreshShellRegionEmptyPickerCandidates(
  request: ShellRegionEmptyPickerRequest | null,
  regionId: ShellRegionId,
  candidates: ShellRegionEmptyCandidate[]
): ShellRegionEmptyPickerRequest | null {
  if (!request || request.regionId !== regionId) {
    return request;
  }

  return {
    ...request,
    candidates
  };
}
