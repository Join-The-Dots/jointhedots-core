import { EditionDriver, EditorValueMatch, IEditionEnvironment, IEditionOperation, IEditorProvider } from "./editor-context"
import { MapLike } from "@sf-explorer/core"
import { JSONSchema } from "@sf-explorer/core"
import * as AST from '@sf-explorer/core'

export abstract class DescriptorEditionContext implements IEditionEnvironment {
   operations = new Set<IEditionOperation>
   attachements = {}
   get editing(): boolean {
      return this.operations.size > 0
   }
   getAttachment<T = any>(name: string): T {
      return this.attachements[name]
   }
   registerOperation(op: IEditionOperation) {
      this.operations.add(op)
   }
   unregisterOperation(op: IEditionOperation) {
      this.operations.delete(op)
   }
   validate() {
      for (const op of this.operations.values()) {
         op.validate()
      }
   }
   cancel() {
      for (const op of this.operations.values()) {
         op.cancel()
      }
   }
}
