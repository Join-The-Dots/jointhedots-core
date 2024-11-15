import { CommonTypes, DocumentLayer, DocumentModel, Expr } from "@sf-explorer/core/index"
import { EditionEnvironment } from "../ui/editor-context"

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
   constructor(public element: Expr, readonly session: ModelEditionSession) {
      super()
      this.attachements["model"] = session.model
   }
   getName() {
      return "<todo>"
   }
   getTyping() {
      return this.element.typing
   }
   getExpression() {
      return this.element
   }
   update(element: Expr) {
      /*  const { context, history } = this.session
       const prevContent = history.lastVersion()
       if (prevContent.revision === this.location.revision) {
          this.descriptor = descriptor
          history.setAtPath(this.location.path, descriptor)
          context.updateModel()
       }
       else {
          console.error(new Error(`Location revision unmatch, expect:${this.location.revision}, have:${prevContent.revision}`))
          context.unselect()
       } */
   }
}
