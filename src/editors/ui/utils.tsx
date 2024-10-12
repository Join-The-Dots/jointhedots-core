import { EditionController, EditorValueMatch, IEditionContext, IEditionOperation, IEditorProvider } from "."
import { MapLike } from "@livedoc/core/common"
import { JSONSchema } from "@livedoc/core/ast/schema"
import * as AST from '@livedoc/core/ast/nodes'

export abstract class DescriptorEditionContext implements IEditionContext {
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
