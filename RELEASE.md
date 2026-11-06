# Release policy

The only admitted release authority is
`LeMouf/konitif-ui/.github/workflows/publish.yml`.

Every release must:

1. use a `v<package version>` tag pointing to a commit already contained in
   `main`;
2. pass the autonomous semantic check, boundary tests and archive verifier;
3. retain exactly the archive produced by the verifier;
4. publish that archive through the protected `npm-release` environment and
   npm Trusted Publishing with provenance;
5. keep `UI_NPM_PUBLISH_ENABLED` absent or false until the repository,
   environment and Trusted Publisher are configured.

For the initial `0.284.1` bootstrap, leave the activation variable absent while
pushing `v0.284.1`. If npm requires the scope to exist first, a local publish of
the retained archive is an explicit bootstrap exception requiring separate user
authorization. That bootstrap has no CI provenance and must not be repeated for
later versions.

Manual workflow dispatch must target the existing release tag itself and enter
the same tag in `UI_RELEASE_TAG`; dispatching from `main` is rejected.

Never publish the repository root directly, an archive produced outside the
verifier, Workbench, Viewer packages, application presets or partner code from
this repository.


Version `0.284.7` consumes Workbench root-dock projection so Shell and layout surfaces no longer duplicate root Widget discovery.

Version `0.284.8` keeps Tool dock controls visually stable when every dock is closed.

Version `0.284.10` keeps the compact dashboard empty-resume card on two columns when no preview is present, including narrow viewports.

Version `0.284.11` adds the day-cycle curve projection on the published Scene model, without retaining an evaluator in UI.

Version `0.284.12` lets the composing host supply the initial expanded scene-layer groups and items while preserving the generic defaults. Scene contracts align with the protected `0.1.1` release.

Version `0.284.13` exposes a profile-independent light tester surface. Formatting, group ordering, mirroring and preset presentation remain supplied by the host. The surface owns no engine, hardware adapter, registered profile or canonical configuration. SSR qualification exercises arbitrary identifiers and verifies passive rendering.

## Shared dashboard, dock and nodal projections

Version 0.284.14 consumes Workbench 0.285.15 for optional dashboard metadata and atomic dock intents. It declares the published Nodal 0.285.3 dependency and exposes its passive graph-reading projection. Publish Workbench 0.285.15 first and verify its registry integrity against the retained candidate before running the protected UI release. Workbench 0.285.15 is now published, and its registry archive matches the retained integrity in the UI lock.

Version 0.284.15 moves the public experience and header types into TypeScript modules so ordinary TypeScript hosts can consume them with a standard Svelte shim. The exact-archive qualification now runs both the Svelte language service and plain tsc against the public entry.

The same UI release also delivers the shared experience entry, frame, header, tag controls, tool cards, runtime badges, loading and unsaved-work dialogs that were previously consumed through a development preview. Hosts can now import these projections through public entries; persistence, authentication, resource loading and commands remain supplied by the host.
