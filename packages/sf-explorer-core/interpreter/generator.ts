import * as AST from "../ast/nodes"
import { MapLike } from "../common/types"
import { DocumentModel, Expr } from "./exprs"

export interface IGenerator {
   generateXpr(from: Expr, target: Expr): AST.Any
}

export class SubTreeGenerator implements IGenerator {
   generateXpr(from: Expr, target: Expr): AST.Any {
      if (from === null || from === target.owner) {
         return target.exportAST(this)
      }
      return {
         $ref: target.$key,
      } as AST.LDXReference
   }
}

export class FlatTreeGenerator implements IGenerator {
   nodes: MapLike<AST.Any> = {}
   generateXpr(from: Expr, target: Expr): AST.Any {
      return {
         $ref: target.$key,
      } as AST.LDXReference
   }
   generateModel(model: DocumentModel) {
      for (const xpr of model.nodes.values()) {
         xpr.exportAST(this)
      }
      return {
         id: model.id,
         nodes: this.nodes,
      }
   }
}
