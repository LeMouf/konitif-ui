# Experience UI delivery qualification

The Studio development preview supplied experience projections that were absent from the autonomous public UI package. The producer/consumer boundary is now explicit: UI owns the shared frame, header, dashboard presentation, tag editor, tool catalogue cards, loading and unsaved-work dialogs. Workbench owns the supplied workspace and experience contracts. The host retains persistence, authentication, command admission, resource loading and playback time.

The transferred closure comprises the shared experience entry, its header and their required leaf projections. Existing canonical dependencies and unrelated package components were preserved; existing translation values were preserved while missing messages were added. No product module, hosted robot profile, backend adapter or platform source was vendored into UI.

The public entry is `@konitif/ui/launch/experienceDialogUi`. Its portable component types preserve host callbacks and Svelte defaults. Loading-step states are shared with the loading component rather than repeated as incompatible constructor types. The header is also available at the explicit public Svelte entry.

Evidence:
- The six delivery tests first reproduced the missing public entry and projections.
- 54 package tests passed, including passive rendering, supplied runtime badges, loading steps, escaped tag content and unsaved-work choices.
- The semantic check passed with zero errors and warnings.
- The exact archive passed an isolated consumer importing the public experience and header entries against published Workbench 0.285.15, plus the existing nodal SSR consumer.
- The official Svelte analyzer reported no issues for the transferred components. Svelte 5 migration suggestions are not applied to this Svelte 4 package.
- The Studio must replace its preview adapter with the public entry and use published dependency pins. User data and experience identities are unchanged.

The UI version remains 0.284.14 because that version has not yet been tagged or published. Publication still uses the protected workflow after the completed source is integrated into main. Extension acquisition remains an explicitly unavailable host surface until its public admission contract is supplied; this preserves the existing preview behavior.
