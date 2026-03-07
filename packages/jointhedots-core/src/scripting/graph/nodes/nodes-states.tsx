import type { AST } from "../../ast/api.ts"
import type { DocumentPrimitive } from "../../ast/primitives.ts"
import { ContextInstance, Node, Task, State, type NodeSymbol, type Executor, type ContextController, type NodeNamespace, ContextModel, type FeatureID, GetterFeature, DisplayFeature } from "../model.ts"
import { Model } from "../register.ts"
import { UseAggregate, UseLink, UseReadable, ValueConstraint, type Use } from "../uses.ts"
import { Pipeline } from "../values.ts"
import { Literal } from "./nodes-expr.ts"
import React from "react"

export class DXElement extends Node<AST.ElementPrimitive> {
   get symbol(): NodeSymbol {
      const name = this.getAttribut("name", "as")
      if (name instanceof Literal) {
         return name.data.value as any
      }
   }
   getAttribut(name: string, ns?: string): Node {
      const { attributes } = this.data
      if (attributes) {
         for (const att of attributes) {
            if (att.ns === ns && att.name === name) {
               return this.model.getNode(att.value)
            }
         }
      }
      return null
   }
   use(fature: FeatureID, constraint: ValueConstraint): Use {
      return new UseRender(this, constraint)
   }
   toString() {
      const { symbol } = this
      return `<${this.data.tag} key="${this.$key}"${symbol ? ` name=${JSON.stringify(symbol)}` : ""}/>`
   }
}

class UseRender implements Use {
   constructor(readonly node: DXElement, constraint: ValueConstraint) {
   }
   get link() {
      return UseLink.Strong
   }
   get(ctx: ContextInstance) {
      //TODO: return this.node.
   }
}

@Model.Node({
   type: "state",
   async updateNode(n) {
      n.value = n.getAttribut("value").use(GetterFeature)
      n.state = n.$context.addState(undefined)
      n.task = n.$context.addTask(n)
   }
})
class DXVariable extends DXElement implements Executor {
   task: Task = null
   value: Use<any> = null
   state: State<any> = null
   read(ctx: ContextInstance) {
      return this.state.read(ctx)
   }
   init(ctx: ContextInstance) {
      this.state.write(ctx, this.value.get(ctx))
      ctx.schedule(this.task)
      return this.state.read(ctx)
   }
   update(ctx: ContextInstance) {
      this.state.write(ctx, this.value.get(ctx))
   }
   use(fature: FeatureID, constraint: ValueConstraint): Use {
      return new UseReadable(this, constraint)
   }
}

@Model.Node({
   type: "[error]",
   async updateNode(n) {
      if (!n.message) {
         n.message = `Node type '${n.data.type}' unknown`
         console.error(n.message)
      }
   }
})
class DXError extends Node {
   message: string
}


@Model.Node({
   type: "Document",
   async updateNode(n) {
      n.model.controller = n
      n.content = UseAggregate.create(n, n.data.content, [DisplayFeature, GetterFeature])
      n.task = n.$context.addTask(n)
      n.output = n.$context.addOutput()
   }
})
class DXDocument extends Node<DocumentPrimitive> implements ContextController, NodeNamespace, Executor {
   context = new ContextModel(this)
   content: UseAggregate = null
   task: Task = null
   output: State<Pipeline<React.ReactNode>> = null
   get $namespace(): NodeNamespace {
      return this
   }
   get $context(): ContextModel {
      return this.context
   }
   getControllerNode() {
      return this
   }
   apply(parent: ContextInstance) {
      const ctx = new ContextInstance(this.context, parent)
      const result = new Pipeline<React.ReactNode>()
      this.output.write(ctx, result)
      ctx.execute()
      result.emit(this.content.get(ctx)[0])
      return result
   }
   resolveIdentifier(symbol: NodeSymbol): Node {
      let member = this.context.members.get(symbol)
      if (member) return member
      return null
   }
   init(ctx: ContextInstance) {
   }
   update(ctx: ContextInstance) {
   }
}
