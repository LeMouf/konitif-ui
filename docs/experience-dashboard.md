# Common experience dashboard

WorkspaceLaunchDashboard owns the common experience cards and launch/import interactions. WorkbenchDashboardNavigation supplies vertical keyboard-accessible contexts; the host composes Experiments, Tools, Widgets, Connections, Preferences and User without another experience repository. WorkbenchUserDataPanel renders a host-declared WorkbenchUserDataProjection and routes only supported requests to its provider.

The local PoC is an adapter: it projects its existing repository and Tool/widget/connector catalogs. Preference controls remain owned by the existing Workbench shell. SSO and cloud are explicitly unavailable in this host; the User panel never creates a mock login or mock deletion operation.

The common visual surface uses theme tokens, sober cards, content previews and distinct start/resume groups. embedded adapts the dashboard to an enclosing dialog; showLibrary=false delegates catalogs to separate navigation contexts. labelOverrides customizes vocabulary without forking behavior.

ExperienceShareDialog captures one declared profile and renders a portable PNG. ExperienceTransferDrop routes shared MIME payloads and experience JSON/PNG files through supplied admission ports. AppShell exposes optional callbacks for Share experience and Import experience in its layout menu. A product supplies policy and provider adapters; it does not copy card transport, dashboard behavior or data ownership into product-specific authorities.

Current source integration is characterized in workbench-demo. Existing published UI consumers still require release sequencing and provider migration. The current public UI dependency pin predates the new core exports; no registry publication or dependency installation was performed.
