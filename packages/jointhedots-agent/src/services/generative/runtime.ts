import { IGenerativeModel, MessageFrame, CompletionResult } from "./model"
import { ActionUnit, FeedbackUnit, SemanticUnit, TextualUnit } from "../semantic/units"
import { Contribution as ContributionBase, ContributionSpec, Target, ToolID, ToolGuide, IAgenticWorkbench, IToolsProvider, ToolSelector, ContributionData, StandardToolID, Tooling, IAgenticPattern, ToolSet } from "./context"
import { ZodType } from "zod"
import { Async, listOneOrMany, OneOrMany } from "@jointhedots/core"
import { Resource } from "../semantic/resource"

type ContributionEventCb = (target: Contribution, event: string) => void

const HookSymbol = Symbol("hook")

// Target condition based on function matching achievement
export class TargetMatcher extends Target {
   constructor(
      readonly matcher: (contrib: Contribution) => Async<boolean>,
   ) { super() }
   getTool(): ToolGuide {
      return null
   }
   executeTool(action: ActionUnit) {
      return undefined
   }
   check(contrib: Contribution): Async<boolean> {
      return this.matcher(contrib)
   }
}


// Target condition based on tool invokation
export class TargetTool extends Target {
   tool_id: ToolID = null
   getTool(env: IAgenticWorkbench): ToolGuide {
      return env.selectTools(this.tool_id)[this.tool_id]
   }
   executeTool(action: ActionUnit, env: IAgenticWorkbench) {
      return env.executeTool(action)
   }
   check(contrib: Contribution): Async<boolean> {
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
   getTool(): ToolGuide {
      return {
         id: StandardToolID.Output,
         label: "StructuredOutput",
         intent: "Fill output based on schema",
         input: this.schema,
      }
   }
   executeTool(action: ActionUnit) {
      return action.tool_input
   }
   check(contrib: Contribution): Async<boolean> {
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
   constructor(
      readonly id: string,
      readonly env: IAgenticWorkbench,
   ) {
      super()
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

class StandardEnvironment implements IAgenticWorkbench {
   private providers: IToolsProvider[] = []
   private toolIndex = new Map<string, IToolsProvider>()
   resources = new Map<string, Resource>()
   derived: StandardEnvironment = null
   nextId = 0
   model: IGenerativeModel = null

   emit(spec: ContributionSpec, data?: ContributionData): Contribution {
      const contrib = new Contribution(`c${this.nextId++}`, this)
      contrib.spec = spec || null
      this.putResource(contrib)
      if (data !== undefined) {
         contrib.status = "success"
         Object.assign(contrib.data, data)
      }
      else {
         contrib.status = "running"
         setTimeout(() => {
            const pattern = contrib.spec.pattern || new DirectAgenticPattern()
            pattern.execute(contrib)
         })
      }
      return contrib
   }

   getModel() {
      return this.model
   }
   equipModel(model: IGenerativeModel) {
      this.model = model
   }

   getTool(tool_id: string): ToolGuide {
      return this.selectTools([tool_id])[tool_id]
   }
   equipTools(provider: IToolsProvider): void {
      this.providers.push(provider)
      for (const tool of provider.getTools()) {
         this.toolIndex.set(tool.id, provider)
      }
   }
   selectTools(selector?: OneOrMany<ToolSelector>): ToolSet {
      const tools: ToolSet = this.derived ? this.derived.selectTools(selector) : {}
      const list = this.providers.flatMap(p => p.getTools())
      for (const sel of listOneOrMany(selector)) {
         let matched = false
         for (const tool of list) {
            if (this.matchesSingleSelector(tool.id, sel)) {
               tools[tool.id] = tool
               matched = true
            }
         }
         if (!matched) {
            throw new Error(`No tools matched selector: ${sel}`)
         }
      }
      return tools
   }

   private matchesSingleSelector(toolId: string, sel: string): boolean {
      if (sel === "*" || sel === toolId) return true
      if (sel.endsWith(".*") && toolId.startsWith(sel.slice(0, -1))) return true
      return false
   }

   async executeTool(task: ActionUnit): Promise<OneOrMany<SemanticUnit>> {
      console.log(task)
      const provider = this.toolIndex.get(task.tool_id)
      if (!provider) {
         return TextualUnit.New(`Tool not found: ${task.tool_id}`)
      }
      const session = await provider.createSession()
      try {
         return await provider.invokeTool(task.tool_id, task.tool_input, session, this)
      } finally {
         provider.disposeSession(session)
      }
   }
   getResource(uri: string): Resource {
      let res = this.resources.get(uri)
      if (res) return res
      return this.derived ? this.derived.getResource(uri) : null
   }
   putResource(res: Resource) {
      this.resources.set(res.getURI(), res)
   }
   *listResources(): Generator<Resource> {
      if (this.derived) {
         yield* this.derived.listResources()
      }
      for (const res of this.resources.values()) {
         yield res
      }
   }
   async fetchResource(uri: string): Promise<Resource> {
      const found = this.getResource(uri)
      if (found) return found

      throw new Error("Resource not found at: " + uri)
   }
}

class DirectAgenticPattern implements IAgenticPattern {
   async execute(contrib: Contribution) {
      const { spec, env } = contrib
      const model = env.getModel()

      // Execute target reaching logic
      if (spec.objective) {

         // Collect targeted tools
         const targets: ToolGuide[] = []
         for (const target of listOneOrMany(spec.objective)) {
            const tool = target.getTool(env)
            if (tool) targets.push(tool)
         }

         // Execute model
         let requiredToolsTryCount = 0
         while (1) {
            const frames = enframeContributionSpec(spec)

            const tools = selectTools(spec.tooling, env)
            targets.forEach(x => tools[x.id] = x)

            const requiredTools = (requiredToolsTryCount > 0 && targets.length > 0) ? targets : false

            // Generate semantic units
            const response = await model.generate({ frames, tools, requiredTools })
            contrib.emit("message", response.items)

            // Execute tools
            const called = await executeTools(contrib)

            // Check for continuation
            if (checkTargetReaching(contrib)) {
               break
            }
            if (called === 0) {
               if (requiredToolsTryCount > 0) {
                  console.log("> Failed to reach target")
               }
               requiredToolsTryCount++
            }
            shiftContribution(contrib)
         }
      }
      // Execute output without targets
      else {
         const frames = enframeContributionSpec(spec)
         const tools: Record<string, ToolGuide> = {}
         for (const tooling of listOneOrMany(spec.tooling)) {
            for (const tool of tooling.getTools(env)) {
               tools[tool.id] = tool
            }
         }
         const res = await model.generate({ frames, tools, requiredTools: false })
         contrib.emit("message", res.items)
      }

      contrib.status = "success"
      contrib[HookSymbol]?.complete?.()
   }
}

class ReActAgenticPattern implements IAgenticPattern {
   async execute(contrib: Contribution) {
      const { spec, env } = contrib
      const model = env.getModel()

      // Execute target reaching logic
      if (spec.objective) {

         // Collect targeted tools
         const targets: ToolGuide[] = []
         for (const target of listOneOrMany(spec.objective)) {
            const tool = target.getTool(env)
            if (tool) targets.push(tool)
         }

         // Execute model
         let requiredToolsTryCount = 0
         while (1) {
            const frames = enframeContributionSpec(spec)

            const tinking = await model.generate({
               frames: [
                  ...frames,
                  {
                     role: "directive",
                     items: [TextualUnit.New("Explain the issue, and plan actions")],
                  },
               ],
               tools: {},
               requiredTools: false,
            })
            frames.push({
               role: "self",
               items: tinking.items
            })

            const tools = selectTools(spec.tooling, env)
            targets.forEach(x => tools[x.id] = x)

            const requiredTools = (requiredToolsTryCount > 0 && targets.length > 0) ? targets : false

            // Generate semantic units
            const response = await model.generate({ frames, tools, requiredTools })
            contrib.emit("message", response.items)

            // Execute tools
            const called = await executeTools(contrib)

            // Check for continuation
            if (checkTargetReaching(contrib)) {
               break
            }
            if (called === 0) {
               if (requiredToolsTryCount > 0) {
                  console.log("> Failed to reach target")
               }
               requiredToolsTryCount++
            }
            shiftContribution(contrib)
         }
      }
      // Execute output without targets
      else {
         const frames = enframeContributionSpec(spec)
         const tools: Record<string, ToolGuide> = {}
         for (const tooling of listOneOrMany(spec.tooling)) {
            for (const tool of tooling.getTools(env)) {
               tools[tool.id] = tool
            }
         }
         const res = await model.generate({ frames, tools, requiredTools: false })
         contrib.emit("message", res.items)
      }

      contrib.status = "success"
      contrib[HookSymbol]?.complete?.()
   }
}

function selectTools(toolings: OneOrMany<Tooling>, env: IAgenticWorkbench) {
   const tools: Record<string, ToolGuide> = {}
   for (const tooling of listOneOrMany(toolings)) {
      for (const tool of tooling.getTools(env)) {
         tools[tool.id] = tool
      }
   }
   return tools
}

async function executeTools(contrib: Contribution): Promise<number> {
   const { data, env } = contrib
   let called = 0
   for (const item of contrib.iter("message")) {
      if (item instanceof ActionUnit) {
         let result: OneOrMany<SemanticUnit> = undefined
         for (const target of listOneOrMany(contrib.spec?.objective)) {
            const tool = target.getTool(env)
            if (item.tool_id === tool.id) {
               result = await target.executeTool(item, env)
               break
            }
         }
         if (result === undefined) {
            result = await env.executeTool(item)
         }
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

function checkTargetReaching(contrib: Contribution): boolean {
   const { spec } = contrib
   let unmatched = 0
   if (spec) {
      for (const target of listOneOrMany(spec.objective)) {
         if (target.check(contrib)) {
            return true
         }
         unmatched++
      }
   }
   return unmatched === 0
}

function shiftContribution(base: Contribution) {
   const { env } = base

   // Move some state into an intermediate contribution
   const inserted = env.emit({
      ...base.spec,
      objective: undefined,
   }, {
      message: base.data.message,
   })

   // Remove duplication from base
   base.spec.message = undefined
   base.spec.directive = undefined
   base.spec.history = inserted
   base.data.message = undefined
}

function enframeContributionSpec(spec: ContributionSpec): MessageFrame[] {
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

   const unrollContent = (value: OneOrMany<SemanticUnit>, role: MessageFrame["role"]) => {
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
            let historyFrames = enframeContributionSpec(contrib.spec)
            if (excludeSystem) {
               historyFrames = historyFrames.filter(f => f.role !== "system")
            }
            frames.push(...historyFrames)
         }
         unrollContent(contrib.toSemantic(), "self")
      }
   }

   unrollContent(spec.system, "system")
   unrollHistory(spec.history as OneOrMany<Contribution>, !!spec.system)
   unrollContent(spec.message, "agent")
   unrollContent(spec.directive, "directive")

   return frames
}

export function createWorkbench(): IAgenticWorkbench {
   return new StandardEnvironment()
}

export const AgenticPatterns = {
   "Direct": new DirectAgenticPattern(),
   "ReAct": new ReActAgenticPattern(),
}
