import React from 'react'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { ViewEditor } from '../../editor'
import Icon from '@livedoc/ui/Icon'
import './index.scss'
import { TransfertApi, TransfertCmd } from '@livedoc/core/remote'
import { CmdPayload } from '@livedoc/core/remote'
import { useAsyncState } from '@livedoc/editor/hooks/useAsyncState'
import Stack from '@livedoc/editor/ui/Stack'
import openContextualMenu, { Menu } from '@livedoc/editor/ui/openContextualMenu'
import { MapLike } from '@livedoc/core'
import { DragZone } from '@livedoc/editor/ui/DragAndDrop'
import { ComponentPublication, ComponentsRegistry } from '@livedoc/core'
import { InputText } from '@livedoc/editor/ui/InputText'

export function ComponentItem(props: {
   infos: ComponentPublication
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { infos, onSelect } = props

   const onDragStart = () => {
      const cmd: CmdPayload<TransfertApi["ResourceTransfert"]> = {
         cmd: TransfertCmd.ResourceTransfert,
         ...infos,
      } as any
      return { "text/plain": cmd }
   }

   const onMenu = React.useCallback((e) => {
      if (e.button === 2) {
         openContextualMenu(e, (close) => {
            return <>
               <Menu.Item title="Open" />
            </>
         })
         e.stopPropagation()
      }
   }, [infos])

   return <DragZone
      otherProps={{
         className: "ComponentItem",
         onMouseDown: onMenu,
         onClick: () => onSelect(infos),
      }}
      onDragStart={onDragStart}
   >
      <Icon name={infos.icon || "code:symbol/element"} />
      <div>{get_component_smallname(infos.title)}</div>
   </DragZone >
}

function get_component_packname(id: string) {
   return id.slice(0, id.lastIndexOf(":"))
}

function get_component_smallname(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return id
   else return id.slice(pos + 1)
}

export function ComponentBrowser(props: {
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { onSelect } = props
   const [filter, setFilter] = React.useState("")
   const entries = useAsyncState<MapLike<ComponentPublication[]>>(async () => {
      const { components_provider } = ComponentsRegistry
      const result = {}
      const items = await components_provider.search_component_publications(filter)
      for (const item of items) {
         const pack = get_component_packname(item.component_id)
         let list = result[pack] = result[pack] || []
         list.push(item)
      }
      return result
   }, [filter])

   return (<Stack gap={3} vertical className="poly-Assets-Browser-Panel">
      <Stack.FixedDock>
         <Stack gap={3}>
            <Stack.FlexDock>
               <InputText title="Search" value={filter} onChange={setFilter} />
            </Stack.FlexDock>
         </Stack>
      </Stack.FixedDock>
      <Stack.FlexDock>
         <Stack gap={3} vertical>
            {entries.waiting((entries) => {
               return Object.keys(entries).map((pack, i) => {
                  return <div key={pack}>
                     <div className="ComponentPack">{pack ? pack.replace(":", " ") : "workspace"}</div>
                     {entries[pack].map((entry, i) => {
                        return <ComponentItem key={i} infos={entry} onSelect={onSelect} />
                     })}
                  </div>
               })
            })}
         </Stack>
      </Stack.FlexDock>
   </Stack>)
}

export class LibraryPanel extends PanelComponent<ViewEditor> {
   static Descriptor: PanelDescriptor = {
      userOpenable: true,
      layouting: "flexible",
      defaultTitle: "Library",
      defaultIcon: "fa:bookmark",
      defaultDockId: "right",
      parameters: {
         dev: true,
      }
   }
   render() {
      return <ComponentBrowser />
   }
}
