# Architecture — Repository Tooling

The meta-repo orchestration: installation, build, delivery, playgrounds, and the root
files that wire them. Spec: [packaging.spec.md](../specs/packaging.spec.md).

## Cartography

| Path | Role |
|---|---|
| `package.json` | Root manifest: `prepare` hook → `install.mjs`; placeholder `test` script |
| `install.mjs` | Registers packages + playgrounds, runs the installer |
| `deliver.mjs` | Builds and publishes the registered libraries |
| `PackageManager.mjs` | Task runner: clone/pull, `pnpm install`, `pnpm run build`, `npm publish` from `dist` |
| `.mocharc.json` | Vestigial mocha config — matches no existing layout |
| `.github/copilot-instructions.md` | Repo-wide assistant instruction ("Keep things simple and compact."); no CI exists |
| `notes/ts-gen.js` | Stale scratch script for JSON-Schema generation |
| `packages/jointhedots-{core,ui,scripting}` | The three libraries (own architecture docs) |
| `playgrounds/playground-ui` | Web playground application (registered in install/deliver) |
| `playgrounds/playground-chrome` | Chrome MV3 extension playground (experimental, not registered) |
| `playgrounds/logo.png`, `logo.svg` | Shared playground icons |

## Layout model

**Not a workspace.** Each package is an independent pnpm project (own lockfile, own
`node_modules`). Cross-package wiring uses `file:` devDependencies pointing at the
**built** `dist/` outputs of dependencies — build order matters: `core` →
`scripting`/`ui` → playgrounds. The root `prepare` hook bootstraps everything on any
install at the root.

## Install and delivery flows

`install.mjs` registers: the three libraries and `playgrounds/playground-ui`. The
installer runs two passes per package: clone/pull (remote packages) + presence check +
`pnpm install --force`; then `pnpm run build` (errors ignored — a failed build surfaces
later at link time). `deliver.mjs` builds all registered libraries then runs
`npm publish --access public` inside each `dist/<first-directory>`.

The per-package build is `jointhedots-gear make --libs <name> --dist ./dist`, driven by
each package's `declaration.json` (see the library architecture docs and
[packaging.spec.md](../specs/packaging.spec.md)).

## Playgrounds

**`playground-ui`** (`playgrounds/playground-ui`) — the demonstration and smoke-test
application. `src/application.json` declares six webviews: `panels` (layout panels +
schema-bound inputs), `literal-string` (text templates: scripting engine + code
editor), `icons`, `layouts`, `inputs`, `services` (full services architecture:
service points, GitHub storage component manifests, discovery, wiring UIs). Served by
`jointhedots-gear serve --app playground:ui --port 3002`. Its
`src/components/GithubComponent/` is the reference sample component (manifest, storage
+ commands services, OAuth button — largely stubbed).

**`playground-chrome`** (`playgrounds/playground-chrome`) — experimental MV3 extension;
its startup imports modules that don't exist in the repository; not registered in
`install.mjs`; treat as inert until repaired.

## Environment

pnpm pinned via `packageManager` (10.30.3); modern Node (no `engines` declared;
ES2022 targets); Deno for the scripting test suite; git for remote package sources;
npm authenticated for publishing. A sibling checkout of the `jointhedots-ui`
design-system repository is required by `jointhedots-ui` and `playground-ui` installs
(`pnpm-workspace.yaml` file overrides).

## Do / Don't

- **Do** register new packages in both `install.mjs` and `deliver.mjs` (libraries) — an
  unregistered package is invisible to the flows.
- **Do** respect the build order when changing cross-package APIs: build `core` before
  typechecking dependents against its `dist`.
- **Do** declare every public subpath in each package's `declaration.json` — it is the
  single export source.
- **Don't** rely on the root `test` script (mocha + ts-node are not installed); the
  real suite is the Deno one in `packages/jointhedots-scripting`.
- **Don't** commit secrets — a commented GitHub OAuth client secret sits in
  `playgrounds/playground-ui/src/components/GithubComponent/servlet/index.ts` and
  should be purged from history.
- **Don't** add a root workspace file — the meta-repo model is intentional.

## Known gaps (as of this writing)

- License contradiction: `LICENSE` is a restricted license while npm manifests declare
  MIT — must be reconciled before public distribution.
- Version skew: source packages say `0.0.0`; published bundles carry the root version
  (2.1.8) stamped by the build tool. Intentional, but easy to misread.
- `packages/jointhedots-scripting`'s `deliver` script targets `./dist/@jointhedots-scripting`
  while the build emits `./dist/jointhedots-scripting`.
- `PackageManager.patchPackage` references an undefined global and would crash if
  called; a commented line hardcodes an absolute local path.
- Mixed lockfiles at the root (`package-lock.json` + `pnpm-lock.yaml`); `.mocharc.json`
  points at a layout that no longer exists.
- `notes/ts-gen.js` references a removed `packages/playground-services` layout.
- OAuth client id is hardcoded in the playground SSO button and the redirect port
  (3001) mismatches the dev server port (3002).

## Verification

```sh
node install.mjs        # bootstrap: install + build all registered packages
# per package:
cd packages/<name> && pnpm watch && pnpm build
# tests (the only suite):
cd packages/jointhedots-scripting && deno test --allow-all --sloppy-imports ./test/interpreter.test.ts
# playground smoke:
cd playgrounds/playground-ui && pnpm build && pnpm serve   # http://localhost:3002
# delivery (dry understanding — publishes for real):
node deliver.mjs
```
