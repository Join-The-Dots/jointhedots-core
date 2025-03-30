import React, { useCallback, useEffect, useMemo } from 'react'
import { ComponentsRegistry, ComponentPublication, IComponentProvider, MapLike, ComponentFilter, createComponentFilter, acquireComponent, deleteComponent } from '@jointhedots/core'
import { useAsyncState } from '@jointhedots/core/react'
import { Stack } from '@jointhedots/ui/Layouts'
import { TextInput } from '@jointhedots/ui/utils/TextInput'
import { ItemProps, ItemRowRich, ItemRowShort } from '../Items'
import { askQuestion } from '../Dialog'
import { editComponentManifest } from './ComponentsEditor'
import './index.scss'

export function getComponentGroupName(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return "common"
   else return id.slice(0, id.lastIndexOf(":"))
}

export function getComponentSmallName(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return id
   else return id.slice(pos + 1)
}

export function groupComponentPublications(items: ComponentPublication[]): MapLike<ComponentPublication[]> {
   const result = {}
   for (const item of items) {
      const pack = getComponentGroupName(item.component_id)
      let list = result[pack] = result[pack] || []
      list.push(item)
   }
   return result
}

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
   onSelect?: (item: ComponentPublication) => void
   onActivate?: (item: ComponentPublication) => void
}) {
   const { entry, display, selected, onSelect, onActivate } = props
   const ItemRow = display?.small ? ItemRowShort : ItemRowRich
   const tooling = []
   if (entry.type) {
      if (display?.allowEdit) tooling.push({
         name: "edit",
         icon: "bi:pencil",
         optional: true,
         onActivate: async () => {
            const { component_id } = entry
            const manifest = await acquireComponent(component_id).fetch()
            await editComponentManifest(manifest)
         },
      })
      if (display?.allowDelete) tooling.push({
         name: "delete",
         icon: "bi:trash",
         optional: true,
         onActivate: async () => {
            if (await askQuestion(`Do you want to delete '${entry.title}' ?`)) {
               if (selected) onSelect(entry)
               deleteComponent(entry.component_id)
            }
         }
      })
   }
   return <ItemRow
      data={entry}
      icon={entry.icon || "avatar:" + entry.title}
      name={entry.title || entry.component_id}
      summary={entry.description || entry.type}
      selected={selected}
      tooling={tooling}
      onSelect={onSelect && ((item) => onSelect(item.data))}
      onActivate={onActivate && ((item) => onActivate(item.data))}
   />
}

export function ComponentsList(props: {
   entries: ComponentPublication[]
   display?: ComponentItemDisplay
   onSelect?: (infos: ComponentPublication) => void
   onActivate?: (infos: ComponentPublication) => void
}) {
   const { display, entries, onSelect, onActivate } = props

   const groupeds = useMemo(() => {
      if (display?.grouped) {
         return groupComponentPublications(entries)
      }
      else {
         return null
      }
   }, [entries, display?.grouped])

   const select = useCallback((entry: ComponentPublication) => {
      onSelect(entry)
   }, [onSelect])

   const activate = useCallback((entry: ComponentPublication) => {
      onActivate(entry)
   }, [onActivate])

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
                  onActivate={onActivate && activate}
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
               onActivate={onActivate && activate}
            />
         })}
      </div>
   }
}

export function ComponentsFilteredList(props: {
   filter?: ComponentFilter
   provider?: IComponentProvider
   display?: ComponentItemDisplay
   onSelect?: (infos: ComponentPublication) => void
   onActivate?: (infos: ComponentPublication) => void
}) {
   const { display, filter, onSelect, onActivate } = props
   const provider = props.provider || ComponentsRegistry.components_provider

   const entries = useAsyncState<ComponentPublication[]>(async () => {
      return provider.search_component_publications(filter)
   }, [filter])

   return <>
      {entries.waiting((entries) => {
         return <ComponentsList
            entries={entries}
            display={display}
            onSelect={onSelect}
            onActivate={onActivate}
         />
      })}
   </>
}

export function ComponentBrowser(props: {
   filter?: Partial<ComponentFilter>
   provider?: IComponentProvider
   onSelect?: (infos: ComponentPublication) => void
   onActivate?: (infos: ComponentPublication) => void
}) {
   const { provider, onSelect, onActivate } = props
   const [filter, setFilter] = React.useState(() => createComponentFilter(props.filter))

   useEffect(() => {
      if (props.filter !== filter) setFilter(createComponentFilter(props.filter))
   }, [props.filter])

   return (<Stack gap={3} padding={10} vertical className="Livedoc-Component-Browser">
      <Stack.FixedDock>
         <Stack gap={3}>
            <Stack.FlexDock>
               <TextInput
                  label="Search"
                  value={filter.query}
                  onChange={(query) => {
                     setFilter(createComponentFilter({ ...filter, query }))
                  }}
               />
            </Stack.FlexDock>
         </Stack>
      </Stack.FixedDock>
      <Stack.FlexDock>
         <ComponentsFilteredList
            filter={filter}
            display={browser_display}
            provider={provider}
            onSelect={onSelect}
            onActivate={onActivate}
         />
      </Stack.FlexDock>
   </Stack>)
}

const browser_display: ComponentItemDisplay = {
   grouped: true,
   small: false,
   allowEdit: true,
   allowDelete: true,
}
