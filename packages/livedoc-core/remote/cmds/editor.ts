import { Cmdlet, CommandExecutor } from "./types"
import { InspectorNotification } from "./target"
import { ComponentManifest, ComponentPublication } from "../../library/interfaces"
import { ElementLocation } from "../../interpreter/model"

export enum EditorCmd {
   Action = "editor/action",
   Select = "editor/select",
   InspectorNotification = "view/notification",
   CheckContent = "storage/check-content",
   LoadContent = "storage/load-content",
   GetComponentPublication = "provider/get_component_publication",
   GetComponentManifest = "provider/get_component_manifest",
}

export enum EditorAction {
   Save = "save",
   Redo = "redo",
   Undo = "undo",
}

export interface EditorApi {

   Action: Cmdlet<{
      cmd: EditorCmd.Action
      action: EditorAction
   }>

   Select: Cmdlet<{
      cmd: EditorCmd.Select
      location: ElementLocation
      material?: {
         deviceId: string
         contextId: number
         frameId: number
      }
   }>

   InspectorNotification: Cmdlet<{
      cmd: EditorCmd.InspectorNotification
      sessionId: string
      notification: InspectorNotification
   }>

   GetComponentPublication: Cmdlet<{
      cmd: EditorCmd.GetComponentPublication
      id: string
   }, ComponentPublication>

   GetComponentManifest: Cmdlet<{
      cmd: EditorCmd.GetComponentManifest
      id: string
   }, ComponentManifest>

   CheckContent: Cmdlet<{
      cmd: EditorCmd.CheckContent
      uri: string
   }, string>

   LoadContent: Cmdlet<{
      cmd: EditorCmd.LoadContent
      uri: string
   }, Blob>
}

export const HostRouter = {
   executors: new Map<string, CommandExecutor<Cmdlet>>(),
   register<C extends Cmdlet>(id: string, executor: CommandExecutor<C>) {
      HostRouter.executors.set(id, executor)
   }
}
