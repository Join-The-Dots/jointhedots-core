import React from 'react'
import { ViewEditor } from '../../editor'
import Stack from '@livedoc/editor/ui/Stack'
import { ExpendableTable, RowExpendable } from '@livedoc/editor/ui/ExpendableTable'
import { ContextInspector, StateInspector } from '@livedoc/core/remote'
import { StateView } from '@livedoc/core/remote'
import Icon from '@livedoc/ui/Icon'

function StateExpendableNode(props: {
   editor: ViewEditor
   state: StateInspector
}) {
   return <StateView inspector={props.state}>
      {(state) => {
         return <RowExpendable
            label={<Stack.FixedDock>
               {state.name}
            </Stack.FixedDock>}
            items={<Stack.FixedDock>
               <Stack>{state.value}{/*!state.synchronized && <Icon name="code:status/outdated" />*/}</Stack>
            </Stack.FixedDock>}
         >
            {state.hasStates
               ? <StateList editor={props.editor} state={state} />
               : undefined
            }
         </RowExpendable>
      }}
   </StateView >
}

function StateInlinedNode(props: {
   editor: ViewEditor
   state: StateInspector
}) {
   return <StateView inspector={props.state}>
      {(state) => {
         return state.hasStates
            ? <StateList editor={props.editor} state={state} />
            : null
      }}
   </StateView >
}

function StateList(props: {
   editor: ViewEditor
   state: StateInspector
}) {
   const { editor, state } = props
   const { metas, datas } = state

   if (metas || datas) {
      return <>
         {metas ? metas.map((x, i) => {
            return <StateExpendableNode key={x.name} state={x} editor={editor} />
         }) : []}
         {datas ? datas.map((x, i) => {
            return <StateExpendableNode key={x.name} state={x} editor={editor} />
         }) : []}
      </>
   }
   else {
      return null
   }
}

export function FlowViewInspector(props: {
   editor: ViewEditor
   icontext: ContextInspector
}) {
   const { editor, icontext } = props
   const onRestart = () => {
      icontext.restart()
   }

   return <>
      {/* <div>
         <Button onClick={onRestart} name={"code:action/refresh"} />
      </div> */}
      <ExpendableTable>
         {icontext.frame && <StateInlinedNode editor={editor} state={icontext.frame} />}
      </ExpendableTable>
   </>
}
