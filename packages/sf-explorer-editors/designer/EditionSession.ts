import { CommonTypes, DocumentLayer, DocumentModel, Element } from "@sf-explorer/core/index"
import { EditionEnvironment } from "../elements/interfaces"

export interface IModelEditionContext {
   updateModel(): Promise<void>
   unselect()
}

export class ModelEditionSession {
   //history = new AstHistoryMap<ASTRoutine>()
   constructor(readonly model: DocumentModel, readonly context: IModelEditionContext) {
   }
}

export class ElementEditionSelection extends EditionEnvironment {
   constructor(public element: Element, readonly session: ModelEditionSession) {
      super()
      this.attachements["model"] = session.model
   }
   getName() {
      return this.element.toTitle()
   }
   getTyping() {
      return this.element.typing
   }
   getExpression() {
      return this.element
   }
 /*   update(element: Element) {
       const { context, history } = this.session
       const prevContent = history.lastVersion()
       if (prevContent.revision === this.location.revision) {
          this.descriptor = descriptor
          history.setAtPath(this.location.path, descriptor)
          context.updateModel()
       }
       else {
          console.error(new Error(`Location revision unmatch, expect:${this.location.revision}, have:${prevContent.revision}`))
          context.unselect()
       }
   } */
}
