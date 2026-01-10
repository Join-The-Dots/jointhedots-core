import { ZodType } from "zod"
import { IGenerativeModel, MessageFrame, CompletionResult, CompletionQuery, CompletionCost } from "../interfaces/generative"
import { ActionUnit, AttachmentUnit, DataUnit, FeedbackUnit, SectionUnit, SemanticUnit, TextualUnit } from "../semantic/units"
import { Contribution, ContributionSpec, Target, IAgenticWorkbench, ContributionData, IAgenticTooling, IAgenticPattern, ContributionLog, Streamlet, IContributionHook } from "../interfaces/context"
import { Async, listOneOrMany, mergeOneOrMany, OneOrMany } from "../../common/types"
import { Resource } from "../semantic/resource"
import { IToolsProvider, StandardToolID, ToolGuide, ToolID, ToolSelector, ToolSet } from "../interfaces/tooling"

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

class ContributionHook implements IContributionHook {
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
      this.target.log.completedAt = Date.now()
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
         contrib.data = {
            ...data,
         }
         contrib.log = {
            createdAt: Date.now(),
            completedAt: Date.now(),
         }
      }
      else {
         contrib.status = "running"
         contrib.data = {}
         contrib.log = {
            createdAt: Date.now(),
         }
         contrib.hook = new ContributionHook(contrib)
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
      for (const tool of provider.listTools()) {
         this.toolIndex.set(tool.id, provider)
      }
   }
   selectTools(selector?: OneOrMany<ToolSelector>): ToolSet {
      const tools: ToolSet = this.derived ? this.derived.selectTools(selector) : {}
      const list = this.providers.flatMap(p => p.listTools())
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
   getCosts(): CompletionCost {
      const log = { costs: {} }
      for (const rc of this.resources.values()) {
         if (rc instanceof Contribution) {
            addLogCostFrom(log, rc.log?.costs)
         }
      }
      return log.costs
   }
}

class DirectAgenticPattern implements IAgenticPattern {
   targetMissedBudget = 2
   async execute(contrib: Contribution) {
      const { spec, data, env, log } = contrib
      const model = env.getModel()

      // Collect targeted tools
      const targets: ToolGuide[] = []
      for (const target of listOneOrMany(spec.objective)) {
         const tool = target.getTool(env)
         if (tool) targets.push(tool)
      }

      // Collect tools set
      const tools = selectTools(spec.tooling, env)
      targets.forEach(x => tools[x.id] = x)

      // Execute model
      let targetMissedCount = 0
      while (targetMissedCount < this.targetMissedBudget) {

         // Generate completion thread
         const frames = enframeContribution(spec, data)
         const requiredTools = targets.length > 0 ? targets : false
         const response = await generateFromModel(model, log, { frames, tools, requiredTools })
         contrib.emit("message", response.items)
         const called = await executeTools(contrib)

         // Check for continuation
         if (checkTargetReaching(contrib)) {
            break
         }
         if (called === 0) {
            if (targetMissedCount > 0) {
               console.log("> Failed to reach target")
            }
            targetMissedCount++
         }
      }

      contrib.status = "success"
      contrib[HookSymbol]?.complete?.()
   }
}

class ReActAgenticPattern implements IAgenticPattern {
   targetMissedBudget = 2
   async execute(contrib: Contribution) {
      const { spec, data, env, log } = contrib
      const model = env.getModel()

      // Collect targeted tools
      const targets: ToolGuide[] = []
      for (const target of listOneOrMany(spec.objective)) {
         const tool = target.getTool(env)
         if (tool) targets.push(tool)
      }

      // Collect tools set
      const tools = selectTools(spec.tooling, env)
      targets.forEach(x => tools[x.id] = x)

      // Execute model
      let targetMissedCount = 0
      while (targetMissedCount < this.targetMissedBudget) {

         // Force model to think
         const tinking = await env.emit({
            ...spec,
            pattern: AgenticPatterns.Direct,
            directive: mergeOneOrMany(spec.directive, TextualUnit.New([
               "Explain the issue, and plan actions"
            ])),
            objective: null,
         }).wait()
         contrib.emit("message", tinking.share())
         contrib.emit("consumeds", tinking)
         //traceContribution(tinking)

         // Generate completion thread
         const frames = enframeContribution(spec, data)
         const requiredTools = targets.length > 0 ? targets : false
         const response = await generateFromModel(model, log, { frames, tools, requiredTools })
         contrib.emit("message", response.items)
         const called = await executeTools(contrib)

         // Check for continuation
         if (checkTargetReaching(contrib)) {
            break
         }
         if (called === 0) {
            if (targetMissedCount > 0) {
               console.log("> Failed to reach target")
            }
            targetMissedCount++
         }
      }

      contrib.status = "success"
      contrib[HookSymbol]?.complete?.()
   }
}

async function generateFromModel(model: IGenerativeModel, log: ContributionLog, query: CompletionQuery): Promise<CompletionResult> {
   const res = await model.generate(query)
   addLogCostFrom(log, res.costs)
   return res
}

function addLogCostFrom(log: ContributionLog, costs: CompletionCost) {
   if (!log.costs) log.costs = {}
   for (const metric in costs) {
      log.costs[metric] = (log.costs[metric] || 0) + costs[metric]
   }
}

function selectTools(toolings: OneOrMany<IAgenticTooling>, env: IAgenticWorkbench) {
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

function branchContribution(base: Contribution) {
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

function enframeContribution(spec: ContributionSpec, data?: ContributionData): MessageFrame[] {
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
            const inner = val.toPrimitives()
            if (Array.isArray(inner)) out.push(...inner)
            else if (inner) out.push(inner)
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
            let historyFrames = enframeContribution(contrib.spec)
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
   if (data) {
      unrollContent(data.message, "self")
   }
   return frames
}

export function createWorkbench(): IAgenticWorkbench {
   return new StandardEnvironment()
}

export function getConsolidatedCost(contrib: Contribution): CompletionCost {
   if (contrib.data.consumeds) {
      const log = { costs: {} }
      const seens = new Set<Contribution>()
      function accumulate(from: Contribution) {
         if (!seens.has(from)) {
            seens.add(from)
            addLogCostFrom(log, from.log.costs)
            for (const consumed of contrib.data.consumeds) {
               accumulate(consumed)
            }
         }
      }
      accumulate(contrib)
      return log.costs
   }
   else {
      return contrib.log.costs
   }
}

export function traceContribution(contrib: Contribution) {
   const maxLineWidth = 60
   const indent = (level: number) => "  ".repeat(level)
   const formatDuration = (start?: number, end?: number) => {
      if (!start) return "N/A"
      if (!end) return `${Date.now() - start}ms (running)`
      return `${end - start}ms`
   }
   const toArray = <T>(items: OneOrMany<T>): T[] => [...listOneOrMany(items)]
   const wrapLine = (text: string, prefix: string): string[] => {
      const lines: string[] = []
      const maxContent = maxLineWidth - prefix.length
      let remaining = text
      while (remaining.length > maxContent) {
         lines.push(prefix + remaining.slice(0, maxContent))
         remaining = remaining.slice(maxContent)
      }
      if (remaining) lines.push(prefix + remaining)
      return lines
   }

   const formatUnit = (unit: SemanticUnit, level: number): string => {
      if (unit instanceof TextualUnit) {
         const preview = unit.text.length > 100 ? unit.text.slice(0, 100) + "..." : unit.text
         return `${indent(level)}[Text${unit.format ? `/${unit.format}` : ""}] ${preview.replace(/\n/g, "\\n")}`
      }
      if (unit instanceof ActionUnit) {
         return `${indent(level)}[Action] ${unit.tool_id} (id: ${unit.action_id})`
      }
      if (unit instanceof FeedbackUnit) {
         return `${indent(level)}[Feedback] action: ${unit.action_id}`
      }
      if (unit instanceof DataUnit) {
         return `${indent(level)}[Data] ${JSON.stringify(unit.data).slice(0, 80)}`
      }
      if (unit instanceof AttachmentUnit) {
         return `${indent(level)}[Attachment] ${unit.resource.getURI().slice(0, 80)}${unit.fragment ? "#" + unit.fragment : ""}`
      }
      if (unit instanceof SectionUnit) {
         return `${indent(level)}[Section] ${unit.layout}`
      }
      return `${indent(level)}[${unit.type}]`
   }

   console.log(`\n╔═════════════════════════════════════════════════════════════════════════════`)
   console.log(`║ Contribution: ${contrib.id}`)
   console.log(`║ Status: ${contrib.status}`)
   console.log(`║ Duration: ${formatDuration(contrib.log?.createdAt, contrib.log?.completedAt)}`)
   console.log(`╠═════════════════════════════════════════════════════════════════════════════`)

   // Trace spec
   if (contrib.spec) {
      console.log(`║ Spec:`)
      if (contrib.spec.system) {
         console.log(`║   system: ${toArray(contrib.spec.system).length} unit(s)`)
      }
      if (contrib.spec.directive) {
         console.log(`║   directive: ${toArray(contrib.spec.directive).length} unit(s)`)
      }
      if (contrib.spec.message) {
         console.log(`║   message: ${toArray(contrib.spec.message).length} unit(s)`)
      }
      if (contrib.spec.objective) {
         console.log(`║   objectives: ${toArray(contrib.spec.objective).length}`)
      }
      if (contrib.spec.history) {
         console.log(`║   history: ${toArray(contrib.spec.history).length} contribution(s)`)
      }
   }

   // Trace data
   if (contrib.data) {
      console.log(`╠═════════════════════════════════════════════════════════════════════════════`)
      console.log(`║ Data:`)

      if (contrib.data.message?.length) {
         console.log(`║   Messages (${contrib.data.message.length}):`)
         for (const unit of contrib.data.message) {
            console.log(`║   ${formatUnit(unit, 2)}`)
         }
      }

      if (contrib.data.actions) {
         const actionKeys = Object.keys(contrib.data.actions)
         console.log(`║   Actions (${actionKeys.length}):`)
         for (const key of actionKeys) {
            const action = contrib.data.actions[key]
            console.log(`║     [${key}] ${action.tool_id}`)
            if (action.failure) {
               console.log(`║       ❌ Error: ${action.failure.message}`)
            } else if (action.output !== undefined) {
               const outputs = toArray(action.output)
               console.log(`║       ✓ Output: ${outputs.length} unit(s)`)
            }
         }
      }

      if (contrib.data.output !== undefined) {
         console.log(`║   Output:`)
         const outputStr = JSON.stringify(contrib.data.output, null, 2)
         for (const line of outputStr.split("\n")) {
            for (const wrapped of wrapLine(line, "║     ")) {
               console.log(wrapped)
            }
         }
      }
   }

   // Trace costs
   const costs = getConsolidatedCost(contrib)
   if (costs) {
      console.log(`╠═════════════════════════════════════════════════════════════════════════════`)
      console.log(`║ Costs:`)
      for (const [metric, value] of Object.entries(costs)) {
         if (value) console.log(`║   ${metric}: ${value}`)
      }
   }

   console.log(`╚═════════════════════════════════════════════════════════════════════════════\n`)
}

export const AgenticPatterns = {
   "Direct": new DirectAgenticPattern(),
   "ReAct": new ReActAgenticPattern(),
}
