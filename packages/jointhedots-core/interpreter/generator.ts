import * as AST from "../ast/nodes"
import { Element } from "./elements"

export class ASTGenerator {
   generate(from: Element, target: Element): AST.Any {
      if (from === null || from === target.owner) {
         return target.exportAST(this)
      }
      return {
         $ref: target.$key,
      } as AST.LDXReference
   }
}

