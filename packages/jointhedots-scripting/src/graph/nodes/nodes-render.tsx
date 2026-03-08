import type { AST } from "../../ast/mod.ts"
import { DisplayFeature, GetterFeature, Node, type ContextInstance, type FeatureID } from "../model.ts"
import { Model } from "../register.ts"
import { AnyType, JSXType, UseAggregate, UseDisplayable, UseLink, UseList, UseReadable, ValueConstraint, type Use } from "../uses.ts"
import { DXElement } from "./nodes-states.tsx"


class GRHTMLElement extends DXElement {
   children: UseList<any>
   display(ctx: ContextInstance) {
      return this.children.get(ctx)[0]
   }
   use(feature: FeatureID, constraint: ValueConstraint): Use {
      return new UseDisplayable(this, constraint)
   }
}

const HTMLTags = ["p", "span", "div", "h1", "h2", "h3", "h4"]

HTMLTags.forEach(tag => {
   Model.classes.set(tag, {
      getConstructor() {
         return GRHTMLElement
      },
      linkNode(n: GRHTMLElement) {
      },
      async updateNode(n: GRHTMLElement) {
         n.children = UseAggregate.create(n, n.data.content, [DisplayFeature, GetterFeature])
      },
   })
})

@Model.Node({
   type: "Block",
   async updateNode(n) {
      n.content = UseAggregate.create(n, n.data.content, [DisplayFeature, GetterFeature])
   }
})
class GRBlock extends Node<AST.BlockPrimitive> {
   content: UseList<any>
   get link() { return UseLink.Strong }
   display(ctx: ContextInstance) {
      return this.content.get(ctx)[0]
   }
   use(feature: FeatureID, constraint: ValueConstraint): Use {
      return new UseDisplayable(this, constraint)
   }
}
