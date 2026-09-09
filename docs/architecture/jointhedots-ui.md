# Architecture — `@jointhedots/ui`

The generic React shell and admin UI toolkit of the platform: application board,
components library, service point UI, notifications, dialogs, Monaco code editor.
Spec: [ui-shell.spec.md](../specs/ui-shell.spec.md). Pure consumer of
`@jointhedots/core` — no direct networking or persistence.

## Cartography

| Path | Role |
|---|---|
| `src/globals.ts` | Ambient module declarations (images, prism assets) |
| `src/ApplicationBoard/index.tsx` | `AppDescriptor`, `ApplicationBoard`, `ApplicationPage`, `ApplicationSelector` |
| `src/ApplicationBoard/NavBar.tsx` | SLDS context bar, page menu, app launcher, tooling area |
| `src/ApplicationBoard/Settings.tsx` | `ApplicationSettings` — Service Points + Components tabs |
| `src/ApplicationBoard/Utils.tsx` | `SLDSPage`, `isMobile`, `NavigationBeacon` (stub), MUI-compat shims |
| `src/ApplicationBoard/component.tsx` | `ApplicationBoardDriver` + `GetApplicationView` (component controller) |
| `src/ApplicationBoard/component.json` | Manifest of component `jtd:application.board.component` |
| `src/ComponentsLibrary/ComponentsBrowser.tsx` | Search/filter/group lists, `ComponentItem` tooling |
| `src/ComponentsLibrary/ComponentsEditor.tsx` | Create/edit flows, `ComponentManifestEditor`, RJSF + JSON editors |
| `src/ComponentsLibrary/ComponentsConfigurator.tsx` | Driver selection, `NewComponentButton` |
| `src/ComponentsLibrary/ComponentsInfos.tsx` | Preview card + per-component notifications |
| `src/ServicePoint/configurator.tsx` | `ServicePointStatus`, `ServicePointInput`, `ServicePointsConfigurator` |
| `src/ServicePoint/internal.tsx` | `ServicePointEditable`, connexion selector, descriptor helpers |
| `src/ServicePoint/boundary.tsx` | `ServiceRequirementBoundary`, missing-service configurator fallback |
| `src/CodeEditor/index.tsx` | `CodeEditorHOC` (Monaco wrapper), language providers |
| `src/CodeEditor/component.json` | Manifest of component `monaco.provider` (5 worker services) |
| `src/Dialog/index.tsx` | `askQuestion`, `askData` (schema-driven modal) |
| `src/Notifications/index.tsx` | Bell, tickets/events lists, action buttons, collectors |
| `src/EmptyListPlaceholder/` | Reusable empty-state component (not exported) |
| `declaration.json` | The six public subpath exports |

## Public surface

Six subpath exports: `./ApplicationBoard`, `./ComponentsLibrary`, `./CodeEditor`,
`./Dialog`, `./ServicePoint`, `./Notifications`. Two components are self-registered
through their `component.json` manifests and served by the static provider:
`jtd:application.board.component` and `monaco.provider`.

## Conventions

- **Framework**: React 18, function components (class components only for the Monaco
  wrapper and the error boundary), `react-jsx` runtime.
- **State**: local hooks + core's async helpers (`useAsyncMemo`, `useAsyncState` with
  `waiting`/`using` render helpers) + core's listen/unlisten subscriptions. No external
  state library. Toasts via `react-toastify`.
- **Styling**: Salesforce Lightning Design System (CSS imported once in
  `ApplicationBoard`, SLDS class names applied by hand, structural components from
  `react-lightning-design-system`) + per-folder SCSS + design tokens as CSS variables
  from `@jointhedots/theme`. CSS classes use the `JDT-` prefix for library-owned
  styles.
- **Icons**: string names with set namespaces (`bi:`, `fa:`, `utility:`, `avatar:`)
  and a decoration mini-syntax (`bi:bell-fill[error]`, `icon|bi:plus[RB,info]`),
  rendered by `@jointhedots/icon`.
- **Layout**: panels/docks/item rows from `@jointhedots/layout`
  (`usePanel`, `createFloatingDock`, `openDialog`, `ItemRow*`, `LabelButton`).
- **Forms**: react-jsonschema-form (`@rjsf/core` + ajv8 validator) against platform
  schemas.
- **Component manifests**: modules may carry a `component.json`; ids are
  colon-namespaced and grouped on the last `:`.

## External design-system dependency

`@jointhedots/button`, `input`, `layout`, `icon`, `theme` come from the **sibling
repository** `jointhedots-ui`, wired through `file:` overrides in
`pnpm-workspace.yaml`. A checkout of that repository next to this one is required to
install this package.

## Do / Don't

- **Do** route all data access through core abstractions (registry, settings, service
  points, log bus) — never `fetch` directly.
- **Do** call `registerMissingServiceDisplayer()` once at host initialization so
  missing-service errors render the configurator.
- **Do** add new public modules to `declaration.json` — an unlisted module is
  unreachable by consumers (`EmptyListPlaceholder` is the cautionary example).
- **Don't** introduce a state library — the listen/unlisten + async-state pattern is
  the established one.
- **Don't** hardcode styles; use SLDS classes and theme CSS variables.
- **Don't** wire Monaco workers here — hosts own `MonacoEnvironment`; this package only
  publishes the worker services through `monaco.provider`.

## Known gaps (as of this writing)

- `JSONManifestEditor` renders the manifest as JSON but never wires write-back — code
  mode is read-only (`ComponentsEditor.tsx:147`).
- `NavigationBeacon` is a pass-through stub (`Utils.tsx:33`); `Box`/`Typography`/`Grid`
  are MUI-compat shims, `Grid` ignores its layout props.
- `ApplicationBoardDriver.createComponent`/`updateComponent` are empty stubs.
- Rules-of-hooks violation: conditional `useServicesListener` call
  (`ServicePoint/boundary.tsx:22`).
- No tests for this package; the web playground is the smoke surface.

## Verification

```sh
cd packages/jointhedots-ui
pnpm watch    # typecheck (tsc --noEmit)
pnpm build    # jointhedots-gear make --libs @jointhedots/ui --dist ./dist
pnpm dev      # build in devmode + watch
# manual smoke: build + serve the web playground (see tooling.md)
```
