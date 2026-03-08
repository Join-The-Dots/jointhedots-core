import type { Node, NodeClass, NodeCtor } from "./model.ts"

type NodeTag = string | symbol

class ModelRegister {
   classes = new Map<NodeTag, NodeClass>()

   Node<T extends Node>(config: {
      type: NodeTag
      linkNode?: (n: T) => void
      updateNode?: (n: T) => Promise<void>
   }) {
      return (constructor: NodeCtor<T>) => {
         const nodeClass: NodeClass = {
            getConstructor(): NodeCtor {
               return constructor
            },
            async linkNode(n: T): Promise<void> {
               if (config.linkNode) {
                  return config.linkNode(n)
               }
            },
            async updateNode(n: T): Promise<void> {
               if (config.updateNode) {
                  return config.updateNode(n)
               }
            }
         }
         this.classes.set(config.type, nodeClass)
         return constructor
      }
   }

   getNodeClassOf(ctor: any) {
      for (const cls of this.classes.values()) {
         if (cls.getConstructor() == ctor) {
            return cls
         }
      }
      return null
   }
}

export const Model = new ModelRegister()

