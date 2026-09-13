import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const evidence = mkdtempSync(join(tmpdir(), 'konitif-ui-package-'));
const cache = join(evidence, 'npm-cache');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

assert.equal(manifest.name, '@konitif/ui');
assert.equal(manifest.version, '0.284.2');
assert.equal(manifest.private, false);
assert.deepEqual(manifest.dependencies, {
  '@types/three': '0.183.1',
  '@konitif/workbench': '0.284.1',
  svelte: '^4.2.18',
  three: '^0.183.2',
});

const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, npm_config_offline: 'true', npm_config_cache: cache },
});

const packArgs = ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', evidence];
let output;
if (process.platform === 'win32') {
  const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  assert.ok(existsSync(npmCli), `Installed npm CLI required at ${npmCli}`);
  output = run(process.execPath, [npmCli, ...packArgs]);
} else {
  output = run('npm', packArgs);
}

const [packed] = JSON.parse(output);
const files = packed.files.map(file => file.path).sort();
for (const required of [
  'LICENSE.md',
  'README.md',
  'package.json',
  'reference/catalog.json',
  'reference/diagrams.json',
  'src/assetModules.d.ts',
  'src/index.ts',
  'src/shell/AppShell.svelte',
  'src/styles.css',
]) {
  assert.ok(files.includes(required), `Missing package file: ${required}`);
}
for (const file of files) {
  assert.doesNotMatch(file, /^(?:\.github|scripts|tests|node_modules|\.release)(?:\/|$)/);
  assert.doesNotMatch(file, /(?:^|\/)robot-viewer(?:\/|$)/);
}

const archive = join(evidence, packed.filename);
const bytes = readFileSync(archive);
assert.equal(packed.integrity, `sha512-${createHash('sha512').update(bytes).digest('base64')}`);

const packageRoot = join(evidence, 'package');
mkdirSync(packageRoot, { recursive: true });
run('tar', ['-xzf', archive, '-C', packageRoot, '--strip-components=1']);

const packageFiles = [];
function walk(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = join(directory, entry.name);
    assert.equal(lstatSync(path).isSymbolicLink(), false, `Archive contains a symbolic link: ${relative}`);
    if (entry.isDirectory()) walk(path, relative);
    else packageFiles.push(relative);
  }
}
walk(packageRoot);
assert.deepEqual(packageFiles.sort(), files);

const privateProductPattern = /@maxtronics\/|maxtronics|behavior-studio|Behavior Studio|\bnao(?:qi)?\b|aldebaran|softbank/i;
const forbiddenDependencyPattern = /@konitif\/(?:tools|widgets|temporal|physics|viewer(?:-3d)?|workbench-reference-tools)(?:\/|['"])/;
for (const file of files.filter(file => /^(?:src|reference)\//.test(file))) {
  const source = readFileSync(join(packageRoot, file), 'utf8');
  assert.doesNotMatch(source, privateProductPattern, `Private product reference in archive: ${file}`);
  if (/\.(?:[cm]?[jt]s|svelte)$/.test(file)) {
    assert.doesNotMatch(source, forbiddenDependencyPattern, `Forbidden direct package reference: ${file}`);
  }
}

for (const name of Object.keys(manifest.dependencies)) {
  const source = realpathSync(join(root, 'node_modules', name));
  const target = join(packageRoot, 'node_modules', name);
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(source, target, 'junction');
}

const tsconfig = join(packageRoot, 'tsconfig.validation.json');
writeFileSync(tsconfig, JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    resolveJsonModule: true,
    isolatedModules: true,
    verbatimModuleSyntax: true,
    noEmit: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    types: ['svelte'],
    lib: ['ES2020', 'ES2021.Promise', 'DOM', 'DOM.Iterable'],
  },
  include: ['src/**/*.ts', 'src/**/*.svelte'],
}, null, 2));
const checker = join(root, 'node_modules', 'svelte-check', 'bin', 'svelte-check');
run(process.execPath, [checker, '--workspace', packageRoot, '--tsconfig', tsconfig, '--output', 'machine'], packageRoot);

console.log(JSON.stringify({
  status: 'passed',
  name: manifest.name,
  version: manifest.version,
  integrity: packed.integrity,
  sha1: createHash('sha1').update(bytes).digest('hex'),
  sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  files: files.length,
  exports: Object.keys(manifest.exports),
  dependencies: manifest.dependencies,
  consumer: 'isolated Svelte source semantic check without Vite ambient types',
  evidence,
  archive,
}, null, 2));
