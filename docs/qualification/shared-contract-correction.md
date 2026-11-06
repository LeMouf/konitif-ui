# Shared contract correction — qualification

This records source qualification and local release preparation, not a publication receipt.

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

## Release preparation

Prepared versions: Workbench 0.285.15, UI 0.284.14. The UI manifest now pins Workbench 0.285.15, and the registry lock carries the integrity of its qualified candidate archive.

Workbench 0.285.15 must be published first. Confirm that the registry tarball integrity matches the retained Workbench candidate before qualifying UI against the public registry and invoking its protected release workflow. Until then, UI qualification uses that compiled archive in an isolated consumer, not sibling sources.

Neither version has been pushed, tagged or published. The live Studio and its installed dependencies remain unchanged.
