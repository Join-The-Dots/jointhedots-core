import React, { useEffect } from 'react'
import { DragZone } from '../DragAndDrop'
import Icon from '@sf-explorer/core/ui/Icon'
import { useAsyncState } from '@sf-explorer/editors/hooks/useAsyncState'
import Stack from '@sf-explorer/editors/ui/Stack'
import openContextualMenu, { Menu } from '@sf-explorer/editors/ui/openContextualMenu'
import { MapLike } from '@sf-explorer/core'
import { ComponentsRegistry } from '@sf-explorer/core'
import { ComponentPublication, IComponentProvider } from '@sf-explorer/core'
import TextInput from '@sf-explorer/editors/designer/ui/TextInput'
import './index.scss'
import { getComponentSmallName, groupComponentPublications } from '@sf-explorer/editors/common/pub-helpers'

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
      <div>{getComponentSmallName(infos.title)}</div>
   </DragZone >
}

export function ComponentBrowser(props: {
   filter?: string
   service?: string
   provider?: IComponentProvider
   onSelect?: (infos: ComponentPublication) => void
}) {
   const { service, onSelect } = props
   const [filter, setFilter] = React.useState(props.filter)
   const provider = props.provider || ComponentsRegistry.components_provider

   const entries = useAsyncState<MapLike<ComponentPublication[]>>(async () => {
      const items = await provider.search_component_publications(filter)
      return groupComponentPublications(items)
   }, [filter])

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
         <Stack gap={3} vertical>
            {entries.waiting((entries) => {
               return Object.keys(entries).map((pack, i) => {
                  return <div key={pack}>
                     <div className="ComponentPack">
                        {pack ? pack.replace(":", " ") : "workspace"}
                     </div>
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
