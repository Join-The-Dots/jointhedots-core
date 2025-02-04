import { MapLike } from "../../common/types"
import { Cmdlet, CommandExecutor } from "./types"
import { ElementKey } from "../../interpreter/model"
import { DocumentChangeSet, DocumentLogState } from "../../interpreter/log"

export enum TargetCmd {
   ModelLogInit = "model/log.init",
   ModelLogCommit = "model/log.commit",

   DisplaySwitch = "display/mode",
   DisplayContent = "display/content",
   DisplayHighlight = "display/highlight",

   SelectZone = "model/select",

   OpenInspector = "inspector/open",
   UpdateInspector = "inspector/update",
   CloseInspector = "inspector/close",
}

export type ContextID = number

//-------------------------------------------
//-- View watching requirement
//-------------------------------------------

export type StateRequirement = {
   name: string
   meta: boolean
   parent: string
}

export type ContextRequirement = {
   contextId: ContextID
   addeds: MapLike<StateRequirement>
   removeds: string[]
   restart?: boolean
   close?: boolean
}

export type ModelRequirement = {
   moduleId: string
}

export type InspectorRequirement = {
   contexts: ContextRequirement[]
   models: ModelRequirement[]
}

//-------------------------------------------
//-- View state notification (feedback structure)
//-------------------------------------------

export enum FrameStatus {
   Attached,
   Dettached,
}

export type FrameNotification = {
   frameId: number
   parentId?: ContextID
   contextId?: number
   modelId?: string
   status?: FrameStatus
   title: string
   subs?: FrameNotification[]
}

export type StateNotification = {
   name: string
   meta: boolean
   parent: string | null
   value?: string | number
}

export type ContextNotification = {
   contextId: ContextID
   modelId: string
   layerId: string
   revision: number
   title?: string
   states?: MapLike<StateNotification>
   closed?: boolean
}

export type ModelContextInfos = {
   contextId: number
   frameId?: number
   identifier: string
   deleted?: boolean
}

export type ModelNotification = {
   moduleId: string
   contexts: ModelContextInfos[]
}

export type InspectorNotification = {
   frames?: FrameNotification
   contexts?: ContextNotification[]
   models?: ModelNotification[]
}

//-------------------------------------------
//-- Target API
//-------------------------------------------

export interface TargetApi {

   ModelLogInit: Cmdlet<{
      cmd: TargetCmd.ModelLogInit
      modelId: string
      state: DocumentLogState
   }>

   ModelLogCommit: Cmdlet<{
      cmd: TargetCmd.ModelLogCommit
      modelId: string
      changeset: DocumentChangeSet
   }>

   DisplaySwitch: Cmdlet<{
      cmd: TargetCmd.DisplaySwitch
   }>

   DisplayContent: Cmdlet<{
      cmd: TargetCmd.DisplayContent
      modelId: string
      props: MapLike<any>
   }>

   DisplayHighlight: Cmdlet<{
      cmd: TargetCmd.DisplayHighlight
      frameId: number | null
   }>

   SelectZone: Cmdlet<{
      cmd: TargetCmd.SelectZone
      target: ElementKey
   }>

   OpenInspector: Cmdlet<{
      cmd: TargetCmd.OpenInspector
      sessionId: string
   }, InspectorNotification>

   UpdateInspector: Cmdlet<{
      cmd: TargetCmd.UpdateInspector
      sessionId: string
      requirement: InspectorRequirement
   }, InspectorNotification>

   CloseInspector: Cmdlet<{
      cmd: TargetCmd.CloseInspector
      sessionId: string
   }, boolean>

}

export const TargetRouter = {
   executors: new Map<string, CommandExecutor<Cmdlet>>(),
   register<C extends Cmdlet>(id: string, executor: CommandExecutor<C>) {
      TargetRouter.executors.set(id, executor)
   }
}
