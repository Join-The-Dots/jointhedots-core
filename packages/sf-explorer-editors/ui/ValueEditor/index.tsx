import React from 'react'
import { ValueProps } from '../../elements/interfaces'
import "./index.scss"
import { useAsyncState } from '@sf-explorer/editors/hooks/useAsyncState'
import { NoInput } from '../ValueInput'
import "./index.scss"
import { ElementsEditors } from '@sf-explorer/editors/elements'

export default function ValueEditor(props: ValueProps) {
   const { value, typing } = props

   const resolved = useAsyncState(async () => {
      const ctl = await ElementsEditors.findControllerOf(value, typing)
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
