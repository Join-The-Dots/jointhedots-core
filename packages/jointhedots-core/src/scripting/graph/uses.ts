import type { AST } from "../ast/api.ts"
import { type Node, type ContextInstance, GetterFeature, type FeatureID } from "./model.ts"

export type ValueRecast = (x: any) => any

export class ValueType {
   accept(ty: ValueType): boolean {
      return this === ty
   }
   recastTo(ty: ValueType): ValueRecast {
      return null
   }
}

export class ValueConstraint {
   constructor(readonly accepteds: ValueType[]) {
   }
   accept(ty: ValueType): boolean {
      for (const cty of this.accepteds) {
         if (cty.accept(ty) === true) return true
      }
      return false
   }
}

export abstract class BasicType extends ValueType {
   override accept(ty: ValueType): boolean {
      return true
   }
   override recastTo(ty: ValueType): ValueRecast {
      return (x) => x
   }
}

export class NumberType extends BasicType {
   static Self = new NumberType()
   override accept(ty: ValueType): boolean {
      return ty instanceof NumberType
   }
   override recastTo(ty: ValueType): ValueRecast {
      return null
   }
}

export class StringType extends BasicType {
   static Self = new StringType()
   override accept(ty: ValueType): boolean {
      return ty instanceof StringType
   }
   override recastTo(ty: ValueType): ValueRecast {
      return (x) => "" + x
   }
}

export class AnyType extends ValueType {
   static Self = new AnyType()
   static Constraint = new ValueConstraint([AnyType.Self])
   override accept(ty: ValueType): boolean {
      return true
   }
   override recastTo(ty: ValueType): ValueRecast {
      return (x) => x
   }
}

export type ObjectClass = new (...args) => any

export class ObjectType extends ValueType {
   static Self = new ObjectType(Object)
   constructor(readonly ctor: ObjectClass) {
      super()
   }
   override accept(ty: ValueType): boolean {
      if (ty instanceof ObjectType) {
         return isInheritedOf(ty.ctor, this.ctor)
      }
      return true
   }
}

export class JSXType extends ValueType {
   static Self = new JSXType()
   static Constraint = new ValueConstraint([JSXType.Self])

   override accept(ty: ValueType) {
      /*type ReactNode =
        | ReactElement
        | string
        | number
        | bigint
        | Iterable<ReactNode>
        | ReactPortal
        | boolean
        | null
        | undefined
        | Promise<AwaitedReactNode>;*/
      return ty === JSXType.Self || ty instanceof BasicType
   }
}

export enum UseLink {
   Strong,
   Weak,
}

export interface Use<T = any> {
   readonly link: UseLink
   get(ctx: ContextInstance): T
}

export class UseList<T = any> extends Array<Use<T>> {
   get(ctx: ContextInstance) {
      return this.map(x => x.get(ctx))
   }
   static create(user: Node, items: AST.Any[], constraint?: ValueConstraint): UseList {
      const list = new UseList(items.length)
      for (let i = 0; i < items.length; i++) {
         list[i] = user.model.getNode(items[i]).use(GetterFeature, constraint)
      }
      return list
   }
}

export class UseAggregate extends Array<Use> {
   mapping: Uint8Array
   constructor(
      length: number,
      readonly buckets: FeatureID[],
   ) {
      super(length)
      this.mapping = new Uint8Array(length)
   }
   get(ctx: ContextInstance) {
      const { mapping } = this
      const results = this.buckets.map(() => [])
      for (let i = 0; i < this.length; i++) {
         results[mapping[i]].push(this[i].get(ctx))
      }
      return results
   }
   static create(user: Node, items: AST.Any[], buckets: FeatureID[]): UseAggregate {
      const list = new UseAggregate(items.length, buckets)
      for (let i = 0; i < items.length; i++) {
         const node = user.model.getNode(items[i])
         let matched = null, k = -1
         while (k < buckets.length && !matched) {
            matched = node.use(buckets[++k])
         }
         if (matched) {
            list[i] = matched
            list.mapping[k] = k
         }
         else {
            throw new Error(`Node '${node}' cannot provide value`)
         }
      }
      return list
   }
}

export function isInheritedOf(cls: ObjectClass, parent: ObjectClass): boolean {
   if (typeof cls !== "function" || typeof parent !== "function") return false
   if (cls === parent) return true
   let proto = Object.getPrototypeOf(cls)
   while (proto && proto !== Function.prototype) {
      if (proto === parent) return true
      proto = Object.getPrototypeOf(proto)
   }
   return false
}


export interface Displayable {
   display(ctx: ContextInstance): React.ReactNode
}
export class UseDisplayable implements Use {
   constructor(readonly node: Displayable, constraint: ValueConstraint) {
   }
   get link() {
      return UseLink.Strong
   }
   get(ctx: ContextInstance): React.ReactNode {
      return this.node.display(ctx)
   }
}


export interface Readable {
   read(ctx: ContextInstance): any
}
export class UseReadable implements Use {
   constructor(readonly node: Readable, constraint: ValueConstraint) {
   }
   get link() {
      return UseLink.Strong
   }
   get(ctx: ContextInstance): React.ReactNode {
      return this.node.read(ctx)
   }
}
