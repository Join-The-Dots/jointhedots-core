# Architecture — `@jointhedots/scripting`

The expression interpreter, text template engine, MDX/AST document pipeline and the
experimental flow graph. Spec: [scripting.spec.md](../specs/scripting.spec.md).

## Cartography

| Path | Role |
|---|---|
| `src/index.ts` | Public entry: AST types (type-only) + interpreter + template |
| `src/interpreter.ts` | Tree-walking ESTree evaluator: scopes, control flow, operation tables |
| `src/template.ts` | `TextTemplate` / `TextBinding` / `parseTextTemplate` |
| `src/ast/mod.ts` | AST namespace barrel (`AST`), acorn parse, astring print |
| `src/ast/primitives.ts` | Document primitive vocabulary (media, blocks, elements, procedural) |
| `src/ast/serde/tokenizer.ts` | Generic regex tokenizer framework (`TokenPattern`, `TokenStream`) |
| `src/ast/serde/parser.ts` | MDX → `DocumentPrimitive` (frontmatter, elements, blocks, embeds) |
| `src/ast/serde/printer.ts` | AST → JSX/markdown text (astring generator extension) |
| `src/graph/.notes.md` | Design notes (French) for the flow graph engine |
| `src/graph/mod.ts` | Flow entry: `loadScriptGraphFromAST`, `createFlowFromMdx` |
| `src/graph/model.ts` | `Node`, `State`, `Task`, `ContextModel/Instance`, `DocumentModel` |
| `src/graph/builder.ts` | `GraphBuilder`: instantiate/link/update nodes, controller check |
| `src/graph/register.ts` | `@Model.Node` decorator registry (`Model.classes`) |
| `src/graph/log.ts` | `DocumentData`: AST flattening to `$id`/`$ref` node map |
| `src/graph/loader.ts` | `loadScriptASTFromText`: MDX → normalized AST |
| `src/graph/values.ts` | `Pipeline` — promise-like future-value streams |
| `src/graph/uses.ts` | Value types, `Use`/`UseList`/`UseAggregate` consumption links |
| `src/graph/nodes/nodes-expr.ts` | Expression nodes (`Literal`, `Identifier`, …) |
| `src/graph/nodes/nodes-states.tsx` | Document nodes (`DXDocument`, `DXVariable`, `DXError`, `DXElement`) |
| `src/graph/nodes/nodes-render.tsx` | Render nodes (`GRHTMLElement` for HTML tags, `GRBlock`) |
| `test/interpreter.test.ts` | Deno BDD suite: templates + interpreter |
| `declaration.json` | Export map — single entry `.` → `src/index.ts` |

## Public surface

One export: `.` (interpreter + templates + AST types). **Not exported**: the whole
`src/graph/*` subsystem and the MDX parser/printer — internal today; the graph writes
debug dumps under `test-results/flow/` when invoked.

## Conventions

- **Class prefixes**: `DX…` document/script nodes, `GR…` graph render nodes;
  `nodes-expr.ts` / `nodes-states.tsx` / `nodes-render.tsx` mirror the split.
- **`$`-prefixed machinery**: `$id`, `$owner`, `$ref`, `$key`, `$class`, `$context` —
  framework fields, distinct from domain fields.
- **Registry pattern**: node classes self-register via `@Model.Node({ type, linkNode,
  updateNode })`; modules are imported for their side effects
  (`import "./nodes/nodes-states.tsx"`). Dispatch is by primitive `type`, or by element
  `tag` for `Element` nodes.
- **Dispatch tables everywhere**: `EVALUATORS` map in the interpreter, operation maps
  (binary/unary/assignment, enhanced variants), tokenizer rule arrays.
- **Entry files** named `mod.ts` inside `ast/` and `graph/`.
- **Typing**: `strict: false`; types are descriptive. Tests use Deno std from JSR
  (`.npmrc` maps `@jsr` to `npm.jsr.io`).
- **Logging**: raw `console.*` at every level (the core package's log bus is not used —
  it is a declared dependency but currently unimported).

## Do / Don't

- **Do** extend the interpreter through `EVALUATORS` registration, keeping evaluators
  pure and synchronous.
- **Do** keep template parsing non-fatal: malformed embeds land in `issues`, never
  throw at parse time.
- **Do** register new graph node types with the `@Model.Node` decorator and a stable
  type/tag name.
- **Don't** call `src/graph/*` from library consumers — it is experimental and performs
  file writes.
- **Don't** add I/O to the interpreter — its security posture is a closed scope.
- **Don't** remove the `--sloppy-imports` flag from the Deno test command;
  extensionless TS imports depend on it.

## Known gaps (as of this writing)

- Graph subsystem: `ContextInstance.schedule` empty, statement execution commented out
  (`model.ts:179`), several `apply` bodies stubbed; `addTask` uses `states.length` for
  the task index; `UseAggregate.create` mis-buckets mappings (`uses.ts:151`).
- `TextTemplate.evaluate` uses string `replace` per binding — first-occurrence only and
  `$`-sensitive (`template.ts:47`).
- `printer.ts:116` passes the wrong variable into the generator inside `Block.renderContent`.
- Undeclared runtime dependency `@polycuber/script.cli` (hoisted from the repo root).
- Declared-but-unused dependencies: `zod`, `@jointhedots/core`.
- `deliver` script cds into `./dist/@jointhedots-scripting` but the build emits
  `./dist/jointhedots-scripting` — the publish path is broken as written.
- Procedural primitives (`Sampling`, `Command`, `Recall`) are declared vocabulary with
  no producer.

## Verification

```sh
cd packages/jointhedots-scripting
pnpm watch                                             # typecheck
deno test --allow-all --sloppy-imports ./test/interpreter.test.ts
pnpm build                                             # jointhedots-gear make
```

The Deno suite covers the interpreter (closures, loops, classes, try/catch, async
semantics limits) and template parsing/evaluation. MDX parsing and the graph have no
tests.
