import React from 'react'
import { DragZone } from 'components/DragAndDrop'
import Icon from 'components/Icon'
import { useAsyncState } from 'components/hooks/useAsyncState'
import Stack from 'components/Stack'
import openContextualMenu, { Menu } from 'components/openContextualMenu'
import { MapLike } from 'core/common'
import { ComponentsRegistry } from 'core/components'
import { ComponentPublication } from 'core/components/interfaces'
import TextInput from 'lexical-editor/ui/TextInput'
import './index.scss'

export function ComponentItem(props: {
   infos: ComponentPublication
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { infos, onSelect } = props

   const onDragStart = () => {
      return { "text/plain": infos }
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
   const pos = id.lastIndexOf(":")
   if (pos < 0) return "common"
   else return id.slice(0, id.lastIndexOf(":"))
}

function get_component_smallname(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return id
   else return id.slice(pos + 1)
}

export function ComponentBrowser(props: {
   service: string
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { service, onSelect } = props
   const [filter, setFilter] = React.useState("")
   const entries = useAsyncState<MapLike<ComponentPublication[]>>(async () => {
      const result = {}
      const items = await ComponentsRegistry.components_provider.search_component_publications(filter)
      for (const item of items) {
         const pack = get_component_packname(item.component_id)
         let list = result[pack] = result[pack] || []
         list.push(item)
      }
      return result
   }, [filter])

   return (<Stack gap={3} padding={10} vertical className="Livedoc-Component-Browser">
      <Stack.FixedDock>
         <Stack gap={3}>
            <Stack.FlexDock>
               <TextInput label="Search" value={filter} onChange={setFilter} />
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
                        return <Menu.LargeItem
                           key={i}
                           icon={entry.icon}
                           title={entry.title}
                           description={entry.description}
                           onClick={() => onSelect(entry)}
                        />
                     })}
                  </div>
               })
            })}
         </Stack>
      </Stack.FlexDock>
   </Stack>)
}
