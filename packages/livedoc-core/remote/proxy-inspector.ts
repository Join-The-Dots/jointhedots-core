import { IDocumentFrame, document } from "../interpreter/display/document-frames"
import { FrameNotification, ContextNotification, ContextID, StateRequirement, TargetApi, TargetCmd, TargetRouter, InspectorNotification, ModelNotification, ContextRequirement, ModelRequirement, ModelContextInfos, StateNotification } from "./cmds/target"
import { ModelContext, ModelContextRegistry, IModelRegistryWatcher } from "../interpreter/execution"
import { EditorApi, EditorCmd } from "./cmds/editor"
import { DeviceSocket } from "./proxy-sockets"
import { AcquireContextWatcher, ContextRegistryWatcher, ContextWatcher, DocumentWatcher, StateWatcher } from "./watchers"
import { MapLike } from "../common/types"
import { trace } from "../common/trace"

const InspectorSessionRegistry = new Map<string, SessionProxy>()
let ContextRegistryEndPoint: ContextRegistryWatcher = null
let DocumentEndPoint: DocumentWatcher = null

interface IProxy<Requirement = any, Notification = any, SupportNotification = InspectorNotification> {
   applyRequirement(req: Requirement)
   flushNotification(support: SupportNotification)
}

function stringifyValue(value: any) {
   switch (typeof value) {
      case 'undefined':
         return undefined
      case 'function':
         return 'function()'
      case 'object':
         if (Array.isArray(value)) return `[0...${value.length}]`
         if (value === null) return 'null'
         return '{...}'
      default:
         return JSON.stringify(value)
   }
}

export class ContextProxy implements IProxy<ContextRequirement, ContextNotification> {
   readonly session: SessionProxy
   readonly watcher: ContextWatcher
   revision: number = -1
   closed: boolean = false

   states: Set<StateWatcher> = new Set()
   addeds: Set<StateWatcher> = new Set()

   constructor(session: SessionProxy, watcher: ContextWatcher) {
      this.session = session
      this.watcher = watcher
      watcher.proxies.add(this)
      for (const state of watcher.operators.values()) {
         this.appendState(state)
      }
      session.scheduleUpdate(this)
   }
   dispose() {
      const { states } = this
      states.clear()
      this.watcher.proxies.delete(this)
      this.session.contexts.delete(this.watcher.context.id)
   }
   appendState(state: StateWatcher) {
      if (!this.states.has(state)) {
         this.states.add(state)
         this.addeds.add(state)
         this.session.scheduleUpdate(this)
      }
   }
   notifyState(state: StateWatcher) {
      if (this.states.has(state)) {
         this.addeds.add(state)
         this.session.scheduleUpdate(this)
      }
   }
   notifyClose() {
      this.closed = true
      this.session.scheduleUpdate(this)
   }
   applyRequirement(creq: ContextRequirement) {
      const { watcher } = this
      if (creq.addeds) {
         const { addeds } = creq
         function mapState(proxy: ContextProxy, id: string, mapped: StateRequirement): StateWatcher {
            let state: StateWatcher = null
            addeds[id] = null
            if (mapped.parent) {
               const parentMap = addeds[mapped.parent]
               const parent = parentMap ? mapState(proxy, mapped.parent, parentMap) : watcher.states.get(mapped.parent)
               state = parent && parent.getMember(mapped.name, mapped.meta)
            }
            else {
               state = watcher.states.get(id)
            }
            if (state) {
               watcher.synchronizeState(state)
               proxy.appendState(state)
               return state
            }
         }
         for (const id in addeds) {
            if (addeds[id]) {
               mapState(this, id, addeds[id])
            }
         }
      }
      if (creq.restart) {
         this.dispose()
      }
      if (creq.close) {
         watcher.context.restart()
      }
   }
   flushNotification(support: InspectorNotification) {
      const { context } = this.watcher
      const { layer } = context
      const states: MapLike<StateNotification> = {}

      // Serialize addeds states
      for (const state of this.addeds) {
         states[state.id] = {
            name: state.name,
            meta: state.meta,
            parent: state.parent?.id || null,
            value: stringifyValue(state.value),
         }
         if (state.datas) {
            for (const member of state.datas) {
               states[member.id] = {
                  name: member.name,
                  meta: member.meta,
                  parent: state.id,
               }
            }
         }
      }
      this.addeds.clear()

      // Return notification payload
      this.revision = this.watcher.revision
      support.contexts.push({
         contextId: context.id,
         modelId: layer.model.id,
         layerId: layer.getIdentifier(),
         title: layer.getDisplayInfos().title,
         states,
         revision: this.revision,
         closed: this.closed,
      })
   }
}

export class ModelProxy implements IProxy<ModelRequirement, ModelNotification>, IModelRegistryWatcher {
   moduleId: string
   addeds = new Set<ModelContext>()
   removeds = new Set<ModelContext>()
   constructor(moduleId: string, readonly session: SessionProxy) {
      this.moduleId = moduleId
      for (const ctx of ModelContextRegistry.values()) {
         if (ctx.layer.model.id === this.moduleId) {
            this.onAttachContext(ctx)
         }
      }
      ContextRegistryEndPoint.registerProxy(this)
   }
   dispose() {
      ContextRegistryEndPoint.unregisterProxy(this)
      this.session.models.delete(this.moduleId)
   }
   onAttachContext(ctx: ModelContext) {
      this.addeds.add(ctx)
      this.session.scheduleUpdate(this)
   }
   onDettachContext(ctx: ModelContext) {
      if (this.addeds.has(ctx)) this.addeds.delete(ctx)
      else this.removeds.add(ctx)
      this.session.scheduleUpdate(this)
   }
   applyRequirement(creq: ModelRequirement) {
   }
   flushNotification(support: InspectorNotification) {
      const contexts: ModelContextInfos[] = []
      for (const item of this.addeds) {
         contexts.push({
            contextId: item.id,
            frameId: item.frame?.["id"],
            identifier: item.layer.getIdentifier(),
         })
      }
      for (const item of this.removeds) {
         contexts.push({
            contextId: item.id,
            frameId: item.frame?.["id"],
            identifier: item.layer.getIdentifier(),
            deleted: true,
         })
      }
      this.addeds.clear()
      this.removeds.clear()
      support.models.push({
         moduleId: this.moduleId,
         contexts,
      })
   }
}

class SessionProxy {
   sessionId: string
   contexts = new Map<ContextID, ContextProxy>()
   models = new Map<string, ModelProxy>()
   document = new DocumentProxy(this)

   synchronizing: Promise<unknown> = null
   shallSynchronize = new Set<IProxy>()

   constructor(sessionId: string, readonly socket: DeviceSocket) {
      this.sessionId = sessionId
      InspectorSessionRegistry.set(this.sessionId, this)
   }
   dispose() {
      InspectorSessionRegistry.delete(this.sessionId)
      if (this.document) {
         this.document.dispose()
         this.document = null
      }
      for (const ctx of this.contexts.values()) {
         ctx.dispose()
      }
      for (const pgm of this.models.values()) {
         pgm.dispose()
      }
   }
   acquireModelProxy(moduleId: string) {
      let proxy = this.models.get(moduleId)
      if (!proxy) {
         proxy = new ModelProxy(moduleId, this)
         this.models.set(moduleId, proxy)
      }
      return proxy
   }
   acquireContextProxy(context: ModelContext) {
      let proxy = this.contexts.get(context.id)
      if (!proxy) {
         const watcher = AcquireContextWatcher(context)
         if (watcher) {
            proxy = new ContextProxy(this, watcher)
            this.contexts.set(context.id, proxy)
         }
      }
      return proxy
   }
   flushNotification(): InspectorNotification {
      if (this.shallSynchronize.size > 0) {
         const notif = {
            frames: null,
            models: [],
            contexts: [],
         }
         for (const proxy of this.shallSynchronize) {
            proxy.flushNotification(notif)
         }
         this.shallSynchronize.clear()
         return notif
      }
      return null
   }
   scheduleUpdate(proxy: IProxy): Promise<any> {
      this.shallSynchronize.add(proxy)
      if (this.synchronizing !== null) {
         return this.synchronizing
      }
      function synchronize(session: SessionProxy) {
         return session.synchronizing = new Promise((resolve) => {
            setTimeout(async () => {
               const notification = session.flushNotification()
               if (notification) {
                  await session.socket.execute<EditorApi["InspectorNotification"]>({
                     cmd: EditorCmd.InspectorNotification,
                     sessionId: session.sessionId,
                     notification,
                  })
               }
               session.synchronizing = null
               if (session.shallSynchronize.size > 0) {
                  resolve(synchronize(session))
               }
               else {
                  resolve(session)
               }
            }, 100)
         })
      }
      return synchronize(this)
   }
}

export class DocumentProxy implements IProxy<unknown, FrameNotification> {
   readonly session: SessionProxy

   constructor(session: SessionProxy) {
      this.session = session
      DocumentEndPoint.registerProxy(this)
   }
   dispose() {
      DocumentEndPoint.unregisterProxy(this)
   }
   onAttachFrame(frame: IDocumentFrame) {
      this.session.scheduleUpdate(this)
   }
   onDettachFrame(frame: IDocumentFrame) {
      this.session.scheduleUpdate(this)
   }
   applyRequirement(creq: unknown) {
   }
   flushNotification(support: InspectorNotification) {
      function serializeDocumentFrames(frame: IDocumentFrame): FrameNotification {
         const subs = []
         for (const sub of frame.children) {
            subs.push(serializeDocumentFrames(sub))
         }
         const data: FrameNotification = {
            frameId: frame.id,
            title: frame.title,
            subs,
         }
         const ctx = frame.getFrameContext()
         if (ctx) {
            data.contextId = ctx.id
            data.modelId = ctx.layer.model.id
         }
         return data
      }
      support.frames = serializeDocumentFrames(document)
   }
}

class ContextRegistryProxy implements IProxy<unknown, unknown>, IModelRegistryWatcher {
   readonly session: SessionProxy

   constructor(session: SessionProxy) {
      this.session = session
      ContextRegistryEndPoint.registerProxy(this)
   }
   dispose() {
      ContextRegistryEndPoint.unregisterProxy(this)
   }
   onAttachContext(ctx: ModelContext) {
   }
   onDettachContext(ctx: ModelContext) {
   }
   applyRequirement(creq: unknown) {
   }
   flushNotification(support: InspectorNotification) {
   }
}

export function installDeviceProxy() {

   DocumentEndPoint = new DocumentWatcher()
   ContextRegistryEndPoint = new ContextRegistryWatcher()

   TargetRouter.register<TargetApi["OpenInspector"]>(TargetCmd.OpenInspector, async (payload, client) => {
      const { sessionId } = payload
      const session = InspectorSessionRegistry.get(payload.sessionId)
      if (!session) {
         const session = new SessionProxy(payload.sessionId, client)
         const result = session.flushNotification()
         trace("pipe", "OpenInspector", sessionId, result)
         return result || {}
      }
      else {
         console.error(`Session '${sessionId}' cannot be opened due to already exists`)
         return null
      }
   })

   TargetRouter.register<TargetApi["CloseInspector"]>(TargetCmd.CloseInspector, async (payload) => {
      trace("pipe", "CloseInspector", payload.sessionId)
      const session = InspectorSessionRegistry.get(payload.sessionId)
      if (session) {
         session.dispose()
         return true
      }
      return false
   })

   TargetRouter.register<TargetApi["UpdateInspector"]>(TargetCmd.UpdateInspector, async (payload) => {
      const { sessionId, requirement } = payload

      const session = InspectorSessionRegistry.get(sessionId)
      if (!session) {
         console.error(`Session '${sessionId}' not exists`)
         return null
      }

      if (requirement) {
         for (const creq of requirement.models) {
            let cproxy = session?.models?.get(creq.moduleId)
            if (!cproxy) {
               cproxy = session.acquireModelProxy(creq.moduleId)
            }
            if (cproxy) {
               cproxy.applyRequirement(creq)
            }
         }
         for (const creq of requirement.contexts) {
            let cproxy = session?.contexts?.get(creq.contextId)
            if (!cproxy) {
               const context = ModelContextRegistry.get(creq.contextId)
               cproxy = context && session.acquireContextProxy(context)
            }
            if (cproxy) {
               cproxy.applyRequirement(creq)
            }
         }
      }

      const result = session.flushNotification() || {}
      trace("pipe", "UpdateInspector", payload.sessionId, payload.requirement, result)
      return result
   })

}
