import { DocumentModel, DocumentLayer, DXElement } from "../interpreter/model"
import { ICommandPipe } from "./cmds/types"
import { ContextRequirement, ContextNotification, TargetApi, TargetCmd, FrameNotification, InspectorNotification, InspectorRequirement, ModelNotification, ModelRequirement, ModelContextInfos, StateNotification } from "./cmds/target"
import { HostRouter, EditorApi, EditorCmd } from "./cmds/editor"
import { fetchComponentView } from "@livedoc/core/interpreter/display/view"
import { trace } from "@livedoc/core/common/trace"
import { ComputeResourceHashID } from "./hash_id"
import { ComponentsRegistry } from "../library/components"

const InspectorSessionRegistry = new Map<string, DeviceInspector>()

export interface IStateWatcher {
   onStateChange(target: StateInspector)
   onStateClose(target: StateInspector)
}

export class Watchable<T> {
   watchers: T[] = null
   closed: boolean = false

   addWatcher(watcher: T) {
      if (!this.watchers) this.watchers = []
      this.watchers.push(watcher)
   }
   removeWatcher(watcher: T) {
      if (this.watchers) {
         const pos = this.watchers.indexOf(watcher)
         if (pos >= 0) {
            const last = this.watchers.pop()
            if (last !== watcher) this.watchers[pos] = last
         }
      }
      else {
         console.error("Warcher not registered:", watcher)
      }
   }
   notifyWatchers(channel: keyof T) {
      if (this.watchers) {
         for (const watcher of this.watchers) {
            watcher[channel as any]?.(this)
         }
      }
   }
}

export abstract class Requirable<R, T> extends Watchable<T> {
   requirement: R = null

   protected abstract createRequirement(): R

   protected acquireRequirement() {
      if (this.requirement === null) {
         this.requirement = this.createRequirement()
      }
      return this.requirement
   }
   flushRequirement(): R {
      const reqs = this.requirement
      if (reqs) this.requirement = null
      return reqs
   }
}

export class StateInspector extends Watchable<IStateWatcher> {

   // State location
   readonly id: string
   readonly name: string
   readonly view: ContextInspector
   readonly parent: StateInspector
   readonly isMeta: boolean

   // State content
   metas: StateInspector[] = null
   datas: StateInspector[] = null
   value: any = undefined

   // State life cycle
   revision: number = 0
   synchronized: boolean = false
   uptodate: boolean = false

   constructor(name: string, isMeta: boolean, view: ContextInspector, parent: StateInspector) {
      super()
      const norm = isMeta ? "meta" : "data"
      this.id = parent ? ComputeResourceHashID(norm, name, parent.id) : ""
      this.name = name
      this.view = view
      this.parent = parent
      this.isMeta = isMeta
   }
   get hasStates(): boolean {
      return !!(this.datas?.length || this.metas?.length)
   }
   getDefinition(): DXElement {
      if (this.parent) {
         const owner = this.parent.getDefinition()
         if (owner) {
            return owner.findMember(this.name, this.isMeta)
         }
         return null
      }
      else {
         return this.view.layer.namespace[this.name]
      }
   }
   getMember(name: string, isMeta: boolean): StateInspector {
      return isMeta ? this.getMeta(name) : this.getData(name)
   }
   getMeta(name: string): StateInspector {
      let item = this.metas?.find(x => x.name === name)
      if (!item) {
         item = this.view.createState(name, true, this)
         if (!this.metas) this.metas = []
         this.metas.push(item)
         this.uptodate = false
      }
      return item
   }
   getData(name: string): StateInspector {
      let item = this.datas?.find(x => x.name === name)
      if (!item) {
         item = this.view.createState(name, false, this)
         if (!this.datas) this.datas = []
         this.datas.push(item)
         this.uptodate = false
      }
      return item
   }
   addWatcher(watcher: IStateWatcher) {
      super.addWatcher(watcher)
      if (this.synchronized === false) {
         this.view.synchronizeState(this)
      }
   }
}

export interface IContextWatcher {
   onContextChange?(target: ContextInspector)
   onContextClose(target: ContextInspector)
}

export class ContextInspector extends Requirable<ContextRequirement, IContextWatcher> {
   readonly contextId: number
   readonly support: DeviceInspector

   initiated = false
   model: DocumentModel = null
   layer: DocumentLayer = null
   frame: StateInspector = null
   states = new Map<string, StateInspector>()

   updating: boolean = false
   revision: number = 0

   constructor(contextId: number, support: DeviceInspector) {
      super()
      this.support = support
      this.contextId = contextId
      this.acquireRequirement()
      this.frame = new StateInspector("[[frame]]", false, this, null)
      this.support.scheduleRemoteUpdate()
   }
   protected createRequirement(): ContextRequirement {
      return {
         contextId: this.contextId,
         addeds: {},
         removeds: [],
      }
   }
   getRoot(name: string): StateInspector {
      if (this.frame) {
         return this.frame.getData(name)
      }
      return null
   }
   createState(name: string, isMeta: boolean, parent: StateInspector): StateInspector {
      const state = new StateInspector(name, isMeta, this, parent)
      this.states.set(state.id, state)
      state.revision = this.revision
      return state
   }
   synchronizeState(state: StateInspector): StateInspector {
      const reqs = this.acquireRequirement()
      reqs.addeds[state.id] = {
         name: state.name,
         meta: state.isMeta,
         parent: state.parent?.id,
      }
      this.support.scheduleRemoteUpdate()
      return state
   }
   desynchronizeState(state: StateInspector) {
      throw "TODO"
   }
   restart() {
      const reqs = this.acquireRequirement()
      reqs.restart = true
      this.support.scheduleRemoteUpdate()
   }
   dispose() {
      if (!this.closed) {
         const reqs = this.acquireRequirement()
         reqs.close = true
         this.closed = true
         this.support.scheduleRemoteUpdate()
         this.notifyWatchers("onContextClose")
      }
   }
   async initiate(infos: ContextNotification) {
      const module = ComponentsRegistry.acquireComponent(infos.modelId)
      const model = await fetchComponentView(module)
      if (model) {
         this.model = model
         this.layer = this.model.getLayerById(infos.layerId)
         if (this.layer) {
            this.initiated = true
            this.applyNotification(infos)
            this.notifyWatchers("onContextChange")
            this.frame.notifyWatchers("onStateChange")
         }
         else {
            console.error(`Cannot inspect unknown layer '${infos.layerId}' in model '${infos.modelId}'`)
         }
      }
      else {
         console.error(`Cannot inspect unknown model '${infos.modelId}'`)
      }
   }
   applyNotification(infos: ContextNotification) {
      const { states } = infos
      if (states) {
         const notifieds = new Set<StateInspector>
         const mapState = (infos: StateNotification) => {
            const parentId = infos.parent
            let parent = this.states.get(parentId)
            if (!parent) {
               if (parentId === null) parent = this.frame
               else parent = mapState(states[parentId])
            }
            notifieds.add(parent)
            return parent.getMember(infos.name, infos.meta)
         }
         for (const id in states) {
            const infos = states[id]
            let state = this.states.get(id)
            if (!state) {
               state = mapState(infos)
            }
            if (infos.hasOwnProperty("value")) {
               //state.synchronized = true
               state.uptodate = true
               state.value = infos.value
            }
            notifieds.add(state)
         }
         for (const state of notifieds) {
            state.notifyWatchers("onStateChange")
         }
      }
      if (infos.closed && !this.closed) {
         this.closed = true
         this.support.contexts.delete(this.contextId)
         this.notifyWatchers("onContextClose")
      }
   }
}

export interface IModelWatcher {
   onModelChange?(target: ModelInspector)
   onModelClose(target: ModelInspector)
}

export class ModelInspector extends Requirable<ModelRequirement, IModelWatcher> {
   readonly moduleId: string
   readonly support: DeviceInspector
   contexts: ModelContextInfos[] = []

   constructor(moduleId: string, support: DeviceInspector) {
      super()
      this.moduleId = moduleId
      this.support = support
      this.acquireRequirement().moduleId = moduleId
   }
   protected createRequirement(): ModelRequirement {
      return {
         moduleId: this.moduleId
      }
   }
   findContextOf(layer: DocumentLayer): ModelContextInfos {
      for (const infos of this.contexts) {
         if (infos.identifier === layer.getIdentifier()) {
            return infos
         }
      }
      return null
   }
   applyNotification(infos: ModelNotification) {
      for (const item of infos.contexts) {
         const index = this.contexts.findIndex(x => x.contextId === item.contextId)
         if (item.deleted) {
            this.contexts.splice(index, 1)
         }
         else {
            if (index < 0) this.contexts.push(item)
            else this.contexts[index] = item
         }
      }
      this.notifyWatchers("onModelChange")
   }
   dispose() {
      if (!this.closed) {
         this.closed = true
         this.support.scheduleRemoteUpdate()
         this.notifyWatchers("onModelClose")
      }
   }
}

export interface IDeviceWatcher {
   onDeviceFramesChange?(target: DeviceInspector)
   onDeviceChange?(target: DeviceInspector)
   onDeviceClose(target: DeviceInspector)
}

export class DeviceInspector extends Requirable<InspectorRequirement, IDeviceWatcher> {
   readonly sessionId: string
   pipe: ICommandPipe

   contexts = new Map<number, ContextInspector>()
   models = new Map<string, ModelInspector>()
   frames: FrameNotification = null

   synchronizing: Promise<DeviceInspector> = null
   shallSynchronize: boolean = false

   constructor(sessionId: string, pipe: ICommandPipe) {
      super()
      this.sessionId = sessionId
      this.pipe = pipe
      InspectorSessionRegistry.set(sessionId, this)
   }
   protected createRequirement(): InspectorRequirement {
      return {
         contexts: [],
         models: [],
      }
   }
   refresh() {
      this.acquireRequirement()
      this.scheduleRemoteUpdate()
   }
   scheduleRemoteUpdate(): Promise<any> {
      const { synchronizing } = this
      if (synchronizing !== null) {
         this.shallSynchronize = true
         return this.synchronizing
      }

      const requirement = this.flushRequirement()
      if (requirement) {
         this.synchronizing = this.pipe.execute<TargetApi["UpdateInspector"]>({
            cmd: TargetCmd.UpdateInspector,
            sessionId: this.sessionId,
            requirement,
         }).then(async (result) => {
            if (result) {
               await this.applyNotification(result)
               this.synchronizing = null
               if (this.shallSynchronize) {
                  this.shallSynchronize = false
                  return this.scheduleRemoteUpdate()
               }
            }
            else {
               console.error("Session closed:", this.sessionId)
            }
            return this
         })
      }

      return this.synchronizing
   }
   acquireModelInspector(moduleId: string): ModelInspector {
      let model = this.models.get(moduleId)
      if (!model) {
         model = new ModelInspector(moduleId, this)
         this.models.set(moduleId, model)
         this.scheduleRemoteUpdate()
      }
      return model
   }
   acquireContextInspector(contextId: number): ContextInspector {
      let context = this.contexts.get(contextId)
      if (!context) {
         context = new ContextInspector(contextId, this)
         this.contexts.set(contextId, context)
         this.scheduleRemoteUpdate()
      }
      return context
   }
   flushRequirement(): InspectorRequirement {

      for (const ctx of this.contexts.values()) {
         const reqs = ctx.flushRequirement()
         if (reqs) {
            this.acquireRequirement().contexts.push(reqs)
         }
      }

      for (const pgm of this.models.values()) {
         const reqs = pgm.flushRequirement()
         if (reqs) {
            this.acquireRequirement().models.push(reqs)
         }
      }

      return super.flushRequirement()
   }
   async applyNotification(infos: InspectorNotification) {
      if (infos.frames) {
         this.frames = infos.frames
         this.notifyWatchers("onDeviceFramesChange")
      }
      if (infos.contexts) {
         for (const data of infos.contexts) {
            const ctx = this.contexts.get(data.contextId)
            if (ctx) {
               if (ctx.initiated === false) {
                  await ctx.initiate(data)
               }
               ctx.applyNotification(data)
            }
         }
      }
      if (infos.models) {
         for (const data of infos.models) {
            const pgm = this.models.get(data.moduleId)
            if (pgm) {
               pgm.applyNotification(data)
            }
         }
      }
   }
   unmount() {
      InspectorSessionRegistry.delete(this.sessionId)
      for (const context of this.contexts.values()) {
         if (!context.closed) context.dispose()
      }
      for (const model of this.models.values()) {
         if (!model.closed) model.dispose()
      }
   }
}

export function installRemoteInspectorFeature() {

   HostRouter.register<EditorApi["InspectorNotification"]>(EditorCmd.InspectorNotification, async (req) => {
      const session = InspectorSessionRegistry.get(req.sessionId)
      if (session) {
         trace("pipe", "InspectorNotification", req)
         session?.applyNotification(req.notification)
      }
      else {
         console.error(`Session '${req.sessionId}' not found, inspector notification cannot be handled`, req)
      }
   })

}
