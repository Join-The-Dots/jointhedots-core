import { DocumentLayer, DXElement, getElementConsumers } from "./model"
import { Observable, Observer } from "../observable/observable"
import { ObservableAttribute } from "../observable/attributes"
import { trace } from "@livedoc/core/common/trace"
import { MapLike } from "../common/types"
import { AST } from "../ast"

export const ModelContextRegistry = new Map<number, ModelContext>()

export enum ScheduledFlags {
   HasObservable = 0x1,
   HasPromise = 0x2,
   UpdateRequired = 0x4,
   UpdateScheduled = 0x8,
   SuspendIncrement = 0x100,
   SuspendMask = 0xffff00,
}

export type ModelProps = {
   [propName: string]: any
}

export interface IModelFrame {
   dispatch(data: any): void
}

export interface IModelWatcher {
   onStateChange(emitter: DXElement, state_index: number)
   onTermination()
}

export interface IModelRegistryWatcher {
   onAttachContext(ctx: ModelContext)
   onDettachContext(ctx: ModelContext)
}

export interface IContext {
   states: any[]
   getThis(): any
   getValue(id: string): any
   setValue(id: string, value: any): void
}

export class LocalContext implements IContext {
   states: any[] = []
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

export class ModelContext extends LocalContext {
   static ids = 0
   static watcher: IModelRegistryWatcher

   id: number = ModelContext.ids++
   subs: ModelContext[] = []
   observers: Map<number, Observer> = null
   alive: boolean = false

   ops_statuses: number[]

   exec_stream: number[] = []
   exec_sorted: boolean = false
   exec_running: boolean = false

   watcher: IModelWatcher = null

   constructor(
      public props: ModelProps,
      public layer: DocumentLayer,
      public frame: IModelFrame,
      public context: ModelContext,
      public edited: boolean,
   ) {
      super(context, null)
      ModelContextRegistry.set(this.id, this)
      const { builder } = layer.model
      if (builder === null) {
         this.initiate()
      }
      else {
         builder.notifyNewContext(this)
      }
   }
   get title(): string {
      const { model, name } = this.layer
      let title = model.title
      if (name) title += this.layer.getIdentifier()
      return title
   }
   initiate() {
      const { support, states, initiates, schedules } = this.layer
      if (this.edited === false && this.context === null) {
         this.edited = this.context.edited
      }
      this.alive = true
      this.ops_statuses = new Array(schedules.length).fill(0)
      this.states = new Array(states).fill(undefined)
      for (let i = 0; i < initiates.length; i++) {
         initiates[i].init(this)
      }
      for (const scheduled of schedules) {
         this.scheduleOperator(scheduled)
      }
      if (support) support.attachContext(this, this.context)
      ModelContext.watcher?.onAttachContext(this)
   }
   restart() {
      const { states, initiates, schedules } = this.layer
      this.ops_statuses = new Array(schedules.length).fill(0)
      this.states = new Array(states).fill(undefined)
      for (let i = 0; i < initiates.length; i++) {
         initiates[i].init(this)
      }
      for (const scheduled of schedules) {
         this.scheduleOperator(scheduled)
      }
      this.execute()
   }
   update(props: ModelProps): any {
      this.props = props
      if (this.alive) {
         for (const key in this.layer.inputs) {
            this.layer.inputs[key].apply(this)
         }
      }
   }
   read(): any {
      if (this.alive) {
         return this.layer.output?.read(this)
      }
   }
   dispose() {
      if (this.alive) {
         const { context: ctx, layer } = this
         const { support } = layer
         this.alive = false
         if (support) support.dettachContext(this, ctx)
         ModelContext.watcher?.onDettachContext(this)
         this.watcher?.onTermination()
      }
      ModelContextRegistry.delete(this.id)
   }
   private run_once = () => {
      const { schedules } = this.layer
      const { exec_stream } = this
      while (exec_stream.length) {
         if (this.exec_sorted === false) {
            exec_stream.sort().reverse()
            this.exec_sorted = true
         }
         const order = exec_stream.pop()
         this.ops_statuses[order] ^= ScheduledFlags.UpdateScheduled
         if (this.ops_statuses[order] < ScheduledFlags.SuspendIncrement) {
            const op = schedules[order]
            if (op) {
               trace("!flow", `Execute '${op.getIdentifier()}'`, op)
               op.execute(this)
            }
            else {
               console.error(`${this.title} has no operator at #${order}`)
            }
         }
      }
      this.exec_running = false
   }
   execute() {
      if (this.exec_running === false) {
         this.exec_running = true
         setTimeout(this.run_once, 0)
      }
   }
   scheduleOperator(emitter: DXElement) {
      const { order } = emitter
      if (order < 0) {
         trace("flow", `Direct execute '${emitter.getIdentifier()}'`, emitter)
         emitter.execute(this)
      }
      else if (this.ops_statuses[order] >= ScheduledFlags.SuspendIncrement) {
         this.ops_statuses[order] |= ScheduledFlags.UpdateRequired
      }
      else if ((this.ops_statuses[order] & ScheduledFlags.UpdateScheduled) === 0) {
         trace("flow", `Schedule execute '${emitter.getIdentifier()}'`, emitter)
         this.ops_statuses[order] |= ScheduledFlags.UpdateScheduled
         this.exec_stream.push(order)
         this.exec_sorted = false
         this.execute()
      }
   }
   suspendConsumers(emitter: DXElement) {
      trace("flow", "SuspendConsumers", emitter)
      const deps = this.layer.deps[emitter.order]
      if (deps) {
         for (const index of deps) {
            this.ops_statuses[index] += ScheduledFlags.SuspendIncrement
         }
      }
   }
   resumeConsumers(emitter: DXElement) {
      trace("flow", "ResumeConsumers", emitter)
      const deps = this.layer.deps[emitter.order]
      if (deps) {
         for (const index of deps) {
            this.ops_statuses[index] -= ScheduledFlags.SuspendIncrement
            if (this.ops_statuses[index] < ScheduledFlags.SuspendIncrement) {
            }
         }
      }
   }
   updateConsumers(emitter: DXElement) {
      trace("flow", "UpdateConsumers", emitter)
      for (const item of emitter.getMembers()) {
         item.apply(this)
      }
      for (const item of getElementConsumers(emitter)) {
         item.apply(this)
      }
   }
   getStateListener(emitter: DXElement, state_index: number): Observer {
      if (!this.observers) this.observers = new Map()
      let observer = this.observers.get(state_index)
      if (observer === undefined) {
         observer = (value) => {
            if (this.states[state_index] === value) {
               this.updateConsumers(emitter)
            }
         }
         this.observers.set(state_index, observer)
      }
      return observer
   }
   setState(emitter: DXElement, state_index: number, newValue: any) {
      trace("flow", "SetState", emitter)
      const prevValue = this.states[state_index]
      if (newValue !== prevValue) {

         if (this.ops_statuses[emitter.order] & ScheduledFlags.HasObservable) {
            const observable = prevValue[ObservableAttribute] as Observable<any>
            this.ops_statuses[emitter.order] ^= ScheduledFlags.HasObservable
            observable.unsubscribe(this.getStateListener(emitter, state_index))
         }

         if (newValue instanceof Object) {
            const observable = newValue[ObservableAttribute] as Observable<any>
            if (observable !== undefined) {
               if (emitter.order < 0) throw null
               this.ops_statuses[emitter.order] |= ScheduledFlags.HasObservable
               observable.use()
               observable.subscribe(this.getStateListener(emitter, state_index))
            }
         }

         this.states[state_index] = newValue
         if (newValue instanceof Promise) {
            newValue.then((value) => {
               this.resumeConsumers(emitter)
               if (this.states[state_index] === newValue) {
                  this.setState(emitter, state_index, value)
               }
            })
            this.suspendConsumers(emitter)
         }
         else {
            this.updateConsumers(emitter)
         }

         if (this.watcher !== null) {
            this.watcher.onStateChange(emitter, state_index)
         }
      }
   }
}
