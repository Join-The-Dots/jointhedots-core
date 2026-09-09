# Scripting & Expressions — Specification

**Domain**: expression evaluation, text templating, document parsing and the
experimental document flow graph.
**Owner**: `@jointhedots/scripting`. The template engine is consumed by host
applications (playgrounds); the interpreter is the foundation of everything else in the
package.

**Status**: the interpreter and text templates are complete and tested. MDX document
parsing is functional. The flow graph is **experimental** — its model is specified here
as it exists, not as a finished runtime.

## Expression interpreter

The interpreter evaluates JavaScript expressions and small programs from their AST,
without `eval`, inside caller-provided scopes. Its contract:

- **Statements are expressions**: a block evaluates to its last expression; program
  fragments return values.
- Functions become real closures over their scope; arrows capture the lexical `this`.
- Scopes form a chain: a **LocalScope** resolves names through its parents and writes
  to the owning scope of an existing binding; the **EmptyScope** terminates the chain.
- Control flow (return, break, continue) travels as tagged exceptions consumed only by
  the construct that owns it (function, loop, switch).
- The interpreter is **synchronous**: awaiting a promise-like value is an error
  ("async/await requires async context"). Awaiting an already-resolved value is allowed
  and transparent.
- Security posture: `with` statements are rejected outright, dynamic `import()` is
  unsupported, and the sandbox surface is exactly the names the caller puts in the
  scope — nothing else is reachable.
- Unknown node types and structurally invalid nodes are errors, never silent.

## Text templates

A **TextTemplate** is text with embedded expressions, in one of three syntaxes:
`$(expr)`, `${expr}` or `{{expr}}`. An open token preceded by a backslash is a literal.

Parsing extracts each embed into a **TextBinding** (its source range and parsed AST)
and replaces it in the pattern with a placeholder guaranteed not to occur in the text.
Evaluation runs each binding in a scope built from the caller's variables and encodes
the result through a caller-provided encoder (defaults: `null`/`undefined` render
empty, anything else renders as string).

Parse issues are **collected**, not thrown: a template with malformed embeds still
parses, carries its issues, and evaluates its valid bindings. Evaluation failure of a
binding, by contrast, is an immediate error.

## Document primitives

A **document** is the platform's structured content form. Its vocabulary of primitives:

- media — `Text`, `Image`, `Audio`, `Video`;
- structure — `Block` (formatted: paragraph, tip, quote, code, section, figure, pair,
  fragment), `List`, `Table`;
- markup — `Element` (tag, attributes, content), spread attributes;
- root — `Document` (metadata map + content).

Any node can carry **annotations** — alternate perspectives on it (a summary, an
explanation) — and **source links** back to byte ranges of its origin text.

The vocabulary also declares **procedural primitives** for model/agent-oriented
documents: `Sampling` (feed primitives to a model, take primitives back), `Command`
(execute a real-world behavior), `Recall` (query and inject context). These are a
declared, named vocabulary — no parser produces them yet.

### MDX documents

An MDX-flavored text — YAML frontmatter, JSX-like elements, fenced blocks,
`{expression}` embeds (and ```` ``{expression} ```` inside blocks) — parses into a
`Document` primitive: frontmatter becomes metadata, elements become `Element` trees,
blocks become `Block`s (optionally headed by an element or an anonymous header),
embeds become parsed expressions. Documents print back to JSX/markdown-flavored text
with the same parser's vocabulary.

### Flattened form

For storage and graph building, a document AST is **flattened**: every typed node gets
a numeric `$id` and an `$owner`; every child reference becomes a `$ref` indirection;
the root is named by `main`. The flattened form — a map of id → node plus the main
reference — is the serialized script format.

## Flow graph (experimental)

The flattened document becomes an executable **graph** of typed **nodes**. Node classes
are resolved by primitive type, or by element tag for markup. Unknown types resolve to
a designated error node, so a graph is always buildable.

- A **ContextModel** declares the graph's members, **states** (indexed slots with
  change timestamps, written only when the value actually changes) and **tasks**; a
  **ContextInstance** is its runtime layer, holding state values, task statuses and
  flow control.
- A **Pipeline** is a future-value stream: it can be awaited, mapped, filtered, paused
  and resumed — the data channel between nodes.
- **Use links** connect a consumer to its inputs: single (`Use`), list (`UseList`) or
  feature-dispatched aggregates (`UseAggregate`), in strong or weak variants.
- Render nodes (HTML tags, blocks) and document nodes (the root, state variables,
  elements) are the built-in vocabulary; expression nodes evaluate through the
  interpreter above.
- Invariant: **the document root is the graph controller** — the node owning execution.
  A graph whose root is not the controller is rejected.
