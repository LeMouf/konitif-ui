# @konitif/ui

Reusable Svelte projections, shell surfaces, themes and interaction primitives
for KONITIF Workbench applications.

## Installation

```sh
npm install @konitif/ui
```

The package publishes authored Svelte and TypeScript sources and therefore
requires Svelte-aware consumer tooling.

## What it provides

- Workbench shell, launch and project-gate surfaces.
- Workspace dashboard and experience manager for tools, widgets and connectors.
- Workspace layout, panels, stacks and tool hosts.
- Reusable controls, widgets, icons, themes and localization helpers.
- Runtime observability and technical-documentation projections.
- Public styles through `@konitif/ui/styles.css`.

## Authority boundary

UI projects contracts from `@konitif/workbench`. It does not own workspace
state, product tools, robot models, physics policy or Viewer rendering. Product
labels, workflows and policies are injected by applications. A displayed
report remains a projection of supplied evidence, not a certification computed
by the shell.

## Quick start

```svelte
<script lang="ts">
  import { WorkbenchIcon } from '@konitif/ui';
  import '@konitif/ui/styles.css';
</script>

<WorkbenchIcon icon="info" label="Information" />
```

For direct shell loading, import
`@konitif/ui/shell/AppShell.svelte`. Viewer implementations remain separate
tools mounted by the host.

## Public entry points

| Entry | Purpose |
| --- | --- |
| `@konitif/ui` | Components, stores and UI helpers. |
| `@konitif/ui/shell/AppShell.svelte` | Direct AppShell component entry. |
| `@konitif/ui/shell/theme` | Theme document contracts and projections. |
| `@konitif/ui/themes` | Reusable Svelte theme surfaces. |
| `@konitif/ui/launch/LaunchRoot.svelte` | Launch surface entry. |
| `@konitif/ui/launch/WorkspaceLaunchDashboard.svelte` | Workspace and resumable-experience selection. |
| `@konitif/ui/launch/WorkspaceExperienceComposer.svelte` | Tool, widget and connector configuration. |
| `@konitif/ui/launch/launchState` | Launch-state contracts and helpers. |
| `@konitif/ui/launch/projectGateContext` | Project-gate context contracts. |
| `@konitif/ui/i18n/workbenchLanguagePreference` | Language preference helpers. |
| `@konitif/ui/styles.css` | Public stylesheet. |

## Reference

See [`reference/`](reference/) for the machine-readable capability catalog and
authority diagrams. The catalog documents the UI surface; it is not runtime
discovery or workspace configuration.

## License

Source-available under [PolyForm Noncommercial 1.0.0](LICENSE.md), not OSI open
source. Commercial use requires separate written authorization.
