# @konitif/ui

Public Svelte UI primitives and generic Workbench surfaces for KONITIF applications.

Components consume `@konitif/workbench` contracts. Product-specific labels, workflows and policies belong in product packages.

## AppShell entry

Svelte consumers can resolve the shell through the explicit source entry:

```ts
import AppShell from '@konitif/ui/shell/AppShell.svelte';
```

This preserves the existing consumer path without exposing all internal shell
modules. It requires Svelte-aware tooling; Node resolution alone does not render
or compile the component. The root, themes and styles entries remain available.
Viewer rendering is intentionally not part of this package. This source export
is not a standalone distribution certification.

## Feature documentation contribution

`AppShell` accepts an optional `featureDocumentation` prop with `features`,
`rules` and `tests` arrays (`FeatureDocumentationContribution`, exported as a
type). The application selects these authored declarations; the shell projects
them in the documentation route and contextual footer without discovering a
repository or persisting the catalog. Replace the prop to update its projections.

Omitting it (`null`) displays an unavailable-catalog notice; supplying empty
arrays means an explicitly supplied empty catalog.

`technicalDocsDatasetLoader` supplies the three generated architecture datasets
as one group. It receives an `AbortSignal`; acquisition starts when the docs view
is mounted, not when the shell or provider is declared. A replacement provider
clears previous results and cancels the old request. Unmounting also cancels it;
late results are ignored even if a provider ignores cancellation. The view
reports unavailable, loading and error states without automatic retries.

The application owns artifact selection and validation. This contract does not
validate arbitrary JSON schemas or certify report accuracy.

`technicalDocsReports` supplies the existing typed quality and language
evaluations (`quality` and `language`, each nullable). Missing reports are
marked unavailable and do not produce coverage cards, scores or result tables.
The supplied reports retain their existing interpretation; the shell does not
recompute, validate freshness, copy or persist them. Replacing the prop updates
its projections. Artifact selection belongs to the application.

`themeDocument` supplies a normalized design-system document. Its types,
normalizer and pure projection functions are exposed by `@konitif/ui/shell/theme`.
The application selects the document; UI derives its graph, registry and sync
preview per consumer. Missing documents are marked unavailable and their editing
surfaces are hidden. The light/dark switch and persisted session overrides remain
independent and are not reset by document removal.

No repository documentation file is imported by these shell modules anymore.
This is not complete distribution certification: the candidate must still prove
semantic typing and its dependency artifacts. The candidate selector now follows
literal source imports, including erased type imports and reexports, and refuses
missing files or relative paths escaping the package. This file-closure check
does not certify ambient declarations or full Svelte component typing.
The documentation's 3D scene
also requires Three.js; selecting AppShell does not imply a graphics-free build.

From the repository, `node scripts/prepare-workbench-ui-typecheck.mjs <candidate>`
prepares a temporary copy and reports the installed Svelte checker command to
run. Preparation is not validation. The check has no workspace aliases and uses
local dependencies plus Svelte ambient types. Raw SVG imports carry their own
package declaration, so semantic checking does not depend on Vite ambient types.
JavaScript checking is enabled alongside TypeScript so scriptless Svelte
components are included. The selected candidate now passes this semantic check;
this does not certify a dependency-archive-only consumer or authorize publication.

The archive-consumer diagnostic now builds the shell with application dependencies
extracted from local archives, rejecting resolved application modules outside that
tree. `prepare-workbench-archive-consumer.mjs` emits offline packing commands;
after successful extraction, its `--finalize` mode wires only extracted packages.
`verify-workbench-archive-consumer.mjs` performs the build and boundary check.
Third-party archives are snapshots of installed packages, not registry downloads.
The compiler toolchain remains local. With `--with-types`, preparation also
archives the Three type graph and Vite's client declarations (not Vite's build
runtime). Pass `--archive-evidence=<directory>` to the typecheck preparator to
use these extracted dependencies instead of installed ones. This arrangement
now passes semantic checking; browser validation remains separate.

### Viewer renderer boundary

The reusable spatial renderer is owned and exported by
`@konitif/viewer-3d/renderer`. Robot model loading and the host application's
default experiment collector are application responsibilities; `@konitif/ui` exposes
neither a robot-viewer facade nor a second renderer authority.

`node scripts/build-viewer-renderer.mjs` creates a temporary Viewer-3D candidate,
not a release of the full UI package. From the repository,
`node scripts/prepare-viewer-declaration-consumer.mjs <renderer-package-directory>`
checks an external NodeNext consumer with the already-installed compiler.
No packages are installed or downloaded by these commands.

The public renderer declarations refer to Three types. Viewer-3D declares
`@types/three` 0.183.1 for the currently tested Three 0.183.2. Its existing
transitive dependencies are included in the consumer;
Three's JavaScript alone is insufficient.
These versions describe the tested local set, not a wider compatibility range.
The consumer also supplies the DOM standard library. The renderer never needs
to instantiate WebGL merely to check its types.

The preparator reuses installed types without installing anything. Coordinated
releases of the changed local KONITIF packages remain necessary. Passing this
consumer is not proof of package-manager installability or browser integration.

`node scripts/verify-viewer-archive-consumer.mjs` builds the Viewer-3D candidate,
packs the local KONITIF artifacts with lifecycle scripts disabled, and snapshots
the installed third-party dependencies with tar. It extracts them into a new
consumer. NodeNext checks the extracted declarations without source
aliases; a native ESM loader rejects any file resolution outside that consumer.
An explicit outside-module probe must fail. The result records archive hashes,
provenance, type diagnostics and runtime resolution evidence in a fresh temporary
directory. This is local archive qualification, not registry integrity validation,
a full UI package release or a WebGL test.

`node scripts/verify-viewer-browser-consumer.mjs <archive-evidence-directory>`
bundles a procedural-mesh fixture using only that extracted consumer and runs it
in an already-installed Chromium. It requires permission to open a temporary
localhost server. The fixture checks real WebGL drawing, resize, repeated destroy,
provider ownership and remount; page requests outside localhost are blocked.
Reports retain browser errors and GPU warnings. Physics is disabled: this does
not validate MuJoCo, product playback, detached windows or fullscreen docks.
