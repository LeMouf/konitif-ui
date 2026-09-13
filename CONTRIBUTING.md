# Contributing to @konitif/ui

Consumer documentation belongs in `README.md`. Machine-readable package
documentation belongs in `reference/`; release policy, qualification evidence
and agent instructions must remain in their dedicated repository files.

Use the committed lockfile and disable lifecycle scripts during installation:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
npm run verify:package
```

Keep product policy, robot adapters and Viewer renderers outside the UI package.
Follow `RELEASE.md` for publication.
