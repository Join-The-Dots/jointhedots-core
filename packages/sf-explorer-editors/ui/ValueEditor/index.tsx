import React from 'react'
import { IEditorProvider, ValueProps } from '../editor-context'
import "./index.scss"
import { useAsyncState } from '@sf-explorer/editors/hooks/useAsyncState'
import { NoInput } from '../ValueInput'
import "./index.scss"

export default function ValueEditor(props: ValueProps & {
   provider: IEditorProvider
}) {
   const { provider, value, typing } = props

   const resolved = useAsyncState(async () => {
      const ctl = await provider.findControllerOf(value, typing)
      if (ctl) return { ctl, value, typing }
      else return null
   }, [value, typing])

   const state = resolved.get()
   if (state) {
      const { ctl, value, typing } = state
      let View = ctl.editor?.panels?.main?.view
      if (!View) View = ctl.editor?.input
      if (!View) View = NoInput
      return (<div className="LDX-ValueEditor">
         <View {...props} typing={typing} value={value} />
      </div>)
   }
   else if (resolved.isWaiting) {
      return <>...</>
   }
   else {
      return <NoInput {...props} />
   }
}
