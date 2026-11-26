import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compile, preprocess } from 'svelte/compiler';
import ts from 'typescript';

const filename = 'ViewerSceneLayersSurface.svelte';
const source = readFileSync(new URL('../src/scene/' + filename, import.meta.url), 'utf8');
const preprocessed = await preprocess(source, {
  script: ({ content, attributes }) => attributes.lang === 'ts' ? {
    code: ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  } : undefined
}, { filename });
const compiledSurface = compile(preprocessed.code, { generate: 'ssr', filename });
const moduleCode = compiledSurface.js.code
  .replace(/^((?:import[^\n]*?|}) from )(["'])(svelte(?:\/internal)?)\2/gm,
    (_, prefix, quote, module) => prefix + JSON.stringify(import.meta.resolve(module)))
  .replace(/import WorkbenchIcon from ['"][^'"]+['"];/, 'const WorkbenchIcon = undefined;');
const { default: Surface } = await import('data:text/javascript;base64,' + Buffer.from(moduleCode).toString('base64'));

const layer = (id, group, active, metadata = {}) => ({ id, group, active, label: id, description: '', ...metadata });
const snapshot = { canEdit: true, items: [
  layer('robot', 'scene', true),
  layer('observedRobot', 'scene', false),
  layer('physics', 'scene', true, { participatesInGroupVisibility: false }),
  layer('camera', 'scene', true, { configOnly: true }),
  layer('lighting', 'scene', false, { disabled: true }),
  layer('floor', 'visualEffects', true),
  layer('axes', 'debug', false)
] };

test('the native content starts below its header with a themeable zero top inset', () => {
  const nativeBodyRules = compiledSurface.css.code.match(/\.scene-layers__body[^{}]*\{([^{}]*)\}/)?.[1];
  assert.ok(nativeBodyRules);
  assert.match(nativeBodyRules, /padding-block-start:\s*var\(--workbench-widget-content-inset-block-start,\s*0px\)/);
  assert.match(nativeBodyRules, /padding-block-end:\s*var\(--space-12/);
  assert.match(nativeBodyRules, /padding-inline:\s*var\(--space-12/);
  for (const items of [[], snapshot.items]) {
    const { html } = Surface.render({ snapshot: { ...snapshot, items }, commands: {} });
    assert.match(html, /<\/header>\s*<div class="scene-layers__body[^"]*">\s*<p class="scene-layers__notice/);
  }
});
