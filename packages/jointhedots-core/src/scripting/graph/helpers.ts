import { DocumentModel, Node, State } from "./model.ts"

export function stringifyGraph(n: Node): string {
   const seen = new Set<Node>()
   const ignoredKeys = ["desc", "owner", "$key"]
   const ignoredClasses = [Function, DocumentModel]

   function replacer(key: string, value: any) {
      if (value instanceof Object) {
         for (const cls of ignoredClasses) {
            if (value instanceof cls) return undefined
         }
         if (value instanceof Node) {
            if (seen.has(value)) {
               if (isNaN(value.$key)) throw new Error(`Not referable element`)
               return { $ref: value.$key }
            }
            seen.add(value)
            const obj: any = {
               type: value.constructor.name,
               $id: value.$key,
            }
            for (const k of Object.keys(value)) {
               if (ignoredKeys.includes(k)) continue
               const v = value[k]
               if (typeof v === 'function') continue
               obj[k] = v
            }
            return obj
         }
         else {
            if (!seen.has(value)) {
               seen.add(value)
               return seen
            }
            else {
               return "[Object Redundancy]"
            }
         }
      }
      return value
   }

   return JSON.stringify(n, replacer, 2)
}
