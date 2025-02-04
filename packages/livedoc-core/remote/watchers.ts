import { DocumentFrame, IDocumentFrame, IDocumentWatcher } from "@livedoc/core/interpreter/display/document-frames"
import { ModelContext, IModelRegistryWatcher, IModelWatcher } from "@livedoc/core/interpreter/execution"
import { DocumentLayer, DXElement, isOperator } from "@livedoc/core/interpreter/model"
import { ObservableAttribute } from "@livedoc/core/observable/attributes"
import { Observable, Observer } from "@livedoc/core/observable/observable"
import { trace } from "@livedoc/core/common/trace"
import { ComputeResourceHashID } from "./hash_id"

export interface IContextProxy {
   notifyState(state: StateWatcher)
   notifyClose()
}

export class StateWatcher {

   // State location
   readonly id: string
   readonly name: string
   readonly meta: boolean
   readonly view: ContextWatcher
   readonly parent: StateWatcher

   // State content
   readonly definition: DXElement
   metas: StateWatcher[] = null
   datas: StateWatcher[] = null
   value: any = undefined

   // State life cycle
   value_revision: number = 0
   content_revision: number = 0
   synchronized: boolean = false
   observer: Observer = null

   constructor(name: string, meta: boolean, definition: DXElement, view: ContextWatcher, parent: StateWatcher) {
      const norm = meta ? "meta" : "data"
      this.id = ComputeResourceHashID(norm, name, parent?.id)
      this.name = name
      this.definition = definition
      this.view = view
      this.parent = parent
   }
   get hasStates(): boolean {
      return !!(this.datas?.length || this.metas?.length)
   }
   getMember(name: string, isMeta: boolean): StateWatcher {
      return isMeta ? this.getMeta(name) : this.getData(name)
   }
   getMeta(name: string): StateWatcher {
      let item = this.metas?.find(x => x.name === name)
      if (!item) {
         const definition = this.definition?.findMember?.(name, true)
         if (definition) {
            item = this.view.createState(name, true, definition, this)
            if (!this.metas) this.metas = []
            this.metas.push(item)
            this.view.notifyStateMutation(this)
         }
      }
      return item
   }
   getData(name: string): StateWatcher {
      let item = this.datas?.find(x => x.name === name)
      if (!item) {
         const definition = this.definition?.findMember?.(name, false)
         item = this.view.createState(name, false, definition, this)
         if (!this.datas) this.datas = []
         this.datas.push(item)
         this.view.notifyStateMutation(this)
      }
      return item
   }
   mapData(name: string): boolean {
      let item = this.datas?.find(x => x.name === name)
      if (!item) {
         const definition = this.definition?.findMember?.(name, false)
         item = this.view.createState(name, false, definition, this)
         if (!this.datas) this.datas = []
         this.datas.push(item)
         this.view.notifyStateMutation(this)
         return true
      }
      return false
   }
   expandDefinition() {
      const { view } = this
      if (this.definition) {
         this.metas = []
         this.datas = []
         for (const member of this.definition.getMembers()) {
            const item = view.createState(member.name, member.isMetaMember, member, this)
            if (member.isMetaMember) {
               this.metas.push(item)
            }
            else {
               this.datas.push(item)
            }
         }
      }
   }
   updateValue(): boolean {
      const { view } = this

      let newValue = undefined
      if (this.definition) newValue = this.definition.read(view.context)
      else newValue = this.parent.value?.[this.name]

      if (newValue !== this.value) {
         if (this.observer !== null) {
            const observable = this.value[ObservableAttribute] as Observable<any>
            observable.unsubscribe(this.observer)
            this.observer = null
         }
         if (newValue instanceof Object) {
            const observable = newValue[ObservableAttribute] as Observable<any>
            if (observable !== undefined) {
               this.observer = () => {
                  const { view } = this
                  view.onWatcherChange(this)
               }
               observable.subscribe(this.observer)
            }
            for (const key in newValue) {
               this.getData(key)
            }
         }
         this.value = newValue
         this.value_revision = view.revision
         return true
      }
      else if (this.observer) {
         for (const key in newValue) {
            this.getData(key)
         }
         this.content_revision = view.revision
         return true
      }
      return false
   }
   dispose() {
      if (this.observer) {
         const observable = this.value[ObservableAttribute] as Observable<any>
         observable.unsubscribe(this.observer)
         this.observer = null
      }
   }
}

export class ContextWatcher implements IModelWatcher {
   layer: DocumentLayer
   states = new Map<string, StateWatcher>()
   operators = new Map<DXElement, StateWatcher>()

   updating: boolean = false
   revision: number = 0

   scheduleds_operators_current = new Set<DXElement>()
   scheduleds_watchers_current = new Set<StateWatcher>()
   scheduleds_operators_working = new Set<DXElement>()
   scheduleds_watchers_working = new Set<StateWatcher>()

   proxies = new Set<IContextProxy>()

   constructor(
      readonly context: ModelContext,
   ) {
      const { layer } = context
      for (const op of layer.operators) {
         const state = new StateWatcher(op.name, false, op, this, null)
         this.states.set(state.id, state)
         this.operators.set(op, state)
      }
      this.context = context
      this.layer = layer
      if (context.watcher) throw new Error()
      context.watcher = this
   }
   getRoot(name: string): StateWatcher {
      const op = this.layer.namespace[name]
      return this.operators.get(op)
   }
   createState(name: string, meta: boolean, definition: DXElement, parent: StateWatcher): StateWatcher {
      const state = new StateWatcher(name, meta, definition, this, parent)
      this.states.set(state.id, state)
      state.value_revision = this.revision
      return state
   }
   onWatcherChange(watcher: StateWatcher) {
      trace("!debug", "onWatcherChange", watcher)
      this.scheduleds_watchers_current.add(watcher)
      if (this.updating === false) {
         this.updating = true
         setTimeout(this.updateStates, 1)
      }
   }
   onStateChange(emitter: DXElement, state_index: number) {
      this.scheduleds_operators_current.add(emitter)
      if (this.updating === false) {
         this.updating = true
         setTimeout(this.updateStates, 1)
      }
   }
   onTermination() {
      this.context.watcher = null
      for (const cproxy of this.proxies) {
         cproxy.notifyClose()
      }
   }
   private updateStates = () => {
      this.updating = false
      this.revision++

      const operators = this.scheduleds_operators_current
      this.scheduleds_operators_working = this.scheduleds_operators_current
      this.scheduleds_operators_current = operators
      for (const op of operators) {
         const state = this.findMemberView(op)
         if (state) this.updateRecursiveState(state)
      }
      operators.clear()

      const watchers = this.scheduleds_watchers_current
      this.scheduleds_watchers_working = this.scheduleds_watchers_current
      this.scheduleds_watchers_current = watchers
      for (const state of watchers) {
         this.updateRecursiveState(state)
      }
      watchers.clear()
   }
   private findMemberView(definition: DXElement) {
      for (const x of this.states.values()) {
         if (x.definition === definition) return x
      }
      return null
   }
   notifyStateMutation(state: StateWatcher) {
      state.content_revision = this.revision
      for (const cproxy of this.proxies) {
         cproxy.notifyState(state)
      }
   }
   notifyStateValue(state: StateWatcher) {
      state.value_revision = this.revision
      for (const cproxy of this.proxies) {
         cproxy.notifyState(state)
      }
   }
   private updateRecursiveState(state: StateWatcher) {
      if (state.synchronized) {

         if (state.updateValue()) {
            this.notifyStateValue(state)
         }

         if (state.metas) {
            for (const sub of state.metas) {
               if (isOperator(sub.definition) === false) {
                  this.updateRecursiveState(sub)
               }
            }
         }
         if (state.datas) {
            for (const sub of state.datas) {
               if (isOperator(sub.definition) === false) {
                  this.updateRecursiveState(sub)
               }
            }
         }
      }
   }
   synchronizeState(state: StateWatcher) {
      if (state.synchronized === false) {
         state.synchronized = true
         state.expandDefinition()
         state.updateValue()
         this.notifyStateValue(state)
      }
   }
   desynchronizeState(state: StateWatcher) {
      throw "TODO"
   }
   dispose() {
      this.context.watcher = null
      for (const state of this.states.values()) {
         state.dispose()
      }
   }
}

export class ContextRegistryWatcher implements IModelRegistryWatcher {
   proxies = new Set<IModelRegistryWatcher>()
   constructor() {
      if (ModelContext.watcher) {
         throw new Error("DocumentFrame cannot have multiple watcher")
      }
      ModelContext.watcher = this
   }
   registerProxy(proxy: IModelRegistryWatcher) {
      this.proxies.add(proxy)
   }
   unregisterProxy(proxy: IModelRegistryWatcher) {
      this.proxies.delete(proxy)
   }
   onAttachContext(ctx: ModelContext) {
      for (const proxy of this.proxies) {
         proxy.onAttachContext(ctx)
      }
   }
   onDettachContext(ctx: ModelContext) {
      for (const proxy of this.proxies) {
         proxy.onDettachContext(ctx)
      }
   }
}

export class DocumentWatcher implements IDocumentWatcher {
   proxies = new Set<IDocumentWatcher>()
   constructor() {
      if (DocumentFrame.watcher) {
         throw new Error("DocumentFrame cannot have multiple watcher")
      }
      DocumentFrame.watcher = this
   }
   registerProxy(proxy: IDocumentWatcher) {
      this.proxies.add(proxy)
   }
   unregisterProxy(proxy: IDocumentWatcher) {
      this.proxies.delete(proxy)
   }
   onAttachFrame(frame: IDocumentFrame) {
      for (const proxy of this.proxies) {
         proxy.onAttachFrame(frame)
      }
   }
   onDettachFrame(frame: IDocumentFrame) {
      for (const proxy of this.proxies) {
         proxy.onAttachFrame(frame)
      }
   }
}

export function AcquireContextWatcher(context: ModelContext): ContextWatcher {
   if (!context.watcher) context.watcher = new ContextWatcher(context)
   return context.watcher as ContextWatcher
}
