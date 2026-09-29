import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('manifest is public, source-distributed and independent from workspace locators', () => {
  assert.equal(manifest.name, '@konitif/ui');
  assert.equal(manifest.private, false);
  assert.equal(manifest.repository.url, 'git+https://github.com/LeMouf/konitif-ui.git');
  assert.deepEqual(manifest.publishConfig, { access: 'public', registry: 'https://registry.npmjs.org/' });
  assert.deepEqual(manifest.dependencies, {
    '@types/three': '0.183.1',
    '@konitif/workbench': '0.285.11',
    svelte: '^4.2.18',
    three: '^0.183.2',
  });
  assert.deepEqual(manifest.devDependencies, {
    'svelte-check': '4.7.6',
    typescript: '5.9.3',
  });
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const version of Object.values(manifest[field] ?? {})) {
      assert.doesNotMatch(version, /^(?:workspace:|file:|link:|\.\.?[\\/])/);
    }
  }
  assert.equal(manifest.exports['./robot-viewer'], undefined);
  assert.deepEqual(manifest.files, ['LICENSE.md', 'src', 'README.md', 'package.json', 'reference']);
});

test('sources contain no product namespace or direct ownership of extracted packages', () => {
  const root = new URL('../src/', import.meta.url);
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(?:[cm]?[jt]s|svelte)$/.test(entry.name)) files.push(path);
    }
  }
  walk(fileURLToPath(root));
  const privateProductPattern = /@maxtronics\/|maxtronics|behavior-studio|Behavior Studio|\bnao(?:qi)?\b|aldebaran|softbank/i;
  const forbiddenDependencyPattern = /@konitif\/(?:tools|widgets|temporal|physics|viewer(?:-3d)?|workbench-reference-tools)(?:\/|['"])/;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, privateProductPattern, file);
    assert.doesNotMatch(source, forbiddenDependencyPattern, file);
  }
});

test('workspace catalog completion remains generic and projection-configurable', () => {
  const source = readFileSync(new URL('../src/launch/workspaceExperienceContracts.ts', import.meta.url), 'utf8');
  assert.match(source, /export function createWorkspaceExperienceWidgetCatalog\(/);
  assert.match(source, /describeDockWidget\?\(context: WorkspaceExperienceDockWidgetContext\): string/);
  assert.match(source, /scope: \x27contextual\x27/);
  assert.match(source, /contextToolIds: \[tool\.id\]/);
  assert.doesNotMatch(source, /Maxtronics|Behavior Studio|Widget interne/i);
});

test('root dock location is projected by Workbench', () => {
  const appShell = readFileSync(new URL('../src/shell/AppShell.svelte', import.meta.url), 'utf8');
  const stackNode = readFileSync(new URL('../src/layout/StackNodeView.svelte', import.meta.url), 'utf8');
  for (const source of [appShell, stackNode]) {
    assert.match(source, /resolveWorkbenchToolDockRootLocation/);
    assert.doesNotMatch(source, /function resolveWorkbenchToolDockRootLocation/);
  }
});

test('raw SVG typing is local and does not require Vite ambient types', () => {
  const declaration = readFileSync(new URL('../src/assetModules.d.ts', import.meta.url), 'utf8');
  const tsconfig = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  assert.match(declaration, /declare module '\*\.svg\?raw'/);
  assert.deepEqual(tsconfig.compilerOptions.types, ['svelte']);
});


test("root, internal and bottom widget hosts preserve a bounded height chain", () => {
  const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const appShellLayout = readSource("../src/shell/layout/AppShellMainContentLayout.svelte");
  const shellRegion = readSource("../src/shell/ShellRegion.svelte");
  const widgetDockHost = readSource("../src/widgets/WidgetDockHost.svelte");
  const widgetZoneHost = readSource("../src/widgets/WidgetZoneHost.svelte");
  const widgetPlacementHost = readSource("../src/widgets/WidgetPlacementHost.svelte");

  function assertRule(source, selector, declarations) {
    const ruleStart = source.indexOf("\n  " + selector + " {");
    assert.notEqual(ruleStart, -1, "missing CSS rule " + selector);
    const ruleEnd = source.indexOf("}", ruleStart);
    assert.notEqual(ruleEnd, -1, "unterminated CSS rule " + selector);
    const body = source.slice(ruleStart, ruleEnd);
    for (const declaration of declarations) {
      assert.ok(body.includes(declaration), selector + " must declare " + declaration);
    }
  }

  assertRule(appShellLayout, ".app-shell__body", ["min-height: 0"]);
  assertRule(appShellLayout, ".app-shell__workspace", ["min-height: 0", "overflow: hidden"]);
  assertRule(appShellLayout, ".app-shell__bottom-dock", ["grid-template-rows: auto minmax(0, 1fr)", "min-height: 0"]);

  assertRule(shellRegion, ".shell-region--bottom", ["height: 100%", "min-height: 0", "overflow: hidden"]);
  assertRule(shellRegion, ".shell-region__panel-body", ["min-height: 0", "overflow: hidden"]);
  assertRule(shellRegion, ".shell-region__widget-stack", ["height: 100%", "min-height: 0"]);
  assertRule(shellRegion, ".shell-region__widget-slot", ["min-height: 0", "overflow: hidden"]);

  assertRule(widgetDockHost, ".widget-dock-host", ["min-height: 0", "height: 100%"]);
  assertRule(widgetZoneHost, ".widget-zone-host", ["height: 100%", "max-height: 100%", "min-height: 0", "overflow: hidden"]);
  assertRule(widgetZoneHost, ".widget-zone-host__placement", ["min-height: 0", "overflow: hidden"]);
  assertRule(widgetPlacementHost, ".widget-placement-host", ["height: 100%", "max-height: 100%", "min-height: 0", "overflow: hidden"]);
  assertRule(widgetPlacementHost, ".widget-placement-host > :global(*)", ["height: 100%", "max-height: 100%", "min-height: 0"]);
});
