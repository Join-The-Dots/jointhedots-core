/***********
 * Flow Graph: Intermediate flow representation, consolidate basic syntax and connect element from document
**********/

import { createGlobalResolver, GraphBuilder, updateModel } from "./builder.ts"
import { DocumentModel } from "./model.ts"
import { createDocumentFromAST } from "./log.ts"

import "./nodes/nodes-states.tsx"
import "./nodes/nodes-expr.ts"
import "./nodes/nodes-render.tsx"
import type { AST } from "../ast/api.ts"
import { file } from "@polycuber/script.cli"

export async function loadScriptGraphFromAST(ast: AST.DocumentPrimitive) {
   const data = createDocumentFromAST(ast)
   const model = new DocumentModel(data)
   const builder = new GraphBuilder(model, data, createGlobalResolver())
   await updateModel(builder)
   file.write.text("test-results/flow/ast.json", JSON.stringify(ast, null, 2))
   file.write.json("test-results/flow/flamap.json", data.serialize())
   // file.write.text("test-results/flow/graph.json", stringifyGraph(model.entrypoint))
   return model
}
