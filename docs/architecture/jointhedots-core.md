# Architecture — `@jointhedots/core`

The runtime kernel of the platform: component registry, service wiring, schema system,
standard interfaces, logging, settings, observables. Spec:
[components.spec.md](../specs/components.spec.md), [services.spec.md](../specs/services.spec.md),
[schema.spec.md](../specs/schema.spec.md), [interfaces.spec.md](../specs/interfaces.spec.md).

## Cartography

| Path | Role |
|---|---|
| `src/index.ts` | Root barrel: everything except `src/interfaces/*` |
| `src/common/types.ts` | Generic TS helpers (`ObjectClass`, `Overwrite`, `OneOrMany`, …) |
| `src/common/contents.ts` | `ContentBlob` JSON/text codecs, base64 ↔ Blob converters |
| `src/logging/index.ts` | Log bus: `LogObject` (events/tickets), collectors, query API |
| `src/logging/trace.ts` | Console monkeypatching with ANSI colors, `print` |
| `src/observable/observable.ts` | `Observable` — Proxy-based reactive container |
| `src/observable/listenable.tsx` | `Listenable` — evented base class with coalesced changes |
| `src/observable/RestResource.ts` | `Observable` loaded from a REST URL |
| `src/components/components.ts` | Component model types: manifests, publications, provider SPI |
| `src/components/manifold.ts` | Registry: `ComponentEntry`, `ComponentResource`, `ComponentsRegistry` |
| `src/components/helpers.ts` | URI parsing, publication creation, filter matching |
| `src/services/service-specification.ts` | `ServiceSpecification`, version compatibility checking |
| `src/services/service-definitions.ts` | `ServiceDefinition`, spec/def matching |
| `src/services/service-accessor.ts` | `ServiceAccessor` — typed resource handle |
| `src/services/service-points.ts` | `ServicePoint`, global `ServicePoints` map, acquire/get/create |
| `src/services/settings.ts` | `AccountSettings` — 3-group persisted store |
| `src/schema/schema.ts` | Zod meta-schema of the extended JSON Schema |
| `src/schema/zod.ts` | Zod bridge: conversions, `validate`, `generateTypeScript` |
| `src/schema/helpers.ts` | `CommonTypes` / `CommonMakers`, schema introspection |
| `src/interfaces/commands/interface.ts` | `Command`, `Cmdlet`, `executeCommand` |
| `src/interfaces/storage/interface.ts` | `StorageService` contract (changesets, time travel) |
| `src/interfaces/view/interface.ts` | View routing: hash parsing, guarded prop evaluation |
| `src/interfaces/rest/interface.ts` | `RESTService`, `jtd:` scheme dispatch |
| `src/interfaces/rest/decorators.ts` | Server-side REST decorators (hono-typed) — not exported |
| `src/interfaces/react/` | React bindings: hooks, error boundaries, URL views |
| `src/providers/resources/` | Module/content loaders (`CommonResourceProvider`, `StaticContentProvider`) |
| `src/providers/components/` | `Static/Local/InMem/CombinedComponentProvider` |
| `declaration.json` | Subpath export map (input to the build tool) |

## Public surface (subpath exports)

| Subpath | Source | Exposes |
|---|---|---|
| `.` | `src/index.ts` | common, logging, observable, schema, components, services, providers |
| `./commands` | `src/interfaces/commands/interface.ts` | Command types and dispatch |
| `./storage` | `src/interfaces/storage/interface.ts` | Storage contract |
| `./view` | `src/interfaces/view/interface.ts` | View routing |
| `./rest` | `src/interfaces/rest/interface.ts` | REST service, `jtd:` dispatch |
| `./react` | `src/interfaces/react/index.ts` | Hooks, `ErrorBoundary`, `InvokeView`, `view.react` keys |

`src/interfaces/*` are **subpath-only**: never imported from the root barrel.

## Persistence layout

- **IndexedDB** `LocalComponents_v2` (local component provider): stores `components`
  (keyPath `id`), `components_services` (keyPath `[component_id, service]`),
  `components_manifests` (keyPath `component_id`).
- **localStorage**: `settings://<name>` (settings store), `local:` URIs (base64
  content blobs).
- **HTTP**: bundle manifests (`bundle.manifest.json` of built packages), manifests,
  REST through global `fetch`.

## URI schemes

`jtd:` (REST to a component), `command:` (command targets), `local:` (localStorage
content), `settings://` (settings keys). URI handling goes through `vscode-uri`.

## Conventions

- **Naming**: `acquire*` = create-or-get (registry entries, service points, futures);
  `get*` = plain getter; `create*` = always-new. Provider SPI methods are `snake_case`
  (`get_component_manifest`, `search_component_publications`); everything else is
  camelCase.
- **Module-level singletons**: `ComponentsRegistry`, `ServicePoints` map, settings
  instance, log bus. They rely on packages being deduplicated at bundle time.
- **Listen/unlisten pairs**: subscription handlers registered in module-level `Set`s
  (`listenServicePoints`/`unlistenServicePoints`, `listenSettings`, `ComponentsRegistry.listen`,
  `registerLogCollector`).
- **Single-flight async**: concurrent loads/installs/fetches share one memoized promise
  (`loadings`, `installings` maps).
- **Error style**: async paths swallow exceptions and convert them to `Log.error` calls
  or `<error>` pseudo-components; sync paths throw. React paths use
  `ErrorBoundary`/displayers.
- **Deferred dispatch**: log and change events fan out via `setTimeout(0)`; `Listenable`
  coalesces changes (previous state captured once per tick, only changed keys notify).
- **Barrels**: one `index.ts` per folder; `.ts` extensions kept in import specifiers
  (`allowImportingTsExtensions`).
- **Schema authoring**: Zod-first with `z.infer` type exports; recursive schemas via
  `z.lazy`.

## Do / Don't

- **Do** register new interfaces under `src/interfaces/<facet>/` with their own subpath
  export in `declaration.json`.
- **Do** keep provider methods `snake_case` and add providers to the combined chain
  (first-wins) in `manifold.ts`.
- **Don't** import `src/interfaces/*` from the root barrel — subpath only.
- **Don't** throw from async registry paths — convert to `<error>` components or log
  records.
- **Don't** create a second instance of registries/settings — they are singletons by
  contract; extend them, don't shadow them.
- **Don't** add schema facets to `schema.ts` without a consumer — the schema is a
  shared vocabulary.

## Known gaps (as of this writing)

- `ReactComponentSchema.isAssignable` assigns instead of comparing (`src/interfaces/react/interface.ts:72`).
- `Observable.subscribe(keys)` stores the filter but `notify` never applies it
  (`src/observable/observable.ts`).
- `AccountSettings.read` indexes the group level with a leaf key — dead method
  (`src/services/settings.ts:73`).
- `allow-origin` enforcement is commented out in view prop parsing
  (`src/interfaces/view/interface.ts:139`) — declared in schema, not enforced.
- `identity`/`signature` on commands are declared, never validated
  (`src/interfaces/commands/interface.ts:28`).
- `src/schema/schema.ts.md` is a drifting type-only duplicate of `schema.ts`.
- `src/interfaces/rest/decorators.ts` is unreachable from any export path.
- Circular imports: `manifold ↔ rest/interface`, `logging ↔ manifold` (works by init
  order luck — avoid widening).
- `getDefaultComponent()` returns `acquireComponent("log:application")`, an id defined
  outside this package.
- `declaration.json` / `BundleManifest` field `distribueds` is a load-bearing
  misspelling of "distributed" — used as-is everywhere; renaming requires a coordinated
  change across the build tool.

## Verification

```sh
cd packages/jointhedots-core
pnpm watch    # typecheck (tsc --noEmit), continuous
pnpm build    # jointhedots-gear make --libs @jointhedots/core --dist ./dist
pnpm dev      # build in devmode + watch
```

No automated tests exist for this package. The web playground's services sample is the
de facto smoke test.
