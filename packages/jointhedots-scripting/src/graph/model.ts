import type { AST } from "../ast/mod.ts"
import type { NodeKey } from "../ast/primitives.ts"
import type { GraphBuilder } from "./builder.ts"
import type { DocumentData } from "./log.ts"
import { type Use, type ValueConstraint } from "./uses.ts"

// DX...: Document core node
// DS...: Document Script node
// DR...: Document Render node

export type RenderNode<T = unknown | unknown[]> = T // Represent potentially React.ReactNode

export type NodeSymbol = string | Symbol

export type NodeCtor<T extends Node = Node> = new (
   $key: NodeKey,
   $class: NodeClass,
   model: DocumentModel,
) => T

export interface NodeClass {
   getConstructor(): NodeCtor
   updateNode(n: Node): Promise<void>
   linkNode(n: Node): void
}

export interface NodeNamespace {
   resolveIdentifier(symbol: NodeSymbol): Node
}

export type ResultValue<T> = T | Promise<T>

interface NodeInterface {
   getMember(name: string): Node

}

// Feature ID define what we want to use from a node
// - Display: Ask for display feature as react JSX
// - Getter: Ask for the main value of the node
// - Setter: Ask for the callback to change the main value of the node
// - Field: Ask for a named member value
export type FeatureID = string | symbol
export const GetterFeature = Symbol("get")
export const SetterFeature = Symbol("set")
export const DisplayFeature = Symbol("display")

// GXxxxx: Graph custom node
export class Node<Data extends AST.Node = AST.Any> {
   $owner: Node = null
   constructor(
      readonly $key: NodeKey,
      readonly $class: NodeClass,
      readonly model: DocumentModel,
   ) { }
   get data(): Data {
      return this.model.data.nodes.get(this.$key) as any
   }
   get symbol(): NodeSymbol {
      return null
   }
   get $namespace(): NodeNamespace {
      return this.$owner?.$namespace
   }
   get $context(): ContextModel {
      return this.$owner?.$context
   }
   use(feature: FeatureID, constraint?: ValueConstraint): Use {
      return null
   }
   toString() {
      const { symbol } = this
      let text = `[${this.constructor.name}@${this.$key}]`
      if (symbol) text += `${JSON.stringify(symbol)}`
      return text
   }
}

export class State<T extends any> {
   constructor(public index: number, public initial: any) { }
   read(ctx: ContextInstance): T {
      return ctx.state_values[this.index]
   }
   write(ctx: ContextInstance, value: T): T {
      console.debug(`> state[${this.index}] = ${value}`)
      const prev = ctx.state_values[this.index]
      if (prev !== value) {
         ctx.state_values[this.index] = value
         ctx.state_times[this.index] = ctx.timecode++
      }
      return prev
   }
}


export interface Executor {
   init(ctx: ContextInstance)
   update(ctx: ContextInstance)
}

export class Task {
   constructor(
      public index: number,
      public executor: Executor,
   ) {
   }
}


export interface ContextController {
   getControllerNode(): Node
   apply(ctx: ContextInstance): any
}

export class ContextModel {
   members = new Map<NodeSymbol, Node>()
   states: State<any>[] = []
   tasks: Task[] = []
   statements: Node[] = []
   output: State<any> = null
   //parent: ContextModel = null

   constructor(readonly controller: ContextController) {

   }
   addMember(symbol: NodeSymbol, node: Node) {
      this.members.set(symbol, node)
   }
   addState<T>(initial: T): State<T> {
      const state = new State<T>(this.states.length, initial)
      this.states.push(state)
      return state
   }
   addTask(executor: Executor): Task {
      const task = new Task(this.states.length, executor)
      this.tasks.push(task)
      return task
   }
   addOutput(): State<any> {
      if (!this.output) {
         this.output = this.addState(undefined)
      }
      return this.output
   }
}

export enum FlowControl {
   Execute,
   Return, // For return
   Exit, // For continue
   Break, // For loop stopping
}

export class ContextInstance {
   layers = new Set<ContextInstance>()
   state_values: any[] = null
   state_times: Uint32Array = null
   tasks_statuses: Uint32Array = null
   control: FlowControl = FlowControl.Execute
   timecode: number = 0
   constructor(
      readonly model: ContextModel,
      readonly parent: ContextInstance,
   ) {
      if (parent) {
         parent.layers.add(this)
      }
      if (model.states.length > 0) {
         this.state_values = model.states.map(s => s.initial)
         this.state_times = new Uint32Array(model.states.length)
      }
      if (model.tasks.length > 0) {
         this.tasks_statuses = new Uint32Array(model.tasks.length)
      }
   }
   async execute() {
      for (const node of this.model.statements) {
         console.warn(`> apply: ${node}`)
         //await node.apply(this)
         if (this.control !== FlowControl.Execute) {
            break
         }
      }
      setTimeout(() => this.run(), 1)
   }
   schedule(task: Task) {

   }
   run() {
      for (const task of this.model.tasks.values()) {
         console.info(`> update: ${task.executor}`)
         task.executor.update(this)
      }
   }
   dispose() {
      const { parent, layers } = this
      for (const layer of layers) {
         layer.dispose()
      }
      if (parent) {
         parent.layers.delete(this)
      }
   }
}

export class DocumentModel implements ContextController {
   readonly nodes = new Map<NodeKey, Node>()
   controller: ContextController = null
   builder: GraphBuilder = null

   globalModel: ContextModel = null
   globalInstance: ContextInstance = null

   constructor(
      readonly data: DocumentData,
   ) {
      this.globalModel = new ContextModel(this)
   }
   getControllerNode(): Node {
      return null
   }
   apply(ctx: ContextInstance): any {
      return null
   }
   getNode(data: any) {
      const id = data?.$ref
      if (id !== undefined) {
         return this.nodes.get(id)
      }
      return this.nodes.get(data)
   }
   createInstance() {
      return this.controller.apply(this.globalInstance)
   }
   createCallback() {
      const model = this
      return (...args) => {
         return model.controller.apply(model.globalInstance)
      }
   }
}
