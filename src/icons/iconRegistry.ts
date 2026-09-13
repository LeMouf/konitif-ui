import type { WorkbenchIconInput, WorkbenchIconRef, WorkbenchIconTone } from '@konitif/workbench';
import closeSvg from './svg/close.svg?raw';
import undoSvg from './svg/undo.svg?raw';
import redoSvg from './svg/redo.svg?raw';
import menuSvg from './svg/menu.svg?raw';
import moreHorizontalSvg from './svg/more-horizontal.svg?raw';
import searchSvg from './svg/search.svg?raw';
import chevronDownSvg from './svg/chevron-down.svg?raw';
import settingsSvg from './svg/settings.svg?raw';
import pageSvg from './svg/page.svg?raw';
import folderSvg from './svg/folder.svg?raw';
import gridSvg from './svg/grid.svg?raw';
import keyboardSvg from './svg/keyboard.svg?raw';
import mouseSvg from './svg/mouse.svg?raw';
import gripSvg from './svg/grip.svg?raw';
import arrowUpSvg from './svg/arrow-up.svg?raw';
import arrowDownSvg from './svg/arrow-down.svg?raw';
import brushSvg from './svg/brush.svg?raw';
import lockSvg from './svg/lock.svg?raw';
import audioMeterSvg from './svg/audio-meter.svg?raw';
import audioMutedSvg from './svg/audio-muted.svg?raw';
import audioOnSvg from './svg/audio-on.svg?raw';
import jumpStartSvg from './svg/jump-start.svg?raw';
import previousKeySvg from './svg/previous-key.svg?raw';
import playSvg from './svg/play.svg?raw';
import pauseSvg from './svg/pause.svg?raw';
import nextKeySvg from './svg/next-key.svg?raw';
import jumpEndSvg from './svg/jump-end.svg?raw';
import loopSvg from './svg/loop.svg?raw';
import snapSvg from './svg/snap.svg?raw';
import viewportScaleSvg from './svg/viewport-scale.svg?raw';
import sidebarLeftSvg from './svg/sidebar-left.svg?raw';
import sidebarRightSvg from './svg/sidebar-right.svg?raw';
import panelTopSvg from './svg/panel-top.svg?raw';
import panelBottomSvg from './svg/panel-bottom.svg?raw';
import nodeSvg from './svg/node.svg?raw';
import timelineSvg from './svg/timeline.svg?raw';
import toolViewerSvg from './svg/tool-viewer.svg?raw';
import toolNodalSvg from './svg/tool-nodal.svg?raw';
import toolTimelineSvg from './svg/tool-timeline.svg?raw';
import eyeSvg from './svg/eye.svg?raw';
import eyeOffSvg from './svg/eye-off.svg?raw';
import audioSvg from './svg/audio.svg?raw';
import inspectorSvg from './svg/inspector.svg?raw';
import notesSvg from './svg/notes.svg?raw';
import atomSvg from './svg/atom.svg?raw';
import organismSvg from './svg/organism.svg?raw';
import engineSvg from './svg/engine.svg?raw';
import successSvg from './svg/success.svg?raw';
import warningSvg from './svg/warning.svg?raw';
import errorSvg from './svg/error.svg?raw';
import fullscreenSvg from './svg/fullscreen.svg?raw';
import fullscreenExitSvg from './svg/fullscreen-exit.svg?raw';
import deviceDesktopSvg from './svg/device-desktop.svg?raw';
import deviceTabletSvg from './svg/device-tablet.svg?raw';
import deviceMobileSvg from './svg/device-mobile.svg?raw';
import orientationLandscapeSvg from './svg/orientation-landscape.svg?raw';
import orientationPortraitSvg from './svg/orientation-portrait.svg?raw';
import splitHorizontalSvg from './svg/split-horizontal.svg?raw';
import splitVerticalSvg from './svg/split-vertical.svg?raw';
import joinSvg from './svg/join.svg?raw';
import swapSvg from './svg/swap.svg?raw';
import detachSvg from './svg/detach.svg?raw';
import headerSvg from './svg/header.svg?raw';
import focusSvg from './svg/focus.svg?raw';
import clearSvg from './svg/clear.svg?raw';
import copySvg from './svg/copy.svg?raw';
import addSvg from './svg/add.svg?raw';
import resetSvg from './svg/reset.svg?raw';
import wrenchSvg from './svg/wrench.svg?raw';
import lightbulbSvg from './svg/lightbulb.svg?raw';
import infoSvg from './svg/info.svg?raw';
import dialogueSvg from './svg/dialogue.svg?raw';
import paletteSvg from './svg/palette.svg?raw';

export type WorkbenchIconId =
  | 'app.product-shell'
  | 'action.close'
  | 'action.undo'
  | 'action.redo'
  | 'action.menu'
  | 'action.more-horizontal'
  | 'action.search'
  | 'action.settings'
  | 'action.folder'
  | 'action.lightbulb'
  | 'action.info'
  | 'action.conversation'
  | 'action.evidence'
  | 'action.language'
  | 'action.palette'
  | 'action.chevron-down'
  | 'action.split-horizontal'
  | 'action.split-vertical'
  | 'action.fullscreen'
  | 'action.fullscreen-exit'
  | 'action.join'
  | 'action.swap'
  | 'action.detach'
  | 'action.header'
  | 'action.reset'
  | 'action.focus'
  | 'action.clear'
  | 'action.copy'
  | 'action.add'
  | 'action.visibility'
  | 'action.visibility-off'
  | 'action.command'
  | 'action.command-palette'
  | 'action.keyboard'
  | 'action.mouse'
  | 'action.grip'
  | 'action.arrow-up'
  | 'action.arrow-down'
  | 'action.brush'
  | 'action.lock'
  | 'action.audio-meter'
  | 'action.audio-on'
  | 'action.audio-muted'
  | 'action.jump-start'
  | 'action.previous-key'
  | 'action.play'
  | 'action.pause'
  | 'action.next-key'
  | 'action.jump-end'
  | 'action.loop'
  | 'action.snap'
  | 'action.viewport-scale'
  | 'action.device-desktop'
  | 'action.device-tablet'
  | 'action.device-mobile'
  | 'action.orientation-landscape'
  | 'action.orientation-portrait'
  | 'layout.sidebar-left'
  | 'layout.sidebar-right'
  | 'layout.panel-stack'
  | 'layout.panel-top'
  | 'layout.panel-bottom'
  | 'tool.viewer'
  | 'tool.timeline'
  | 'tool.nodal'
  | 'tool.audio'
  | 'tool.inspector'
  | 'tool.notes'
  | 'tool.lab'
  | 'tool.wrench'
  | 'tool.feature-explorer'
  | 'tool.design-chronicle'
  | 'tool.component-assembly'
  | 'tool.manifest'
  | 'tool.welcome'
  | 'tool.runtime-json'
  | 'widget.audio'
  | 'widget.inspector'
  | 'widget.notes'
  | 'widget.timeline'
  | 'widget.masonry'
  | 'widget.layout'
  | 'docs.page'
  | 'docs.registry'
  | 'design.atom'
  | 'design.molecule'
  | 'design.organism'
  | 'design.template'
  | 'design.token'
  | 'runtime.engine'
  | 'runtime.projection'
  | 'status.success'
  | 'status.warning'
  | 'status.error';

export interface WorkbenchIconDefinition {
  id: WorkbenchIconId;
  title: string;
  category: 'action' | 'app' | 'design' | 'docs' | 'runtime' | 'status' | 'tool' | 'widget';
  tone: WorkbenchIconTone;
  svg: string;
  designNodeId?: string;
}

const svg = {
  close: closeSvg,
  undo: undoSvg,
  redo: redoSvg,
  menu: menuSvg,
  moreHorizontal: moreHorizontalSvg,
  search: searchSvg,
  chevronDown: chevronDownSvg,
  settings: settingsSvg,
  page: pageSvg,
  folder: folderSvg,
  grid: gridSvg,
  keyboard: keyboardSvg,
  mouse: mouseSvg,
  grip: gripSvg,
  arrowUp: arrowUpSvg,
  arrowDown: arrowDownSvg,
  brush: brushSvg,
  lock: lockSvg,
  audioMeter: audioMeterSvg,
  audioMuted: audioMutedSvg,
  audioOn: audioOnSvg,
  jumpStart: jumpStartSvg,
  previousKey: previousKeySvg,
  play: playSvg,
  pause: pauseSvg,
  nextKey: nextKeySvg,
  jumpEnd: jumpEndSvg,
  loop: loopSvg,
  snap: snapSvg,
  viewportScale: viewportScaleSvg,
  sidebarLeft: sidebarLeftSvg,
  sidebarRight: sidebarRightSvg,
  panelTop: panelTopSvg,
  panelBottom: panelBottomSvg,
  node: nodeSvg,
  timeline: timelineSvg,
  toolViewer: toolViewerSvg,
  toolNodal: toolNodalSvg,
  toolTimeline: toolTimelineSvg,
  eye: eyeSvg,
  eyeOff: eyeOffSvg,
  audio: audioSvg,
  inspector: inspectorSvg,
  notes: notesSvg,
  atom: atomSvg,
  organism: organismSvg,
  engine: engineSvg,
  success: successSvg,
  warning: warningSvg,
  error: errorSvg,
  fullscreen: fullscreenSvg,
  fullscreenExit: fullscreenExitSvg,
  deviceDesktop: deviceDesktopSvg,
  deviceTablet: deviceTabletSvg,
  deviceMobile: deviceMobileSvg,
  orientationLandscape: orientationLandscapeSvg,
  orientationPortrait: orientationPortraitSvg,
  splitHorizontal: splitHorizontalSvg,
  splitVertical: splitVerticalSvg,
  join: joinSvg,
  swap: swapSvg,
  detach: detachSvg,
  header: headerSvg,
  focus: focusSvg,
  clear: clearSvg,
  copy: copySvg,
  add: addSvg,
  reset: resetSvg,
  wrench: wrenchSvg,
  lightbulb: lightbulbSvg,
  info: infoSvg,
  dialogue: dialogueSvg,
  palette: paletteSvg
};

const definitions: WorkbenchIconDefinition[] = [
  { id: 'app.product-shell', title: 'Product Shell', category: 'app', tone: 'shared', svg: svg.grid, designNodeId: 'layout.app-shell' },
  { id: 'action.close', title: 'Close', category: 'action', tone: 'default', svg: svg.close, designNodeId: 'iconography.action-icons' },
  { id: 'action.undo', title: 'Undo', category: 'action', tone: 'default', svg: svg.undo, designNodeId: 'iconography.action-icons' },
  { id: 'action.redo', title: 'Redo', category: 'action', tone: 'default', svg: svg.redo, designNodeId: 'iconography.action-icons' },
  { id: 'action.menu', title: 'Menu', category: 'action', tone: 'default', svg: svg.menu, designNodeId: 'iconography.action-icons' },
  { id: 'action.more-horizontal', title: 'More Horizontal', category: 'action', tone: 'default', svg: svg.moreHorizontal, designNodeId: 'iconography.action-icons' },
  { id: 'action.search', title: 'Search', category: 'action', tone: 'default', svg: svg.search, designNodeId: 'iconography.action-icons' },
  { id: 'action.settings', title: 'Settings', category: 'action', tone: 'default', svg: svg.settings, designNodeId: 'iconography.action-icons' },
  { id: 'action.folder', title: 'Folder', category: 'action', tone: 'default', svg: svg.folder, designNodeId: 'iconography.action-icons' },
  { id: 'action.lightbulb', title: 'Lightbulb', category: 'action', tone: 'default', svg: svg.lightbulb, designNodeId: 'iconography.action-icons' },
  { id: 'action.info', title: 'Information', category: 'action', tone: 'default', svg: svg.info, designNodeId: 'iconography.action-icons' },
  { id: 'action.conversation', title: 'Conversation', category: 'action', tone: 'default', svg: svg.dialogue, designNodeId: 'iconography.action-icons' },
  { id: 'action.evidence', title: 'Evidence', category: 'action', tone: 'default', svg: svg.inspector, designNodeId: 'iconography.action-icons' },
  { id: 'action.language', title: 'Language', category: 'action', tone: 'default', svg: svg.dialogue, designNodeId: 'iconography.action-icons' },
  { id: 'action.palette', title: 'Palette', category: 'action', tone: 'design', svg: svg.palette, designNodeId: 'iconography.action-icons' },
  { id: 'action.chevron-down', title: 'Chevron Down', category: 'action', tone: 'default', svg: svg.chevronDown, designNodeId: 'iconography.action-icons' },
  { id: 'action.split-horizontal', title: 'Split Horizontal', category: 'action', tone: 'default', svg: svg.splitHorizontal, designNodeId: 'iconography.action-icons' },
  { id: 'action.split-vertical', title: 'Split Vertical', category: 'action', tone: 'default', svg: svg.splitVertical, designNodeId: 'iconography.action-icons' },
  { id: 'action.fullscreen', title: 'Fullscreen', category: 'action', tone: 'default', svg: svg.fullscreen, designNodeId: 'iconography.action-icons' },
  { id: 'action.fullscreen-exit', title: 'Exit Fullscreen', category: 'action', tone: 'default', svg: svg.fullscreenExit, designNodeId: 'iconography.action-icons' },
  { id: 'action.join', title: 'Join', category: 'action', tone: 'default', svg: svg.join, designNodeId: 'iconography.action-icons' },
  { id: 'action.swap', title: 'Swap', category: 'action', tone: 'default', svg: svg.swap, designNodeId: 'iconography.action-icons' },
  { id: 'action.detach', title: 'Detach', category: 'action', tone: 'default', svg: svg.detach, designNodeId: 'iconography.action-icons' },
  { id: 'action.header', title: 'Header', category: 'action', tone: 'default', svg: svg.header, designNodeId: 'iconography.action-icons' },
  { id: 'action.reset', title: 'Reset', category: 'action', tone: 'default', svg: svg.reset, designNodeId: 'iconography.action-icons' },
  { id: 'action.focus', title: 'Focus', category: 'action', tone: 'default', svg: svg.focus, designNodeId: 'iconography.action-icons' },
  { id: 'action.clear', title: 'Clear', category: 'action', tone: 'danger', svg: svg.clear, designNodeId: 'iconography.action-icons' },
  { id: 'action.copy', title: 'Copy', category: 'action', tone: 'default', svg: svg.copy, designNodeId: 'iconography.action-icons' },
  { id: 'action.add', title: 'Add', category: 'action', tone: 'action', svg: svg.add, designNodeId: 'iconography.action-icons' },
  { id: 'action.visibility', title: 'Visibility', category: 'action', tone: 'default', svg: svg.eye, designNodeId: 'iconography.action-icons' },
  { id: 'action.visibility-off', title: 'Visibility Off', category: 'action', tone: 'default', svg: svg.eyeOff, designNodeId: 'iconography.action-icons' },
  { id: 'action.command', title: 'Command', category: 'action', tone: 'default', svg: svg.menu, designNodeId: 'iconography.action-icons' },
  { id: 'action.command-palette', title: 'Command Palette', category: 'action', tone: 'default', svg: svg.grid, designNodeId: 'iconography.action-icons' },
  { id: 'action.keyboard', title: 'Keyboard', category: 'action', tone: 'default', svg: svg.keyboard, designNodeId: 'iconography.action-icons' },
  { id: 'action.mouse', title: 'Mouse', category: 'action', tone: 'default', svg: svg.mouse, designNodeId: 'iconography.action-icons' },
  { id: 'action.grip', title: 'Grip', category: 'action', tone: 'default', svg: svg.grip, designNodeId: 'iconography.action-icons' },
  { id: 'action.arrow-up', title: 'Arrow Up', category: 'action', tone: 'default', svg: svg.arrowUp, designNodeId: 'iconography.action-icons' },
  { id: 'action.arrow-down', title: 'Arrow Down', category: 'action', tone: 'default', svg: svg.arrowDown, designNodeId: 'iconography.action-icons' },
  { id: 'action.brush', title: 'Brush', category: 'action', tone: 'action', svg: svg.brush, designNodeId: 'iconography.action-icons' },
  { id: 'action.lock', title: 'Lock', category: 'action', tone: 'default', svg: svg.lock, designNodeId: 'iconography.action-icons' },
  { id: 'action.audio-meter', title: 'Audio Meter', category: 'action', tone: 'default', svg: svg.audioMeter, designNodeId: 'iconography.action-icons' },
  { id: 'action.audio-on', title: 'Audio On', category: 'action', tone: 'default', svg: svg.audioOn, designNodeId: 'iconography.action-icons' },
  { id: 'action.audio-muted', title: 'Audio Muted', category: 'action', tone: 'default', svg: svg.audioMuted, designNodeId: 'iconography.action-icons' },
  { id: 'action.jump-start', title: 'Jump To Start', category: 'action', tone: 'default', svg: svg.jumpStart, designNodeId: 'iconography.action-icons' },
  { id: 'action.previous-key', title: 'Previous Key', category: 'action', tone: 'default', svg: svg.previousKey, designNodeId: 'iconography.action-icons' },
  { id: 'action.play', title: 'Play', category: 'action', tone: 'default', svg: svg.play, designNodeId: 'iconography.action-icons' },
  { id: 'action.pause', title: 'Pause', category: 'action', tone: 'default', svg: svg.pause, designNodeId: 'iconography.action-icons' },
  { id: 'action.next-key', title: 'Next Key', category: 'action', tone: 'default', svg: svg.nextKey, designNodeId: 'iconography.action-icons' },
  { id: 'action.jump-end', title: 'Jump To End', category: 'action', tone: 'default', svg: svg.jumpEnd, designNodeId: 'iconography.action-icons' },
  { id: 'action.loop', title: 'Loop', category: 'action', tone: 'default', svg: svg.loop, designNodeId: 'iconography.action-icons' },
  { id: 'action.snap', title: 'Snap', category: 'action', tone: 'default', svg: svg.snap, designNodeId: 'iconography.action-icons' },
  { id: 'action.viewport-scale', title: 'Viewport Scale', category: 'action', tone: 'default', svg: svg.viewportScale, designNodeId: 'iconography.action-icons' },
  { id: 'action.device-desktop', title: 'Desktop Viewport', category: 'action', tone: 'default', svg: svg.deviceDesktop, designNodeId: 'iconography.action-icons' },
  { id: 'action.device-tablet', title: 'Tablet Viewport', category: 'action', tone: 'default', svg: svg.deviceTablet, designNodeId: 'iconography.action-icons' },
  { id: 'action.device-mobile', title: 'Mobile Viewport', category: 'action', tone: 'default', svg: svg.deviceMobile, designNodeId: 'iconography.action-icons' },
  { id: 'action.orientation-landscape', title: 'Landscape Orientation', category: 'action', tone: 'default', svg: svg.orientationLandscape, designNodeId: 'iconography.action-icons' },
  { id: 'action.orientation-portrait', title: 'Portrait Orientation', category: 'action', tone: 'default', svg: svg.orientationPortrait, designNodeId: 'iconography.action-icons' },
  { id: 'layout.sidebar-left', title: 'Left Sidebar', category: 'action', tone: 'default', svg: svg.sidebarLeft, designNodeId: 'layout.app-shell' },
  { id: 'layout.sidebar-right', title: 'Right Sidebar', category: 'action', tone: 'default', svg: svg.sidebarRight, designNodeId: 'layout.app-shell' },
  { id: 'layout.panel-stack', title: 'Panel Stack', category: 'action', tone: 'default', svg: svg.grid, designNodeId: 'layout.panel-stack' },
  { id: 'layout.panel-top', title: 'Top Panel', category: 'action', tone: 'default', svg: svg.panelTop, designNodeId: 'layout.app-shell' },
  { id: 'layout.panel-bottom', title: 'Bottom Panel', category: 'action', tone: 'default', svg: svg.panelBottom, designNodeId: 'layout.app-shell' },
  { id: 'tool.viewer', title: 'Viewer', category: 'tool', tone: 'product', svg: svg.toolViewer, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.timeline', title: 'Timeline', category: 'tool', tone: 'runtime', svg: svg.toolTimeline, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.nodal', title: 'Nodal Workflow', category: 'tool', tone: 'runtime', svg: svg.toolNodal, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.audio', title: 'Audio', category: 'tool', tone: 'runtime', svg: svg.audio, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.inspector', title: 'Inspector', category: 'tool', tone: 'shared', svg: svg.inspector, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.notes', title: 'Notes', category: 'tool', tone: 'shared', svg: svg.notes, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.lab', title: 'Lab', category: 'tool', tone: 'runtime', svg: svg.settings, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.wrench', title: 'Wrench', category: 'tool', tone: 'runtime', svg: svg.wrench, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.feature-explorer', title: 'Feature Explorer', category: 'tool', tone: 'design', svg: svg.organism, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.design-chronicle', title: 'Design Chronicle', category: 'tool', tone: 'design', svg: svg.timeline, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.component-assembly', title: 'Component Assembly', category: 'tool', tone: 'template', svg: svg.grid, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.manifest', title: 'Manifest', category: 'tool', tone: 'shared', svg: svg.page, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.welcome', title: 'Welcome', category: 'tool', tone: 'product', svg: svg.grid, designNodeId: 'iconography.tool-glyphs' },
  { id: 'tool.runtime-json', title: 'Runtime JSON', category: 'tool', tone: 'runtime', svg: svg.page, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.audio', title: 'Audio Widget', category: 'widget', tone: 'runtime', svg: svg.audio, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.inspector', title: 'Inspector Widget', category: 'widget', tone: 'shared', svg: svg.inspector, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.notes', title: 'Notes Widget', category: 'widget', tone: 'shared', svg: svg.notes, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.timeline', title: 'Timeline Widget', category: 'widget', tone: 'runtime', svg: svg.timeline, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.masonry', title: 'Masonry Widget', category: 'widget', tone: 'template', svg: svg.grid, designNodeId: 'iconography.tool-glyphs' },
  { id: 'widget.layout', title: 'Layout Widget', category: 'widget', tone: 'template', svg: svg.splitHorizontal, designNodeId: 'iconography.tool-glyphs' },
  { id: 'docs.page', title: 'Docs Page', category: 'docs', tone: 'product', svg: svg.page, designNodeId: 'iconography.tool-glyphs' },
  { id: 'docs.registry', title: 'Registry', category: 'docs', tone: 'shared', svg: svg.inspector, designNodeId: 'iconography.tool-glyphs' },
  { id: 'design.atom', title: 'Atom', category: 'design', tone: 'design', svg: svg.atom, designNodeId: 'iconography.action-icons' },
  { id: 'design.molecule', title: 'Molecule', category: 'design', tone: 'design', svg: svg.node, designNodeId: 'iconography.action-icons' },
  { id: 'design.organism', title: 'Organism', category: 'design', tone: 'design', svg: svg.organism, designNodeId: 'iconography.action-icons' },
  { id: 'design.template', title: 'Template', category: 'design', tone: 'template', svg: svg.grid, designNodeId: 'iconography.action-icons' },
  { id: 'design.token', title: 'Token', category: 'design', tone: 'design', svg: svg.atom, designNodeId: 'iconography.action-icons' },
  { id: 'runtime.engine', title: 'Engine', category: 'runtime', tone: 'runtime', svg: svg.engine, designNodeId: 'iconography.tool-glyphs' },
  { id: 'runtime.projection', title: 'Runtime Projection', category: 'runtime', tone: 'runtime', svg: svg.page, designNodeId: 'iconography.tool-glyphs' },
  { id: 'status.success', title: 'Success', category: 'status', tone: 'default', svg: svg.success, designNodeId: 'iconography.action-icons' },
  { id: 'status.warning', title: 'Warning', category: 'status', tone: 'default', svg: svg.warning, designNodeId: 'iconography.action-icons' },
  { id: 'status.error', title: 'Error', category: 'status', tone: 'danger', svg: svg.error, designNodeId: 'iconography.action-icons' }
];

export const workbenchIconRegistry = new Map<WorkbenchIconId, WorkbenchIconDefinition>(
  definitions.map((definition) => [definition.id, definition])
);

export function listWorkbenchIcons(): WorkbenchIconDefinition[] {
  return definitions;
}

export function resolveWorkbenchIconDefinition(icon: WorkbenchIconInput | null | undefined): WorkbenchIconDefinition | null {
  const iconId = typeof icon === 'string' ? icon : icon?.id;

  if (!iconId) {
    return null;
  }

  return workbenchIconRegistry.get(iconId as WorkbenchIconId) ?? null;
}

export function normalizeWorkbenchIconRef(
  icon: WorkbenchIconInput | null | undefined,
  fallbackLabel = ''
): WorkbenchIconRef | null {
  if (!icon) {
    return null;
  }

  if (typeof icon === 'string') {
    const definition = workbenchIconRegistry.get(icon as WorkbenchIconId);

    return definition
      ? { id: definition.id, label: definition.title, tone: definition.tone }
      : { id: icon, label: fallbackLabel, fallback: icon };
  }

  return icon;
}
