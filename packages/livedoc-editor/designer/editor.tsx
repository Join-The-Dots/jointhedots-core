import { FeatureDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { LibraryPanel } from './panels/LibraryPanel'
import { ContentPanel } from './panels/ContentPanel'
import { DatasPanel } from './panels/DatasPanel'
import { DiagramV1Panel } from './panels/DiagramV1Panel'
import { DiagramV2Panel } from './panels/DiagramV2Panel'
import { SelectionPanel } from './panels/SelectionPanel'
import { FeatureInstance } from "@livedoc/editor/ui/FeaturesLayout"
import { toast } from 'react-toastify'
import "@livedoc/editor/register"

import { EditorApi, EditorCmd, HostRouter, EditorAction } from '@livedoc/core/remote'
import { InspectorPanel } from './panels/InspectorPanel'
import { CmdPayload, CmdResult, Cmdlet } from '@livedoc/core/remote'
import { EditorToolBar } from './panels/ToolbarPanel'
import { DescriptorEditionSelection } from './selection'
import { DeviceRemote, installRemotesFeature } from '@livedoc/core/remote'
import { TargetApi, TargetCmd } from '@livedoc/core/remote'
import { DeviceInspector } from '@livedoc/core/remote'
import { DevicePanel } from './panels/DevicePanel'
import {
   ContentBlob, createDocumentModel, contentLocalURI, ViewInstrumentation,
   ComponentsRegistry, createNewComponent
} from '@livedoc/core'
import { copyData, Interpreter, DocumentChangeSet, DocumentModel, DXElement, ElementKey, ElementLocation, exportDocumentMarkdown } from '@livedoc/core'
import { URI } from 'vscode-uri'

Interpreter.setInstrumentation(new ViewInstrumentation())

const ViewEditorDescriptor: FeatureDescriptor = {
   name: "infinite-slick",
   title: "InSlick Dev",
   panels: {
      "library": LibraryPanel,
      "flow/datas": DatasPanel,
      "flow/content": ContentPanel,
      "flow/diagram.v1": DiagramV1Panel,
      "flow/diagram.v2": DiagramV2Panel,
      "flow/device": DevicePanel,
      "selection": SelectionPanel,
      "inspector": InspectorPanel,
      "toolbar/editor": EditorToolBar,
   },
}

type ViewEditorOptions = {
   component_id: string
}

export class ViewEditor extends FeatureInstance<ViewEditor> {
   static Descriptor = ViewEditorDescriptor
   model: DocumentModel = null
   device: DeviceRemote = null
   inspector: DeviceInspector = null
   selection: DescriptorEditionSelection = null

   async featureDidMount(opts: ViewEditorOptions) {
      return this.featureUpdate(opts)
   }
   async featureUpdate(opts: ViewEditorOptions) {
      const { component_id } = opts
      if (this.model?.component?.id !== component_id) {
         if (!component_id || typeof component_id !== "string") {
            this.openPanel("toolbar/editor")
            toast.error(`Model component id invalid`)
         }
         else {
            return this.openEditorSession(component_id)
         }
      }
   }
   async openEditorSession(component_id: string) {
      const toastId = toast.loading('Loading model...')
      try {
         await this.loadComponent(component_id)
         toast.update(toastId, { type: "success", render: 'Sucessfully load', isLoading: false, autoClose: 1000 })
         this.showWindows()
      }
      catch (e) {
         toast.update(toastId, { type: "error", render: `Failed to load: ${e.message}`, isLoading: false })
         console.error(e)
         this.closeAllPanel()
      }
   }
   async loadComponent(component_id: string): Promise<void> {
      const { content_provider } = ComponentsRegistry

      const cmodule = ComponentsRegistry.acquireComponent(component_id)


      const descriptor_blob = await content_provider.load_content(contentLocalURI(component_id, "file", "view.json"))
      const model = await createDocumentModel(cmodule, await descriptor_blob.text())

      // await model.update()

      this.setState({ model })
      this.showWindows()
   }
   showWindows() {
      routeHostCommands(this)
      this.openPanel("flow/diagram.v2")
      this.openPanel("flow/datas")
      this.openPanel("flow/content")
      this.openPanel("toolbar/editor")
      this.openPanel("library")
      this.openPanel("inspector")
   }
   async onLogChange(changeset: DocumentChangeSet): Promise<void> {
      const { model } = this
      this.query<TargetApi["ModelLogCommit"]>({
         cmd: TargetCmd.ModelLogCommit,
         modelId: model.id,
         changeset: changeset,
      })
   }
   async query<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>> {
      if (this.device) {
         return this.device.execute(payload)
      }
      return undefined
   }
   async registerDevice(device: DeviceRemote) {
      let inspector: DeviceInspector
      if (device) {
         const { model } = this
         await device.execute<TargetApi["ModelLogInit"]>({
            cmd: TargetCmd.ModelLogInit,
            modelId: model.id,
            state: model.log.state(),
         })
         inspector = await device.acquireInspector()
      }
      this.setState({ device, inspector })
   }
   unregisterDevice(device: DeviceRemote) {
      if (this.device === device) {
         this.device = null
      }
   }
   selectByElementKey(key: ElementKey, focused: boolean) {
      const { model } = this
      const element = model.nodes.get(key)
      this.selectByElement(element, focused)
   }
   selectByElement(element: DXElement, focused: boolean) {
      if (this.selection?.editing === true) {
         toast.warn("Cannot select during editing")
         return false
      }
      if (element) {
         const selection = new DescriptorEditionSelection(element)
         this.select(selection, focused)
      }
      else {
         this.unselect()
      }
   }
   select(selection: DescriptorEditionSelection, focused: boolean) {
      this.setState({ selection })
      this.query<TargetApi["SelectZone"]>({
         cmd: TargetCmd.SelectZone,
         target: this.selection?.target?.$key
      })
      if (focused) {
         this.openPanel("selection")
      }
   }
   unselectByKey(key: ElementKey) {
      const cur_target = this.selection?.target
      if (cur_target && cur_target.$key === key) {
         this.unselect()
      }
   }
   unselect() {
      const { model } = this
      this.selectByElement(model.main, false)
   }
   async saveModelChange() {
      const { model } = this
      const content = exportDocumentMarkdown(model)
      const schema = copyData(model.main.getTyping())
      const save = async () => {
         const { content_provider } = ComponentsRegistry
         const { component } = this.model

         const comp = ComponentsRegistry.acquireComponent(component.id)
         const manifest_blob = await comp.fetch()
         await createNewComponent({
            $id: component.id,
            service: "view",
            ...manifest_blob,
            definition: schema,
         })

         content_provider.store_content(
            ContentBlob.object.write(content),
            contentLocalURI(component.id, "file", "view.json")
         )
      }
      return toast.promise(save(), {
         pending: 'Saving model...',
         success: 'Sucessfully saved',
         error: 'Failed to save',
      })
   }
   undoModelChange() {
      const { log } = this.model
      if (!log.undo()) {
         toast.warn(`End of unp`)
      }
   }
   redoModelChange() {
      const { log } = this.model
      if (!log.redo()) {
         toast.warn(`End of replay`)
      }
   }
}

function routeHostCommands(editor: ViewEditor) {

   installRemotesFeature()

   HostRouter.register<EditorApi["Action"]>(EditorCmd.Action, async (cmd) => {
      switch (cmd.action) {
         case EditorAction.Save: return editor.saveModelChange()
         case EditorAction.Undo: return editor.undoModelChange()
         case EditorAction.Redo: return editor.redoModelChange()
      }
   })

   HostRouter.register<EditorApi["Select"]>(EditorCmd.Select, async (cmd) => {
      const { modelId, key } = cmd.location
      if (editor.model?.id === modelId) {
         editor.selectByElementKey(key, true)
      }
   })

   HostRouter.register<EditorApi["GetComponentManifest"]>(EditorCmd.GetComponentManifest, async (cmd) => {
      const { components_provider } = ComponentsRegistry
      return components_provider.get_component_manifest(cmd.id)
   })

   HostRouter.register<EditorApi["GetComponentPublication"]>(EditorCmd.GetComponentPublication, async (cmd) => {
      const { components_provider } = ComponentsRegistry
      return components_provider.get_component_publication(cmd.id)
   })

   HostRouter.register<EditorApi["CheckContent"]>(EditorCmd.CheckContent, async (cmd) => {
      const { content_provider } = ComponentsRegistry
      return content_provider.check_content(URI.parse(cmd.uri))
   })

   HostRouter.register<EditorApi["LoadContent"]>(EditorCmd.LoadContent, async (cmd) => {
      const { content_provider } = ComponentsRegistry
      return content_provider.load_content(URI.parse(cmd.uri))
   })
}
