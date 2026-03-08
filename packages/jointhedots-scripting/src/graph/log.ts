import type { AST } from "../ast/mod.ts"
import type { NodeKey } from "../ast/primitives.ts"

export class DocumentData {
   nodes = new Map<NodeKey, AST.Any>()
   main: string = null
   seq: number = 0
   createKey(): number {
      return this.seq++
   }
   serialize() {
      const fmap = {}
      for (const [k, v] of this.nodes.entries()) {
         fmap[k] = v
      }
      return fmap
   }
}

export function createDocumentFromAST(n: AST.Any): DocumentData {
   function flatten(n: any, $owner: NodeKey) {
      if (isNaN($owner)) {
         throw new Error()
      }
      if (Array.isArray(n)) {
         return n.map(x => flatten(x, $owner))
      }
      if (n instanceof Object) {
         const obj = {} as AST.Any
         let res = obj as any
         if (n.type) {
            let id = obj.$id || log.createKey()
            obj.$id = id
            obj.$owner = $owner
            log.nodes.set(id, obj as any)
            res = { $ref: id }
            $owner = id
         }
         for (const k in n) {
            obj[k] = flatten(n[k], $owner)
         }
         return res
      }
      return n
   }

   const log = new DocumentData()
   log.main = flatten(n, -1).$ref
   return log
}
