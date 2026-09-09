# Schema System — Specification

**Domain**: the platform's single data-description language, used for manifest
attributes, service value schemas, view parameters, form generation and tool interfaces.
**Owner**: `@jointhedots/core`. Referenced by
[components.spec.md](components.spec.md), [services.spec.md](services.spec.md),
[interfaces.spec.md](interfaces.spec.md) and [ui-shell.spec.md](ui-shell.spec.md).

## The schema language

A **JSONSchema** is a JSON Schema (draft-07) document extended with platform-specific
facets. The standard part carries typing and validation; the extensions carry
presentation, documentation, loading and security concerns. Both parts live in one
document — a schema is simultaneously a validator and a UI description.

### Custom type names

Beyond standard JSON types, the platform defines:

- `module` — a reference to a loadable module.
- `function` — an MCP-style tool interface: an `input` schema and an `output` schema.
- `service` — a reference to a service interface: its `$spec` URI and `version`.

The shared schema literals additionally mark values as `view` or `display`
(React-renderable), and code generation maps them accordingly.

### Extension facets

- `doc` — structured documentation: chapters of titled content.
- `docking` — where a view docks, with its own properties.
- `templates` — title, icon and description templates with expression arguments.
- `binding` — the source a value is bound to (e.g. the view content).
- `security` — the guard applied to values (below).
- `allow-origin` — declared origin restriction on values (below).
- `placeholder`, `aliases` (input name remapping), `resources` (attached resource
  pointers), `args`, `$error`.

### Security guards

Values entering the platform from outside (typically view parameters) are guarded. A
**SecurityGuard** is either `safe` (trusted as-is, bypasses checking), a link to a named
**SecurityRule**, or an inline rule. Guard enforcement, as applied to view parameters:

- a value whose property has no guard is rejected — unguarded data cannot enter;
- a value referencing an unknown rule is rejected;
- an origin marked safe bypasses the check;
- an absent value falls back to the schema's default.

**Named limit**: the `allow-origin` facet is declared in the schema vocabulary but its
enforcement is currently disabled in the code. It is a declared intention, not a
guarantee; hardening it is an open question.

## Resource pointers

A **ResourceEntry** designates a loadable resource: its `type` (e.g. `module`,
`api.rest`, `service`), an optional `location` and an optional `identifier`. Entries
are parsed from their string form (`location#identifier?params`) and are the addressing
unit of component apis (see [components.spec.md](components.spec.md)).

## The Zod bridge

Schemas authored as Zod schemas and schemas authored as JSON Schema are one currency:

- conversion in both directions, preserving custom type names;
- a dedicated Zod service-reference type so service pointers survive conversion;
- `validate` / `validateOrThrow` as the uniform validation entries;
- generation of TypeScript type declarations from any schema, for authoring ergonomics.

## Shared literals

Two vocabularies of ready-made schemas: **CommonTypes** (boolean, string, number,
object, view, display, function, null, unknown, any) and **CommonMakers** (enums,
arrays, records, collections, event functions). Platform code uses these literals
instead of hand-writing schema documents, so presentation facets stay consistent.
