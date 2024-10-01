import { ComponentsRegistry } from "core/components"
import { ASTExpression } from "core/AST"

export function getExpressionHandler(type: string) {
   const mod = ComponentsRegistry.acquireComponent(type)
   if (mod.valid) {
      const mod_type = mod.manifest?.type
      if (mod_type === "expression") {
         return mod.getResource("expression").get()
      }
      else if (mod_type === "view") {
         return mod.getResource("view").get()
      }
   }
}

export function evaluateExpression(desc: ASTExpression): any {
   if (desc instanceof Object) {
      if (desc.type) {
         const handler = getExpressionHandler(desc.type)
         if (handler?.evaluate) {
            return handler?.evaluate(desc as ASTExpression)
         }
         else {
            console.error(new Error(`Value type '${desc.type}' is not evaluable`))
         }
      }
      else if (desc.$ref) {
         console.error(new Error(`Value reference '${desc.type}' is supported`))
      }
      else {
         console.error(new Error("mis formed value"))
      }
   }
   else {
      return desc
   }
}
