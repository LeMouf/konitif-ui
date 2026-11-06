import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { compile, preprocess } from 'svelte/compiler';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const cache = new Map();
async function surface(name) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(new URL('../src/launch/' + name + '.svelte', import.meta.url), 'utf8');
  const processed = await preprocess(source, {
    script: ({content, attributes}) => attributes.lang === 'ts'
      ? {code: ts.transpileModule(content, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText}
      : undefined,
  }, {filename: name + '.svelte'});
  let code = compile(processed.code, {generate: 'ssr', filename: name + '.svelte'}).js.code;
  const parsed = ts.createSourceFile(name + '.mjs', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  for (const statement of [...parsed.statements].reverse()) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier.text;
    assert.ok(specifier === 'svelte' || specifier === 'svelte/internal', 'Unexpected fixture dependency: ' + specifier);
    code = code.slice(0, statement.moduleSpecifier.getStart(parsed))
      + JSON.stringify(pathToFileURL(require.resolve(specifier)).href)
      + code.slice(statement.moduleSpecifier.getEnd());
  }
  const Component = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).default;
  cache.set(name, Component);
  return Component;
}

test('the delivered package exposes the shared experience adapter and header', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(manifest.exports['./launch/experienceDialogUi'], 'Missing shared experience public entry');
  assert.ok(manifest.exports['./shell/AppShellPanelVisibilityControl.svelte'], 'Missing shared header public entry');
});

test('experience dialog projects the current occurrence and close affordance passively', async () => {
  const Component = await surface('WorkbenchExperienceDialog');
  let calls = 0;
  const result = Component.render({title: 'Experience fixture', activeName: 'Motion fixture', onClose: () => { calls += 1; }});
  assert.match(result.html, /role="dialog"/);
  assert.match(result.html, /Motion fixture/);
  assert.match(result.html, /Close experiences/);
  assert.equal(calls, 0);
});

test('runtime badge preserves the host-selected active state without rewriting sections', async () => {
  const Component = await surface('WorkbenchDashboardNavigation');
  const sections = [{id: 'runtime', label: 'Runtime', badge: {label: 'Local fixture', status: 'active', description: 'Connected fixture'}}];
  const before = JSON.stringify(sections);
  const active = Component.render({active: 'runtime', sections}).html;
  assert.match(active, /data-badge-status="active"/);
  assert.match(active, /Local fixture/);
  assert.equal(JSON.stringify(sections), before);
  const selected = Component.render({active: 'runtime', sections: [{...sections[0], badge: {...sections[0].badge, status: 'selected'}}]}).html;
  assert.match(selected, /data-badge-status="selected"/);
});

test('loading projects supplied steps and time without starting work or owning a clock', async () => {
  const Component = await surface('WorkbenchExperienceLoadingDialog');
  const steps = [{label: 'Configuration fixture', status: 'ready'}, {label: 'Resources fixture', status: 'running', startedAt: 1000}];
  const before = JSON.stringify(steps);
  const result = Component.render({message: 'Opening fixture', steps, now: 5001});
  assert.match(result.html, /1 \/ 2/);
  assert.match(result.html, /Resources fixture/);
  assert.match(result.html, /4 s/);
  assert.equal(JSON.stringify(steps), before);
  const source = readFileSync(new URL('../src/launch/WorkbenchExperienceLoadingDialog.svelte', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Date\.now|performance\.now|requestAnimationFrame|setInterval/);
});

test('unsaved-work projection distinguishes staying from save and discard without effects on render', async () => {
  const Component = await surface('WorkbenchWorkspaceTransitionGuardDialog');
  let calls = 0;
  const action = () => { calls += 1; };
  const props = {open: true, workspaceModified: true, destinationLabel: 'Next fixture', onSave: action, onDiscard: action, onCancel: action};
  const result = Component.render(props).html;
  assert.match(result, /role="alertdialog"/);
  assert.match(result, /Rester dans l’expérience/);
  assert.equal(calls, 0);
  assert.doesNotMatch(Component.render({...props, open: false}).html, /role="alertdialog"/);
});

test('tags remain supplied descriptive data and escape markup during passive rendering', async () => {
  const Component = await surface('ExperienceTags');
  const tags = Object.freeze(['Motion fixture', '<script>fixture</script>']);
  let saves = 0;
  const result = Component.render({tags, onSave: () => { saves += 1; }}).html;
  assert.match(result, /Motion fixture/);
  assert.doesNotMatch(result, /<script>fixture/);
  assert.equal(saves, 0);
  assert.deepEqual(tags, ['Motion fixture', '<script>fixture</script>']);
});
