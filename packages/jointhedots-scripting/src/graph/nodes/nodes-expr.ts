import type { AST } from "../../ast/mod.ts"
import { ENHANCED_BINARY_OPERATIONS } from "../../interpreter.ts"
import { ContextInstance, ContextModel, FlowControl, Node, State, GetterFeature, type ContextController, type FeatureID, SetterFeature, DisplayFeature } from "../model.ts"
import { Model } from "../register.ts"
import { UseLink, ValueConstraint, type Use } from "../uses.ts"

export abstract class DXExpr<Data extends AST.Node = AST.Any, Value = any> extends Node<Data> {
   abstract evaluate(ctx: ContextInstance): any
   use(feature: FeatureID, constraint: ValueConstraint): Use {
      if (feature === GetterFeature) {
         return new UseGetterEval(this as DXExpr, constraint)
      }
      else if (feature === DisplayFeature) {
         return new UseDisplayEval(this as DXExpr)
      }
   }
}

class UseGetterEval implements Use {
   constructor(readonly xpr: DXExpr, readonly constraint: ValueConstraint) {
   }
   get link() {
      return UseLink.Strong
   }
   get(ctx: ContextInstance) {
      return this.xpr.evaluate(ctx)
   }
}

class UseDisplayEval implements Use {
   constructor(readonly xpr: DXExpr) {
   }
   get link() {
      return UseLink.Strong
   }
   get(ctx: ContextInstance) {
      return this.xpr.evaluate(ctx)
   }
}

@Model.Node({
   type: "Literal",
   async updateNode(n) {
      n.value = n.data.value
   }
})
export class Literal extends DXExpr<AST.Literal> {
   value: any = void 0
   evaluate(ctx: ContextInstance) {
      return this.value
   }
}

@Model.Node({
   type: "Identifier",
   linkNode(n) {
      n.target = n.$namespace.resolveIdentifier(n.data.name)
      if (!n.target) throw new Error(`Identifier ${n.data.name} not found`)
   },
   async updateNode(n) {
   }
})
export class Identifier extends Node<AST.Identifier> {
   target: Node
   use(feature: FeatureID, constraint: ValueConstraint): Use {
      return this.target.use(feature, constraint)
   }
}

@Model.Node({
   type: "BinaryExpression",
   async updateNode(n) {
      n.operation = ENHANCED_BINARY_OPERATIONS.get(n.data.operator)
      n.left_use = n.model.getNode(n.data.left).use(GetterFeature)
      n.right_use = n.model.getNode(n.data.right).use(GetterFeature)
   }
})
class BinaryExpression extends DXExpr<AST.BinaryExpression> {
   operation: (left: any, right: any) => any = null
   left_use: Use<any>
   right_use: Use<any>
   evaluate(ctx: ContextInstance) {
      return this.operation(this.left_use.get(ctx), this.right_use.get(ctx))
   }
}

@Model.Node({
   type: "BlockStatement",
   async updateNode(n) {
      n.scope = new ContextModel(n)
   }
})
class BlockStatement extends DXExpr<AST.BlockStatement> implements ContextController {
   //TOREWORK: block is not an expression
   scope: ContextModel = null
   state: State<ContextInstance> = null
   getControllerNode(): Node {
      return this
   }
   evaluate(ctx: ContextInstance) {
      return this.scope.output?.read(ctx)
   }
   execute(ctx: ContextInstance) {
      const block_ctx = new ContextInstance(this.scope, ctx)
      this.state.write(ctx, block_ctx)
      ctx.control = FlowControl.Exit
      this.state.write(ctx, null)
   }
   apply() {
      //this.body.cre
      //this.body.execute()
   }
}

@Model.Node({
   type: "FunctionDeclaration",
   async updateNode(n) {
      n.body = new ContextModel(n)
   }
})
class FunctionDeclaration extends DXExpr<AST.FunctionDeclaration> implements ContextController {
   body: ContextModel
   getControllerNode(): Node {
      return this
   }
   evaluate(ctx: ContextInstance) {
      return (...args) => {
         return this.apply()
      }
   }
   apply() {
      //this.body.cre
      //this.body.execute()
   }
}

@Model.Node({
   type: "ReturnStatement",
   async updateNode(n) {
      n.argument_node = n.model.getNode(n.data.argument)
      n.argument_use = n.argument_node.use(GetterFeature)
      n.output = n.$context.addOutput()
   }
})
class ReturnStatement extends DXExpr<AST.ReturnStatement> {
   operation: (left: any, right: any) => any = null
   argument_node: Node
   argument_use: Use<any>
   output: State<any>
   evaluate(ctx: ContextInstance) {
      this.output.write(ctx, this.argument_use.get(ctx))
      ctx.control = FlowControl.Exit
   }
}
