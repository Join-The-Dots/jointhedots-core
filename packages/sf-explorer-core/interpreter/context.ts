import * as AST from "../ast/nodes"
import { MapLike } from "../common/types"

export interface IContext {
   getThis(): any
   getValue(id: string): any
   setValue(id: string, value: any): void
}

export class LocalContext implements IContext {
   locals: MapLike<any> = {}
   constructor(
      readonly $parentScope: IContext,
      readonly $thisScope: any,
   ) {
   }
   getThis(): any {
      return this.$thisScope
   }
   getValue(id: string): any {
      if (Object.hasOwn(this.locals, id)) {
         return this.locals[id]
      }
      else if (this.$parentScope) {
         return this.$parentScope.getValue(id)
      }
      return undefined
   }
   setValue(id: string, value: any): void {
      if (Object.hasOwn(this.locals, id)) {
         this.locals[id] = value
      }
      return this.$parentScope?.setValue(id, value)
   }
   setArguments(args: any[], params: AST.Pattern[]) {
      this.locals.arguments = args
      for (let i = 0; i < params.length; i++) {
         const param = params[i] as AST.Identifier
         this.locals[param.name] = args[i]
      }
   }
}

export const EmptyContext = new LocalContext(null, null)
