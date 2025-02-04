import React from 'react'
import {
   ContentBlob, CommonTypes, DocumentModel, ComponentPublication, ComponentsRegistry,
   createNewComponent, contentLocalURI
} from '@livedoc/core'
import { ViewEditor } from '../../editor'
import ButtonIcon from '@livedoc/editor/ui/ButtonIcon'
import Stack from '@livedoc/editor/ui/Stack'
import { openDialog } from '@livedoc/editor/ui/openDialog'
import { ComponentBrowser } from '../LibraryPanel'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { InputText } from '@livedoc/editor/ui/InputText'

export type PropsType = {
   model: DocumentModel
}

function ComponentBrowserDialog(props: { onSelect: (infos: ComponentPublication) => void }) {
   const { onSelect } = props
   const [createdID, setCreatedID] = React.useState("")
   const onCreate = async () => {
      onSelect(await store_view_component(createdID, {
         type: "dataflow",
         layout: {
            "type": "display",
         }
      }))
   }
   return <>
      <div style={{ flex: 0, minHeight: 50, padding: 10 }}>
         <InputText title="Created component" value={createdID} onChange={setCreatedID} />
         <ButtonIcon name="code:action/add" variant='secondary' onClick={onCreate} />
      </div>
      <ComponentBrowser onSelect={onSelect} />
   </>
}

async function store_view_component(id: string, descriptor: any): Promise<ComponentPublication> {
   const { content_provider, components_provider } = ComponentsRegistry
   if (!id.includes(":")) {
      id = ":" + id
   }
   if (!await content_provider.check_content(contentLocalURI(id, "file", "view.json"))) {
      await content_provider.store_content(
         ContentBlob.object.write(descriptor),
         contentLocalURI(id, "file", "view.json")
      )
      await createNewComponent({
         $id: id,
         view: CommonTypes.view,
      })
   }
   return components_provider.get_component_publication(id)
}

export class EditorToolBar extends PanelComponent<ViewEditor, PropsType> {
   static Descriptor: PanelDescriptor = {
      layouting: "flexible",
      defaultTitle: "Editor Tools",
      defaultIcon: "fa:cogs",
      defaultDockId: "toolbar",
      parameters: {
         session: true
      }
   }

   constructor(props: PropsType) {
      super(props)
      window.addEventListener("keydown", this.onKeyShortcut)
   }
   componentWillUnmount() {
      window.removeEventListener("keydown", this.onKeyShortcut)
   }
   onKeyShortcut = (e) => {
      if (e.ctrlKey) {
         if (e.key === "s") this.feature.saveModelChange()
         else if (e.key === "z") this.feature.undoModelChange()
         else if (e.key === "y") this.feature.redoModelChange()
         else return
         e.stopPropagation()
         e.preventDefault()
      }
   }
   openView() {
      openDialog((resolve) => {
         return <ComponentBrowserDialog onSelect={resolve} />
      }, "80%").then((result: ComponentPublication) => {
         window.location.replace(`${location.pathname}?id=${encodeURIComponent(result.component_id)}`)
      }, null)
   }
   render() {
      const { model } = this.feature
      if (!model) {
         return <ButtonIcon name="fa:folder-open-o" variant='secondary' onClick={() => this.openView()} />
      }
      return <Stack gap={0}>
         <Stack.FixedDock>
            <ButtonIcon name="fa:folder-open-o" variant='secondary' onClick={() => this.openView()} />
         </Stack.FixedDock>
         <Stack.FixedDock>
            <ButtonIcon name="fa:save" variant='secondary' onClick={() => this.feature.saveModelChange()} />
         </Stack.FixedDock>
         <Stack.FixedDock>
            <ButtonIcon name="fa:undo" variant='secondary' onClick={() => this.feature.undoModelChange()} />
         </Stack.FixedDock>
         <Stack.FixedDock>
            <ButtonIcon name="fa:repeat" variant='secondary' onClick={() => this.feature.redoModelChange()} />
         </Stack.FixedDock>
         {/* <Stack.FixedDock>
            <ButtonIcon name="code:action/display" secondary onClick={(e) => openFrameMenu(e)} />
         </Stack.FixedDock> */}
         <Stack.FlexDock />
         <Stack.FixedDock>
            <b>{this.props?.model?.component?.title}</b>
         </Stack.FixedDock>
         <Stack.FlexDock />
      </Stack>
   }
}
