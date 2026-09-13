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
    '@konitif/workbench': '0.284.1',
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

test('raw SVG typing is local and does not require Vite ambient types', () => {
  const declaration = readFileSync(new URL('../src/assetModules.d.ts', import.meta.url), 'utf8');
  const tsconfig = JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'));
  assert.match(declaration, /declare module '\*\.svg\?raw'/);
  assert.deepEqual(tsconfig.compilerOptions.types, ['svelte']);
});
