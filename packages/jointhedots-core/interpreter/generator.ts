import * as AST from "../ast/nodes"
import { DXElement } from "./elements"

export class ASTGenerator {
   generate(from: DXElement, target: DXElement): AST.Any {
      if (from === null || from === target.owner) {
         return target.exportAST(this)
      }
      return {
         $ref: target.$key,
      } as AST.LDXReference
   }
}

