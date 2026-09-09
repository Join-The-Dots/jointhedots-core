# Architecture Documents — Routing Guide

An architecture document is the **structural mirror of one subsystem**: the
cartography of its files, its conventions, its recurring patterns, Do/Don't rules and
its verification commands. It describes *how* the code is organized and written today.
The *what* and *why* of each functional domain live in the specs
(`docs/specs/_GUIDE_.md`).

## Update rule

**The document is current when the code is.** Any task that changes a subsystem's
structure — new component, new file, new convention, refactored pattern, changed
directory layout — updates the corresponding document in the same task. A stale
architecture document is worse than none: it misleads the next session.

- Add a component/hook/module → add it to the document's cartography.
- Change a convention → update the section and the Do/Don't list.
- Major refactor → rewrite the stale section, don't patch it.
- New subsystem → create its document and register it in the table below.

## Routing table

| Subsystem | Document | Code root |
|---|---|---|
| Core runtime (components, services, schemas, interfaces) | [jointhedots-core.md](jointhedots-core.md) | `packages/jointhedots-core` |
| Scripting engine (interpreter, templates, AST, graph) | [jointhedots-scripting.md](jointhedots-scripting.md) | `packages/jointhedots-scripting` |
| UI toolkit (shell, library UI, notifications, editors) | [jointhedots-ui.md](jointhedots-ui.md) | `packages/jointhedots-ui` |
| Repository tooling (install, build, delivery, playgrounds) | [tooling.md](tooling.md) | repository root |

## Reading order for a new session

1. The subsystem's spec (`docs/specs/…`) — what the domain means.
2. The subsystem's architecture document — where things live and how they're written.
3. The code.
