import React from 'react'
import { ExpendableNode } from '@livedoc/editor/ui/ExpendableNode'
import Stack from '@livedoc/editor/ui/Stack'
import Icon from '@livedoc/ui/Icon'
import { ContextInspector, DeviceInspector } from '@livedoc/core/remote'
import { FrameNotification, TargetApi, TargetCmd } from '@livedoc/core/remote'
import { DeviceView } from '@livedoc/core/remote'
import openContextualMenu, { Menu } from '@livedoc/editor/ui/openContextualMenu'

function FrameNode(props: {
   selected: ContextInspector
   depth: number
   infos: FrameNotification
   onSelect: (frameId: number) => void
   onHighlight: (frameId: number | null) => void
}) {
   const { selected, depth, infos, onSelect, onHighlight } = props

   const onClick = React.useCallback(() => {
      onSelect(infos.contextId)
   }, [infos])

   const onMouseEnter = React.useCallback(() => {
      onHighlight(infos.frameId)
   }, [infos])

   const onMouseLeave = React.useCallback(() => {
      onHighlight(null)
   }, [infos])

   const onMenu = React.useCallback((e) => {
      openContextualMenu(e, (close) => {
         const onEdit = (e) => alert("edit " + infos.modelId)
         return <>
            <Menu.Item onClick={onEdit} title="Edit" icon="code:action/edit" />
         </>
      })
   }, [infos])

   let subs = null
   if (infos.subs?.length) {
      subs = []
      for (const sub of infos.subs) {
         subs.push(<FrameNode
            key={sub.contextId}
            depth={depth > 0 ? depth - 1 : 0}
            infos={sub}
            selected={selected}
            onSelect={onSelect}
            onHighlight={onHighlight}
         />)
      }
   }

   return <ExpendableNode
      init={depth > 0}
      label={<Stack
         className={selected?.contextId === infos.contextId
            ? "InspectorPanel-FrameNode selected"
            : "InspectorPanel-FrameNode"
         }
         onClick={onClick}
         onMouseEnter={onMouseEnter}
         onMouseLeave={onMouseLeave}
         onContextMenu={onMenu}
      >
         <Stack.FixedDock><Icon name="code:symbol/layer" /></Stack.FixedDock>
         <Stack.FlexDock>{infos.title}</Stack.FlexDock>
      </Stack>}
   >
      {subs}
   </ExpendableNode>
}

export function FramesInspector(props: {
   inspector: DeviceInspector
   selected: ContextInspector
   onRefresh: () => void
   onSelect: (frameId: number) => void
}) {
   const { inspector } = props

   const onHighlight = React.useCallback((frameId: number | null) => {
      inspector.pipe.execute<TargetApi["DisplayHighlight"]>({
         cmd: TargetCmd.DisplayHighlight,
         frameId,
      })
   }, [inspector])

   return <DeviceView inspector={inspector}>
      {(frames) => {
         return <>
            {/* <Button onClick={props.onRefresh} name={"code:action/refresh"} /> */}
            {frames && <FrameNode
               depth={5}
               infos={frames}
               selected={props.selected}
               onSelect={props.onSelect}
               onHighlight={onHighlight}
            />}
         </>
      }}
   </DeviceView>
}
