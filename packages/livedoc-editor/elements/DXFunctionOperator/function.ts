import { DXElement, ModelBuilder, JSONSchema } from "@livedoc/core"
import { ExpressionTemplate, JSONMetaTemplate, JSONSchemaTemplate } from "@livedoc/core"
import { ModelContext, CommonTypes } from "@livedoc/core"

export class FunctionTemplate extends JSONSchemaTemplate {
   *getMetaMembers(): Generator<ExpressionTemplate> {
      yield new JSONMetaTemplate("callback", this.findMember("callback", true), CommonTypes.function, this, "code:symbol/function")
      yield new JSONMetaTemplate("run", this.findMember("run", true), CommonTypes.function, this, "code:symbol/event")
   }
}

export class DXFunctionCallback extends DXElement {
   static isMetaMember = true
   declare owner: DXFunctionOperator
   index: number = 0
   constructor(parent: DXFunctionOperator, builder: ModelBuilder) {
      super(parent.layer)
      this.name = "call"
      this.owner = parent
      this.index = builder.allocateState(this)
      this.layer.initiates.push(this)
   }
   override init(ctx: ModelContext) {
      ctx.states[this.index] = (...args) => {
         this.owner.call(ctx, args)
      }
   }
   override read(ctx: ModelContext): any {
      return ctx.states[this.index]
   }
}

export class DXFunctionRun extends DXElement {
   static isMetaMember = true
   declare owner: DXFunctionOperator
   index: number = 0
   constructor(parent: DXFunctionOperator, builder: ModelBuilder) {
      super(parent.layer)
      this.name = "run"
      this.owner = parent
      this.index = builder.allocateState(this)
      this.layer.initiates.push(this)
   }
   override init(ctx: ModelContext) {
      ctx.states[this.index] = () => {
         this.owner.apply(ctx)
      }
   }
   override read(ctx: ModelContext): any {
      return ctx.states[this.index]
   }
}

export class DXFunctionOperator extends DXElement {
   static type = "function"
   static icon = "code:symbol/function"
   schema: JSONSchema
   callback: Function = null
   args: DXElement[] = null

   state_index: number = 0

   call(ctx: ModelContext, args: any[]) {
      console.error("TODO")
   }

   override getTyping(): JSONSchema {
      return this.schema
   }
   override init(ctx: ModelContext) {
      ctx.states[this.state_index] = undefined
   }
   override read(ctx: ModelContext): any {
      return ctx.states[this.state_index]
   }
   override execute(ctx: ModelContext) {
      try {
         const args = this.args.map(x => x.read(ctx))
         const result = this.callback.apply(ctx, args)
         ctx.states[this.state_index] = result
      }
      catch (e) {
         console.error(e)
      }
   }
   override consolidate(builder: ModelBuilder) {
      const { args } = this
      for (let i = 0; i < args.length; i++) {
         args[i] = builder.consolidate(args[i], CommonTypes.any)
      }
   }
   override getTemplate(): ExpressionTemplate {
      return new FunctionTemplate(this.name, this, this.getTyping(), null)
   }
   override acquireMetaMember(name: string, builder: ModelBuilder): DXElement {
      switch (name) {
         case "run": return new DXFunctionRun(this, builder)
         case "callback": return new DXFunctionCallback(this, builder)
      }
      return null
   }
}
