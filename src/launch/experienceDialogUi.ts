import type { ToolDefinition, WorkbenchDashboardEntry, WorkspacePresetArtifact } from '@konitif/workbench';
import type { ComponentType, SvelteComponent } from 'svelte';
import type { WorkbenchToolCatalogEntry } from './toolCatalogLayout';

import type { ExperienceLoadingStep as SharedExperienceLoadingStep } from './WorkbenchExperienceLoadingDialog.svelte';
export type ExperienceLoadingStep = SharedExperienceLoadingStep;
export type ExperienceLoadingSurface = ComponentType<SvelteComponent<{ message?: string; steps?: readonly ExperienceLoadingStep[]; now?: number; onCancel?: (() => void) | null }>>;
export type ExtensionCatalogSurface = ComponentType<SvelteComponent<{ tools: readonly ToolDefinition[]; storageKey: string }>>;
/** Extension acquisition is unavailable until an admitted host contract is supplied. */
export const ExtensionCatalog: ExtensionCatalogSurface | null = null;
export type ComposerNavigationBranch = { id: string; label: string; count?: number; steps?: readonly { id: string; label: string; disabled?: boolean }[] };
export type ComposerNavigationSurface = ComponentType<SvelteComponent<{
  label: string;
  branches?: readonly ComposerNavigationBranch[];
  activeBranch?: string | null;
  activeStep?: string | null;
  onSelectBranch: (id: string) => void;
  onSelectStep: (id: string) => void;
}>>;
export type ToolCatalogCard = WorkbenchToolCatalogEntry;
export type ToolUsageItem = { id: string; title: string; revisionId: string; recordedAt?: string; version?: string };
export type ExperienceLayoutRoot = WorkspacePresetArtifact['workspaceSession']['workspace']['windows'][number]['root'];
export type ExperienceLayoutEntry<Selection = unknown> = WorkbenchDashboardEntry<Selection> & { layoutPreviewRoot?: ExperienceLayoutRoot; savedRevisionId?: string };

export { default as ComposerNavigation } from './WorkspaceExperienceComposerNavigation.svelte';
export { default as ToolCatalogCards } from './WorkbenchToolCatalogCards.svelte';
export { default as ExperienceShareDialog } from '../sharing/ExperienceShareDialog.svelte';
export const supportsShareProfileSelection = true;
export const supportsDashboardTabBadges = true;
export { default as ExperienceDialog } from './WorkbenchExperienceDialog.svelte';
export { default as UserDataPanel } from './WorkbenchUserDataPanel.svelte';
export const supportsAccountContent = true;
export { default as DashboardNavigation } from './WorkbenchDashboardNavigation.svelte';
export { default as ActionDiagnostics } from './WorkbenchActionDiagnostics.svelte';
export { default as DashboardContent } from './WorkspaceLaunchDashboard.svelte';
export { renderWorkbenchExperienceLayoutPreview } from './experienceLayoutPreview';
export { default as ExperienceLoadingDialog } from './WorkbenchExperienceLoadingDialog.svelte';
export { default as WorkspaceTransitionGuardDialog } from './WorkbenchWorkspaceTransitionGuardDialog.svelte';
