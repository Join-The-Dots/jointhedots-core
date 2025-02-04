import React from "react"
import { IInstrumentationSupport, InstrumentationSupport, InstrumentationZone, ViewInstrumentation, ZoneAction } from "@livedoc/ui/instrumentation/ViewInstrumentation"
import { MapLike } from "typescript"
import { CmdPayload, Cmdlet } from "./cmds/types"
import { TargetApi, TargetCmd, TargetRouter } from "./cmds/target"
import { EditedPropName, fetchComponentView, getLayerView, reinstallComponentView } from "@livedoc/core/interpreter/display/view"
import { EditorAction, EditorApi, EditorCmd } from "./cmds/editor"
import { DeviceSockets } from "./proxy-sockets"
import { DocumentModel, ElementKey } from "@livedoc/core/interpreter/model"
import { findDocumentFrameById, highlightDocumentFrame } from "@livedoc/core/interpreter/display/document-frames"
import { AST } from "@livedoc/core"
import { ComponentsRegistry } from "../library/components"
import { Interpreter } from "../interpreter/config"

let enabled: boolean = false
let displayers: Set<WorkbenchDisplayer> = null

let active_model: DocumentModel = null
let active_props: MapLike<any> = null
let active_target: ElementKey = null
let active_display_compacted: boolean = true

function activateDisplayer(displayer: WorkbenchDisplayer) {
   displayer.display(active_model, active_props)
   displayer.selectByLocation(active_target)
}

export function registerDisplayer(displayer: WorkbenchDisplayer) {
   installDisplayerProxy()
   displayers.add(displayer)
   if (enabled) activateDisplayer(displayer)
}

export function unregisterDisplayer(displayer: WorkbenchDisplayer) {
   installDisplayerProxy()
   displayers.delete(displayer)
}

export class WorkbenchDisplayer extends React.Component {
   model: DocumentModel = null
   support: IInstrumentationSupport = null
   propertiesValue: MapLike<any> = {}

   componentDidMount(): void {
      registerDisplayer(this)
   }
   selectByLocation(location: ElementKey) {
   /*    const { model } = this
      if (!model) return false
      if (!this.support) return false
      const desc = model.infos.getDescriptorAt(location)
      if (!this.support.selectOnDescriptor(desc)) {
         this.support.unselectZone()
      }
      return true */
   }
   display(model: DocumentModel, props: MapLike<any>) {
      this.model = model
      this.propertiesValue = props
      this.forceUpdate()
   }
   refresh() {
      this.forceUpdate()
   }
   onSelect = (target: InstrumentationZone) => {
      /* if (target) {
         const ctl = target.getController()
         DeviceSockets.dispatch<EditorApi["SelectDescriptor"]>({
            cmd: EditorCmd.SelectDescriptor,
            location: ctl.getLocation(),
         })
      } */
   }
   onChangeData = (target: InstrumentationZone, descriptor: AST.Any) => {
     /*  const ctl = target.getController()
      return DeviceSockets.execute<EditorApi["ChangeDescriptor"]>({
         cmd: EditorCmd.ChangeDescriptor,
         target: ctl.getLocation(),
         descriptor: descriptor,
      }) */
   }
   onDragData = (target: InstrumentationZone) => {
     /*  const ctl = target.getController()
      const data: CmdPayload<TransfertApi["DescriptorTransfert"]> = {
         cmd: TransfertCmd.DescriptorTransfert,
         action: "displace",
         expression: ctl.getDescriptor(),
         origin: ctl.getLocation(),
      }
      return data */
   }
   onDropData = async (target: InstrumentationZone, data: CmdPayload<Cmdlet>, variation: string) => {
      /* const ctl = target.getController()
      const location = ctl.getLocation()
      if (!location) {
         console.log("drop on empty of", data)
         return
      }
      if (data.cmd === TransfertCmd.DescriptorTransfert) {
         const cmd = data as CmdPayload<TransfertApi["DescriptorTransfert"]>
         DeviceSockets.dispatch<EditorApi["InsertDescriptor"]>({
            cmd: EditorCmd.InsertDescriptor,
            origin: cmd.origin,
            target: location,
            descriptor: cmd.expression,
         })
      }
      else if (data.cmd === TransfertCmd.ResourceTransfert) {
         const cmd = data as CmdPayload<TransfertApi["ResourceTransfert"]>
         DeviceSockets.dispatch<EditorApi["InsertDescriptor"]>({
            cmd: EditorCmd.InsertDescriptor,
            target: location,
            component: { id: cmd.component_id }
         })
      } */
   }
   onZoneAction = async (action: ZoneAction, target: InstrumentationZone) => {
     /*  const ctl = target.getController()
      const location = ctl.getLocation()
      if (action === ZoneAction.Delete) {
         DeviceSockets.dispatch<EditorApi["DeleteDescriptor"]>({
            cmd: EditorCmd.DeleteDescriptor,
            target: location,
         })
      }
      else if (action === ZoneAction.Copy) {
         const descriptor = ctl.getDescriptor()
         if (descriptor) {
            navigator.clipboard.writeText(stringifyDescriptor(descriptor))
         }
      }
      else if (action === ZoneAction.Paste) {
         const text = await navigator.clipboard.readText()
         const descriptor = Schema.convertTextToExpression(text, CommonTypes.any, true)
         DeviceSockets.dispatch<EditorApi["InsertDescriptor"]>({
            cmd: EditorCmd.InsertDescriptor,
            target: location,
            descriptor,
         })
      } */
   }
   componentDidCatch(error, errorInfo) {
      console.log({ error, errorInfo })
   }
   useSupport = (support: IInstrumentationSupport) => {
      this.support = support
      support.setDisplay(active_display_compacted)
   }
   render() {
      const { model } = this
      if (model) {
         const { propertiesValue } = this
         const Component = getLayerView(model.main)
         return <InstrumentationSupport
            editedModel={model}
            ref={this.useSupport}
            onChange={this.onChangeData}
            onDrag={this.onDragData}
            onDrop={this.onDropData as any}
            onSelect={this.onSelect}
            onAction={this.onZoneAction}
         >
            <Component {...propertiesValue} {...{ [EditedPropName]: true }} />
         </InstrumentationSupport>
      }
      else {
         return <div>waiting...</div>
      }
   }
}

export function installDisplayerProxy() {
   if (enabled) return
   enabled = true
   displayers = new Set<WorkbenchDisplayer>()
   Interpreter.setInstrumentation(new ViewInstrumentation())

   TargetRouter.register<TargetApi["ModelLogCommit"]>(TargetCmd.ModelLogCommit, async (req) => {
      const cmodule = ComponentsRegistry.acquireComponent(req.modelId)
      await reinstallComponentView(cmodule, req.changeset)
      for (const displayer of displayers) {
         displayer?.refresh()
      }
   })

   TargetRouter.register<TargetApi["SelectZone"]>(TargetCmd.SelectZone, async (req) => {
      active_target = req.target
      for (const displayer of displayers) {
         displayer?.selectByLocation(active_target)
      }
   })

   TargetRouter.register<TargetApi["DisplayContent"]>(TargetCmd.DisplayContent, async (req) => {
      const cmodule = ComponentsRegistry.acquireComponent(req.modelId)
      active_model = await fetchComponentView(cmodule)
      active_props = req.props
      for (const displayer of displayers) {
         displayer.display(active_model, active_props)
      }
   })

   TargetRouter.register<TargetApi["DisplaySwitch"]>(TargetCmd.DisplaySwitch, async (req) => {
      active_display_compacted = !active_display_compacted
      for (const displayer of displayers) {
         if (displayer.support) {
            displayer.support.setDisplay(active_display_compacted)
         }
      }
   })

   TargetRouter.register<TargetApi["DisplayHighlight"]>(TargetCmd.DisplayHighlight, async (req) => {
      const frame = findDocumentFrameById(req.frameId)
      highlightDocumentFrame(frame)
   })

   window.addEventListener("keydown", (e) => {
      if (e.ctrlKey) {
         let action: EditorAction = null
         if (e.key === "s") action = EditorAction.Save
         else if (e.key === "z") action = EditorAction.Undo
         else if (e.key === "y") action = EditorAction.Redo
         else return
         DeviceSockets.dispatch<EditorApi["Action"]>({
            cmd: EditorCmd.Action,
            action,
         })
         e.stopPropagation()
         e.preventDefault()
      }
   })
}
