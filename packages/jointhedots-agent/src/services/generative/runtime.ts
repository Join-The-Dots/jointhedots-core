import { IGenerativeModel, MessageFrame, CompletionResult } from "./model"
import { ActionUnit, Content, FeedbackUnit, SemanticUnit, TextualUnit } from "./resource"
import { Contribution as ContributionBase, IContributionContext, ContributionSpec, Target, ToolID, ToolGuide, IEnvironment, IToolsProvider, ToolSelector, ContributionData, StandardToolID } from "./context"
import { Resource } from "./resource"
import { ZodType } from "zod"
import { Async, listOneOrMany, OneOrMany } from "../../common/types"

type ContributionEventCb = (target: Contribution, event: string) => void

const HookSymbol = Symbol("hook")

// Target condition based on function matching achievement
export class TargetMatcher extends Target {
   constructor(
      readonly matcher: (contrib: Contribution, ctx: IContributionContext) => Async<boolean>,
   ) { super() }
   getTool(ctx: IContributionContext): ToolGuide {
      return null
   }
   check(contrib: Contribution, ctx: IContributionContext): Async<boolean> {
      return this.matcher(contrib, ctx)
   }
}


// Target condition based on tool invokation
export class TargetTool extends Target {
   tool_id: ToolID = null
   getTool(ctx: StandardContributionContext): ToolGuide {
      return ctx.env.getTool(this.tool_id)
   }
   check(contrib: Contribution, ctx: IContributionContext): Async<boolean> {
      const { data } = contrib
      const { actions } = data
      for (const key in actions) {
         if (actions[key].tool_id == this.tool_id) {
            if (data.output === undefined) {
               data.output = actions[key].output
            }
            return true
         }
      }
      return false
   }
   static New(tool_id: ToolID): TargetTool {
      const self = new TargetTool()
      self.tool_id = tool_id
      return self
   }
}

// Target condition based on tool invokation
export class TargetOutput extends Target {
   id = StandardToolID.Output
   schema: ZodType = null
   getTool(ctx: IContributionContext): ToolGuide {
      return {
         id: StandardToolID.Output,
         label: "StructuredOutput",
         intent: "Fill output based on schema",
         input: this.schema,
      }
   }
   check(contrib: Contribution, ctx: IContributionContext): Async<boolean> {
      const { data } = contrib
      const { actions } = data
      for (const key in actions) {
         if (actions[key].tool_id == this.id) {
            if (data.output === undefined) {
               data.output = actions[key].input
            }
            return true
         }
      }
      return false
   }
   static New(schema: ZodType): TargetOutput {
      const self = new TargetOutput()
      self.schema = schema
      return self
   }
}

export function mergeToolGuides(...lists: ToolGuide[][]): Record<ToolID, ToolGuide> {
   const map: Record<ToolID, ToolGuide> = {}
   for (const list of lists) {
      if (!list) continue
      for (const tool of list) map[tool.id] = tool
   }
   return map
}

class Contribution extends ContributionBase {
   [HookSymbol]: ContributionHook
   constructor(id: string) {
      super()
      this.id = id
   }
   wait(): Promise<Contribution> {
      let hook = this[HookSymbol]
      if (!hook) hook = new ContributionHook(this)
      return hook.wait()
   }
   toSemantic() {
      return this.data.message
   }
}

class ContributionHook {
   done: boolean = false
   listeners: ContributionEventCb[] = []
   constructor(public target: Contribution) {
      this.target[HookSymbol] = this
   }
   wait(): Promise<Contribution> {
      return new Promise((resolve, reject) => {
         if (!this.listeners) this.listeners = []
         this.listeners.push((target, event) => {
            if (target.status === "success") {
               resolve(target)
            }
            else if (target.status === "failed") {
               reject(target)
            }
         })
      })
   }
   complete() {
      for (const listener of this.listeners) {
         listener(this.target, "success")
      }
      this.listeners = null
      this.target[HookSymbol] = null
      this.target = null
   }
}

class StandardEnvironment implements IEnvironment {
   private providers: IToolsProvider[] = []
   private toolIndex = new Map<string, IToolsProvider>()

   getTool(tool_id: string): ToolGuide {
      return this.selectTools([tool_id])?.[0]
   }
   Tool(tool_id: string): ToolGuide {
      return this.selectTools([tool_id])?.[0]
   }

   equip(provider: IToolsProvider): void {
      this.providers.push(provider)
      for (const tool of provider.getTools()) {
         this.toolIndex.set(tool.id, provider)
      }
   }

   selectTools(selector?: ToolSelector): ToolGuide[] {
      if (!selector || selector.includes("*")) {
         return this.providers.flatMap(p => p.getTools())
      }
      const tools = new Map<string, ToolGuide>()
      const list = this.providers.flatMap(p => p.getTools())
      for (const sel of selector) {
         let matched = false
         for (const tool of list) {
            if (this.matchesSingleSelector(tool.id, sel)) {
               tools.set(tool.id, tool)
               matched = true
            }
         }
         if (!matched) {
            throw new Error(`No tools matched selector: ${sel}`)
         }
      }
      return Array.from(tools.values())
   }

   private matchesSingleSelector(toolId: string, sel: string): boolean {
      if (sel === "*" || sel === toolId) return true
      if (sel.endsWith(".*") && toolId.startsWith(sel.slice(0, -1))) return true
      return false
   }

   async executeTool(task: ActionUnit, context: IContributionContext): Promise<OneOrMany<SemanticUnit>> {
      console.log(task)
      const provider = this.toolIndex.get(task.tool_id)
      if (!provider) {
         return TextualUnit.New(`Tool not found: ${task.tool_id}`)
      }
      const session = await provider.createSession()
      try {
         return await provider.invokeTool(task.tool_id, task.tool_input, session, context)
      } finally {
         provider.disposeSession(session)
      }
   }
}

class StandardContributionContext implements IContributionContext {
   env: IEnvironment
   model: IGenerativeModel
   contributions = new Map<string, Contribution>()
   resources = new Map<string, Resource>()
   nextId = 1

   constructor(model: IGenerativeModel, env: IEnvironment) {
      this.model = model
      this.env = env
   }

   emit(data: ContributionData, spec?: ContributionSpec): Contribution {
      const contrib = new Contribution(`c${this.nextId++}`)
      contrib.status = "success"
      contrib.spec = spec || null
      contrib.data = data || contrib.data || {}
      this.contributions.set(contrib.id, contrib)
      return contrib
   }

   getResource(uri: string): Resource {
      let res = this.resources.get(uri)
      if (res) return res

      const [scheme, id] = uri.split(":", 2)
      if (scheme === "contrib") {
         return this.contributions.get(id)
      }
      return null
   }

   async fetchResource(uri: string): Promise<Resource> {
      const found = this.getResource(uri)
      if (found) return found

      throw new Error("Resource not found at: " + uri)
   }

   generate(spec: ContributionSpec): Contribution {
      const contrib = this.emit(null, spec)
      setTimeout(() => generateContribution(contrib, this))
      return contrib
   }
}


async function generateContribution(contrib: Contribution, ctx: StandardContributionContext) {
   const { spec } = contrib

   // Execute target reaching logic
   if (spec.objective) {

      // Collect targeted tools
      const targets: ToolGuide[] = []
      for (const target of listOneOrMany(spec.objective)) {
         const tool = target.getTool(ctx)
         if (tool) targets.push(tool)
      }

      // Execute model
      let requiredToolsTryCount = 0
      while (1) {
         const frames = enframeContributionSpec(spec, ctx)
         const tools = mergeToolGuides(spec.tooling && ctx.env.selectTools(spec.tooling), targets)
         const requiredTools = (requiredToolsTryCount > 0 && targets.length > 0) ? targets : false

         // Generate semantic units
         const response = await ctx.model.generate({ frames, tools, requiredTools })
         contrib.emit("message", response.items)

         // Execute tools
         const called = await executeTools(contrib, ctx)

         // Check for continuation
         if (checkTargetReaching(contrib, ctx)) {
            break
         }
         if (called === 0) {
            if (requiredToolsTryCount > 0) {
               console.log("> Failed to reach target")
            }
            requiredToolsTryCount++
         }
         shiftContribution(contrib, ctx)
      }
   }
   // Execute output without targets
   else {
      const frames = enframeContributionSpec(spec, ctx)
      const tools = mergeToolGuides(spec.tooling && ctx.env.selectTools(spec.tooling))
      const res = await ctx.model.generate({ frames, tools, requiredTools: false })
      contrib.emit("message", res.items)
   }

   contrib.status = "success"
   contrib[HookSymbol]?.complete?.()
}

async function executeTools(contrib: Contribution, ctx: StandardContributionContext): Promise<number> {
   const { data } = contrib
   let called = 0
   for (const item of contrib.iter("message")) {
      if (item instanceof ActionUnit) {
         const result = await ctx.env.executeTool(item, ctx)
         if (!data.actions) data.actions = {}
         data.actions[item.action_id] = {
            tool_id: item.tool_id,
            input: item.tool_input,
            output: result,
         }
         contrib.emit("message", FeedbackUnit.Done(
            item.action_id,
            result,
         ))
         called++
      }
   }
   return called
}

function checkTargetReaching(contrib: Contribution, ctx: IContributionContext): boolean {
   const { spec } = contrib
   let unmatched = 0
   if (spec) {
      for (const target of listOneOrMany(spec.objective)) {
         if (target.check(contrib, ctx)) {
            return true
         }
         unmatched++
      }
   }
   return unmatched === 0
}

function shiftContribution(base: Contribution, ctx: IContributionContext) {

   // Move some state into an intermediate contribution
   const inserted = ctx.emit({
      message: base.data.message,
   }, {
      ...base.spec,
      objective: undefined,
   })

   // Remove duplication from base
   base.spec.message = undefined
   base.spec.directive = undefined
   base.spec.history = inserted
   base.data.message = undefined
}

function enframeContributionSpec(spec: ContributionSpec, ctx: IContributionContext): MessageFrame[] {
   const frames: MessageFrame[] = []

   const serializeContent = (val: any, out: SemanticUnit[]): SemanticUnit[] => {
      if (val instanceof Object) {
         if (Array.isArray(val)) {
            val.forEach(x => serializeContent(x, out))
         } else if (val instanceof Contribution) {
            const message = val.data?.message
            if (message) out.push(...message)
         } else if (val instanceof Resource) {
            serializeContent(val.toSemantic(), out)
         } else if (val instanceof SemanticUnit) {
            out.push(val)
         }
      }
      return out
   }

   const unrollContent = (value: OneOrMany<Content>, role: MessageFrame["role"]) => {
      if (!value) return
      const items = serializeContent(value, [])
      if (items.length > 0) {
         frames.push({ role, items })
      }
   }

   const unrollHistory = (value: OneOrMany<Contribution>, excludeSystem: boolean) => {
      if (!value) return
      for (const contrib of listOneOrMany(value)) {
         if (contrib.spec) {
            let historyFrames = enframeContributionSpec(contrib.spec, ctx)
            if (excludeSystem) {
               historyFrames = historyFrames.filter(f => f.role !== "system")
            }
            frames.push(...historyFrames)
         }
         unrollContent(contrib, "self")
      }
   }

   unrollContent(spec.system, "system")
   unrollHistory(spec.history as OneOrMany<Contribution>, !!spec.system)
   unrollContent(spec.message, "agent")
   unrollContent(spec.directive, "directive")

   return frames
}

export function createEnvironment(): StandardEnvironment {
   return new StandardEnvironment()
}

export function createContext(model: IGenerativeModel, env: IEnvironment): IContributionContext {
   return new StandardContributionContext(model, env)
}
