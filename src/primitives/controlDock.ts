import type { WorkbenchIconInput } from '@konitif/workbench';

export type ControlDockPlacement = 'top' | 'right' | 'bottom' | 'left';
export type ControlDockOrientation = 'horizontal' | 'vertical';

export interface ControlDockMenuItem {
  id: string;
  label: string;
  icon?: WorkbenchIconInput | null;
  active?: boolean;
  disabled?: boolean;
}

export interface ControlDockItem {
  id: string;
  label: string;
  icon: WorkbenchIconInput;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  group?: string;
  menuLabel?: string;
  menuItems?: ControlDockMenuItem[];
  /** Open settings without dispatching the item's toggle action. */
  menuOnly?: boolean;
}
