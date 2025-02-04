import { DocumentLayer, DXElement, CommonTypes } from '@livedoc/core'
import { EditionEnvironment } from '../elements/interfaces'

export class DescriptorEditionSelection extends EditionEnvironment {
   scope: DocumentLayer = null
   operator: DXElement = null
   constructor(readonly target: DXElement) {
      super()
      this.attachements["model"] = target.getModel()
      this.scope = target.layer
      this.operator = target.getOperator()
   }
   getName() {
      const xpr = this.target
      if (xpr) return xpr.name
      return ""
   }
   getTyping() {
      const xpr = this.target
      if (xpr) return xpr.getTyping() || CommonTypes.any
      return CommonTypes.any
   }
   getElement() {
      return this.target
   }
}
