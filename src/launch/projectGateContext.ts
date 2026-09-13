import type { LaunchProjectOption } from '@konitif/workbench';

export type ProjectGateContextTone = 'self' | 'project' | 'repository' | 'tool' | 'widget' | 'poc';

export type ProjectGateQuickLaunch = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  tone: ProjectGateContextTone;
};

export type ProjectGateToolLaunch = {
  id: string;
  toolId: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  tone: ProjectGateContextTone;
  widgets?: ProjectGateToolWidgetInfo[];
};

export type ProjectGateToolWidgetInfo = {
  id: string;
  title: string;
  description: string;
  icon: string;
  scope: 'global' | 'contextual';
  defaultRegion: 'left' | 'right' | 'bottom';
  contextToolIds?: string[];
};

export type ProjectGateWidgetLaunch = ProjectGateToolWidgetInfo;

export type ProjectGateContextCategory = 'self' | 'repository' | 'application' | 'tool' | 'widget' | 'poc';

export type ProjectGateContextOption = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  tone: ProjectGateContextTone;
  category: ProjectGateContextCategory;
  project?: LaunchProjectOption;
  quickLaunch?: ProjectGateQuickLaunch;
  tool?: ProjectGateToolLaunch;
  widget?: ProjectGateWidgetLaunch;
};

export type ProjectGateContextRow = {
  id: ProjectGateContextCategory;
  title: string;
  eyebrow: string;
  icon: string;
  tone: ProjectGateContextTone;
  options: ProjectGateContextOption[];
};
