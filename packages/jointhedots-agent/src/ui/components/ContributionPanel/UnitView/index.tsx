import { ComponentType } from "react"
import { SemanticUnit, TextualUnit, VisualUnit } from "../../../../services/semantic/units"

export type Props = {
   data: SemanticUnit
}

export class ObjectInheritanceMap<T> {
   private mapping = new Map<Function, T>()
   get(object: Object): T {
      for (let ctor = object.constructor; ctor; ctor = ctor.prototype) {
         let found = this.mapping.get(ctor)
         if (found) return found
      }
      return null
   }
   set(ctor: new (...args) => Object, value: T): this {
      this.mapping.set(ctor, value)
      return this
   }
   delete(ctor: new (...args) => Object) {
      this.mapping.delete(ctor)
   }
}

const unitView = new ObjectInheritanceMap<ComponentType<Props>>()
   .set(Object, UnknownUnitView)
   .set(TextualUnit, TextualUnitView)
   .set(VisualUnit, VisualUnitView)

export function UnitView(props: Props) {
   const { data } = props
   const View = unitView.get(data) || UnknownUnitView
   return <View {...props} />
}

export function UnknownUnitView(props: {
   data: SemanticUnit
}) {
   const { data } = props
   return <div>{"Unsupported"}</div>
}

export function TextualUnitView(props: {
   data: TextualUnit
}) {
   const { data } = props
   return <div>image</div>
}

export function VisualUnitView(props: {
   data: VisualUnit
}) {
   const { data } = props
   return <div>image</div>
}
