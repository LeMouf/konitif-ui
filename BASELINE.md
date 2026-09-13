# KONITIF UI 0.284.1 baseline

This repository is the source and release authority for `@konitif/ui`.

The package projects public Workbench contracts through reusable Svelte
surfaces. It does not own workspace state, product tools, robot models, physics,
Viewer renderers or application policies.

Baseline runtime dependencies:

- `@konitif/workbench@0.284.1`;
- `svelte@^4.2.18`;
- `three@^0.183.2` and `@types/three@0.183.1` for the optional technical
  architecture projection.

Autonomous validation uses `svelte-check@4.7.6` and `typescript@5.9.3`.
The npm payload contains authored Svelte/TypeScript sources, styles, icons,
documentation and reference catalogs. Repository tests, policies and workflows
are not part of the package archive.
