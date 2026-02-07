import { loadScriptASTFromText } from "./ast/loader.ts"
import { loadScriptGraphFromAST } from "./graph/api.ts"

export async function createFlowFromMdx(text: string) {
   const ast = loadScriptASTFromText(text)
   return loadScriptGraphFromAST(ast)
}
