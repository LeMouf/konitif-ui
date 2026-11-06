# Shared contract correction — qualification

This records source qualification before release version selection, not a publication receipt.

## Changes

- Workbench exposes optional dashboard revision labels, descriptive tags and host-projected save availability. Entry identity remains `id` and `selection`.
- Tool dock visibility is an optional host intent. Existing hosts remain compatible.
- UI declares its actual `@konitif/nodal@0.285.3` dependency and complete registry lock closure, reusing the version already installed in the Studio.
- The public nodal surface projects a supplied graph; passive rendering neither mutates it nor issues host commands.
- Source-import and lock-closure checks detect undeclared dependencies.

## Evidence

- Workbench build, 51 tests and exact compiled archive verification passed.
- Its isolated native ESM / strict NodeNext consumer checks legacy hosts and optional metadata / dock intents.
- UI semantic validation: zero errors and zero warnings.
- UI: 48 tests passed, including the dependency and lock-closure guards.
- Exact UI source archive: 337 files; isolated semantic validation and passive nodal server rendering passed with native ESM resolution.
- The consumer used the corrected compiled Workbench archive and already-installed registry dependencies. No product source aliases, dependency installations or downloads were introduced.

## Release prerequisites

The corrected Workbench candidate still bears development manifest version `0.285.14`; it is **not** the registry artifact of that version.
Likewise the UI candidate still bears `0.284.13`, pending release preparation.

Publish a new Workbench version first, then pin that published version in UI and refresh its registry lock before UI release qualification.
Never republish these existing version numbers or install a sibling source path as the delivered dependency.

The live Studio and its installed dependencies were not changed. No push, tag or publication was performed.
