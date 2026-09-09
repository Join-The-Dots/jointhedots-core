# Functional Specifications — Routing Guide

A spec is the **conceptual contract of one functional domain**: the business concepts it
manipulates, the invariants it guarantees, the data flows, the data it exchanges or
persists, and its boundaries with other domains. It states *what* and *why*, never *how*.
No code, no file paths, no implementation choices — those live in the architecture
documents (`docs/architecture/`).

## Rules

- Before writing or revising a spec, check the routing table below to find the owning
  spec. Never spread one domain across several specs; never duplicate a concept already
  covered elsewhere — reference it instead.
- Specs describe the **current state**, in the present tense. No transition history, no
  old-name mappings, no "to be migrated" notes. If the code diverges from a spec, one of
  the two is wrong and must be fixed in the same task.
- One concept = one name. The spec uses the exact name the code uses
  (`ComponentManifest`, `ServicePoint`, …). A divergence between spec vocabulary and code
  vocabulary is a defect.
- Declared limits are named as limits. A constraint that is only "carried by convention"
  is documented as a known limit, never presented as a guarantee.
- All diagrams are Mermaid. All content is English.

## Routing table

| Domain | Spec | Covers | Typical triggers |
|---|---|---|---|
| Component model | [components.spec.md](components.spec.md) | Components, manifests, publications, controllers, registry lifecycle, providers, bundles, search | New manifest field, new provider kind, lifecycle rule change, catalog/search change |
| Service model | [services.spec.md](services.spec.md) | Service specifications and definitions, accessors, service points, settings, version compatibility | New wiring concept, compatibility rule change, settings group change |
| Schema system | [schema.spec.md](schema.spec.md) | Extended JSON Schema, custom types, security guards, Zod bridge, validation, code generation | New schema extension, new type name, security rule change |
| Standard interfaces | [interfaces.spec.md](interfaces.spec.md) | Commands, versioned storage contract, view routing, REST and the `jtd:` scheme, React view bindings | New interface facet, URI scheme change, view routing rule change |
| Scripting & expressions | [scripting.spec.md](scripting.spec.md) | Expression interpreter, text templates, document primitives, MDX parsing, flow graph | New embed syntax, new primitive, interpreter rule change, graph model change |
| UI shell | [ui-shell.spec.md](ui-shell.spec.md) | Application board, app launcher, components library UI, service point UI, notifications, dialogs, code editor | New shell concept, new admin surface, notification/notification-action change |
| Packaging & delivery | [packaging.spec.md](packaging.spec.md) | Meta-repo organization, export declarations, build artifacts, bundle manifests, delivery flow, playgrounds | New package, export map change, delivery flow change |

## Decision rule: spec vs architecture

A **conceptual** change (new business concept, invariant, exchanged or persisted data,
flow evolution) modifies the domain spec. A **structural** change (module organization,
new file or component, convention, pattern) modifies the architecture document of the
subsystem. A change touching both dimensions modifies both artifacts in the same task.
