# Join.The.Dots — Core

A component-based composition platform for the browser. Applications are assembled at
runtime from **components** — units described by JSON manifests — that expose typed
**services**, discovered and wired through **service points**. This repository holds
the platform kernel, its React shell toolkit, its scripting engine, and the playgrounds
that demonstrate them.

## Packages

| Package | What it is |
|---|---|
| [`@jointhedots/core`](packages/jointhedots-core) | The runtime kernel: component registry (manifests, publications, providers), service points and version-checked wiring, extended JSON Schema system with a Zod bridge, standard interfaces (commands, versioned storage, view routing, REST), logging, settings, observables, React hooks. |
| [`@jointhedots/ui`](packages/jointhedots-ui) | The generic React shell: application board and launcher, components library (browse/create/edit manifests with schema forms), service point configurator, notifications, dialogs, Monaco code editor. |
| [`@jointhedots/scripting`](packages/jointhedots-scripting) | The scripting engine: a sandboxed JavaScript expression interpreter, text templates with embedded expressions (`$(…)`, `${…}`, `{{…}}`), an MDX document parser, and an experimental document flow graph. |
| [`playgrounds/playground-ui`](playgrounds/playground-ui) | The web playground — demonstration and smoke-test app with one sample per capability (panels, templates, icons, layouts, inputs, services end-to-end). |

Playground `playground-chrome` (a browser extension host) is experimental and not part
of the default install.

## Getting started

Prerequisites: a modern Node.js, [pnpm](https://pnpm.io) 10.30.3 (pinned via
`packageManager`), [Deno](https://deno.land) for the test suite, git, and a sibling
checkout of the `jointhedots-ui` design-system repository (supplies the
`@jointhedots/button`, `input`, `layout`, `icon`, `theme` packages through file-path
overrides).

```sh
pnpm install        # runs the prepare hook → install.mjs: install + build all packages
```

Each registered package gets its dependencies installed and is built by
`jointhedots-gear`, which produces a self-contained bundle under `dist/`. Build order
matters (`core` → `scripting`/`ui` → playgrounds) and is handled by the installer.

Run the playground:

```sh
cd playgrounds/playground-ui
pnpm build
pnpm serve          # http://localhost:3002
```

## Development

Every package follows the same script convention:

```sh
cd packages/<name>
pnpm watch    # continuous typecheck (tsc --noEmit)
pnpm build    # bundle to ./dist via jointhedots-gear
pnpm dev      # build in devmode + watch
```

Tests — the suite lives in the scripting package (Deno):

```sh
cd packages/jointhedots-scripting
deno test --allow-all --sloppy-imports ./test/interpreter.test.ts
```

The core and UI packages have no automated tests yet; the playground's `services`
sample is their de facto smoke test.

## Publishing

Libraries are published from their **built** bundle, never from source. Either per
package (`pnpm deliver`) or all at once from the root:

```sh
node deliver.mjs     # builds all registered libraries, then npm publish from each dist
```

Published bundles carry the repository root version (source packages keep `0.0.0`).

## Documentation

- **Functional specs** — the conceptual contract of each domain (components, services,
  schemas, interfaces, scripting, UI shell, packaging):
  [`docs/specs/_GUIDE_.md`](docs/specs/_GUIDE_.md)
- **Architecture docs** — the structural mirror of each subsystem (files, conventions,
  patterns, verification commands): [`docs/architecture/_GUIDE_.md`](docs/architecture/_GUIDE_.md)

Start with the [component model spec](docs/specs/components.spec.md) and the
[service model spec](docs/specs/services.spec.md) — everything else builds on them.

## License

See [LICENSE](LICENSE). Note: npm manifests currently declare MIT while the LICENSE
file is a restricted license — to be reconciled before public distribution.
