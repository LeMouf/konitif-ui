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
