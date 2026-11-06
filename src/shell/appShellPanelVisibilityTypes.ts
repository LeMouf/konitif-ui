import type { WorkbenchIconInput } from '@konitif/workbench';

  export type AppShellExperienceMenuActions = {activeName?:string;activeVersion?:string;activeTags?:readonly string[];onSetTags?:((tags:string[])=>void|Promise<void>);saveKind?:'experience'|'layout';saveDisabled?:boolean;error?:string;onOpen:()=>void;onSave:()=>void;onSaveAs:()=>void};

  export type AppShellPanelVisibilityEntry = {
    id: string;
    label: string;
    title: string;
    active: boolean;
    icon?: WorkbenchIconInput | null;
    toolId?: string;
    toolInstanceId?: string;
  };

  export type AppShellWorkspacePresetEntry = {
    id: string;
    label: string;
    labelKey?: string;
    description?: string;
    descriptionKey?: string;
    icon?: WorkbenchIconInput;
    editable?: boolean;
  };
