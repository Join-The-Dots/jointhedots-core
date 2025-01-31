import React, { useCallback, useEffect, useMemo } from 'react'
import { DragZone } from '@jointhedots/editors/ui/DragAndDrop'
import Icon from '@jointhedots/ui/Icon'
import { useAsyncState } from '@jointhedots/editors/hooks/useAsyncState'
import Stack from '@jointhedots/editors/ui/Stack'
import openContextualMenu, { Menu } from '@jointhedots/editors/ui/openContextualMenu'
import { MapLike, ComponentsRegistry, ComponentPublication, IComponentProvider, ComponentManifest, updateComponent } from '@jointhedots/core'
import TextInput from '@jointhedots/editors/designer/ui/TextInput'
import './index.scss'
import { getComponentSmallName, groupComponentPublications } from '@jointhedots/editors/common/pub-helpers'
import { ItemProps, ItemRowRich, ItemRowShort } from '../items'
import { askData, askQuestion } from '../ask'

/* export function ComponentItem(props: {
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
      <div>{getComponentSmallName(infos.title)}</div>
   </DragZone >
} */

export type ComponentItemDisplay = {
   grouped?: boolean
   small?: boolean
   allowEdit?: boolean
   allowDelete?: boolean
}

export function ComponentItem(props: {
   entry: ComponentPublication
   selected?: boolean
   display?: ComponentItemDisplay
   onSelect?: (item: ItemProps<ComponentPublication>) => void
}) {
   const { entry, display, selected, onSelect } = props
   const ItemRow = display?.small ? ItemRowShort : ItemRowRich
   const tooling = []
   if (entry.type) {
      if (display?.allowEdit) tooling.push({
         name: "edit",
         icon: "bi:pencil",
         onActivate: async () => {
            const { component_id } = entry
            const manifest = await ComponentsRegistry.acquireComponent(component_id).fetch()
            const driver = await ComponentsRegistry.acquireComponent(manifest.type).fetch()

            const newManifest = await askData(`${driver.title}`, {
               type: "object",
               properties: {
                  name: { type: "string" },
                  settings: driver["component"].data,
               }
            }, manifest)

            if (newManifest && newManifest != manifest) {
               updateComponent(newManifest)
            }
         },
      })
      if (display?.allowDelete) tooling.push({
         name: "delete",
         icon: "bi:trash",
         onActivate: async () => {
            if (await askQuestion("Do you want to delete connexion ?")) {
               //ComponentsRegistry.deleteComponent(entry.component_id)
            }
         }
      })
   }
   return <ItemRow
      onSelect={onSelect}
      data={entry}
      icon={entry.icon || "avatar:" + entry.title}
      name={entry.title || entry.component_id}
      summary={entry.description || entry.type}
      selected={selected}
      tooling={tooling}
   />
}

export function ComponentsList(props: {
   entries: ComponentPublication[]
   display?: ComponentItemDisplay
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { display, entries, onSelect } = props

   const groupeds = useMemo(() => {
      if (display?.grouped) {
         return groupComponentPublications(entries)
      }
      else {
         return null
      }
   }, [entries, display?.grouped])

   const select = useCallback((entry: ItemProps<ComponentPublication>) => {
      onSelect(entry.data)
   }, [onSelect])

   if (groupeds) {
      return Object.keys(groupeds).map((pack, i) => {
         return <div key={pack}>
            <div className="ComponentPack">
               {pack ? pack.replace(":", " ") : "workspace"}
            </div>
            {groupeds[pack].map((entry, i) => {
               return <ComponentItem
                  key={i}
                  entry={entry}
                  display={display}
                  onSelect={onSelect && select}
               />
            })}
         </div>
      })
   }
   else {
      return <div>
         {entries.map((entry, i) => {
            return <ComponentItem
               key={i}
               entry={entry}
               display={display}
               onSelect={onSelect && select}
            />
         })}
      </div>
   }
}

export function ComponentsFilteredList(props: {
   filter?: string
   services?: string[]
   provider?: IComponentProvider
   display?: ComponentItemDisplay
   onChange?: (manifest: ComponentManifest) => void
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { display, filter, services, onSelect } = props
   const provider = props.provider || ComponentsRegistry.components_provider

   const entries = useAsyncState<ComponentPublication[]>(async () => {
      return provider.search_component_publications(filter, services)
   }, [filter])

   return <>
      {entries.waiting((entries) => {
         return <ComponentsList entries={entries} display={display} onSelect={onSelect} />
      })}
   </>
}

export function ComponentBrowser(props: {
   filter?: string
   services?: string[]
   provider?: IComponentProvider
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { provider, services, onSelect } = props
   const [filter, setFilter] = React.useState(props.filter)

   useEffect(() => {
      if (props.filter !== filter) setFilter(props.filter)
   }, [props.filter])

   return (<Stack gap={3} padding={10} vertical className="Livedoc-Component-Browser">
      <Stack.FixedDock>
         <Stack gap={3}>
            <Stack.FlexDock>
               <TextInput label="Search" value={filter} onChange={setFilter} />
            </Stack.FlexDock>
         </Stack>
      </Stack.FixedDock>
      <Stack.FlexDock>
         <ComponentsFilteredList
            filter={filter}
            services={services}
            display={browser_display}
            provider={provider}
            onSelect={onSelect}
         />
      </Stack.FlexDock>
   </Stack>)
}

const browser_display: ComponentItemDisplay = {
   grouped: true,
   small: false,
   allowEdit: true,
   allowDelete: false,
}
