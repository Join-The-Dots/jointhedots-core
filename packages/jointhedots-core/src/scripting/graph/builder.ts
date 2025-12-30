
import type { DocumentData } from "./log.ts"
import { ContextInstance, DocumentModel, type Node, type NodeClass, type NodeSymbol } from "./model.ts"
import { Model } from "./register.ts"

export interface GraphScriptResolver {
   resolveNodeClass(type: string): NodeClass
}

export class GraphBuilder {
   unconsolidatedElements = new Set<Node>()
   constructor(
      readonly model: DocumentModel,
      readonly data: DocumentData,
      readonly resolver: GraphScriptResolver,
   ) { }
   revise(target: Node) {
      this.unconsolidatedElements.add(target)
   }
}

export function createGlobalResolver(): GraphScriptResolver {
   return {
      resolveNodeClass(type: string): NodeClass {
         return Model.classes.get(type)
      },
   }
}

export function updateModel(b: GraphBuilder) {
   const { model, data } = b

   // Instanciates new nodes
   for (const [k, n] of data.nodes.entries()) {
      let node = model.nodes.get(k)
      let cls = b.resolver.resolveNodeClass(n.type === "Element" ? n.tag : n.type)
      if (!cls) {
         cls = b.resolver.resolveNodeClass("[error]")
      }
      if (node?.$class !== cls) {
         const Cls = cls.getConstructor()
         model.nodes.set(k, new Cls(k, cls, model))
      }
   }

   // Connect nodes to their owner
   for (const [k, n] of data.nodes.entries()) {
      let node = model.nodes.get(k)
      node.$owner = model.nodes.get(n.$owner)
   }

   // Update nodes namespace/scope
   for (const node of model.nodes.values()) {
      const { symbol } = node
      if (symbol) {
         const context = node.$context
         context.addMember(symbol, node)
      }
   }

   // Ask node to update their data and uses
   for (const node of model.nodes.values()) {
      node.$class.linkNode(node)
   }

   // Ask node to update their data and uses
   for (const node of model.nodes.values()) {
      node.$class.updateNode(node)
   }

   // Instanciate main scope
   const { controller } = model
   if (!controller || controller.getControllerNode() !== model.nodes.get(0)) {
      throw new Error(`Document root node shall be the document controller`)
   }
   model.globalInstance = new ContextInstance(model.globalModel, null)
}
